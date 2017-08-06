'use strict';
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const chalk = require('chalk');
const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const http = require('http');
const logger = require('morgan');
const rp = require('request-promise')
const truncate = require('html-truncate');
const util = require('util');

const fixedURIencode = require('./encoder');
const remover = require('./remover');
const config = require('../config/');
const translation = require('../resources/text.json');
const NamuRouter = require('../routes/index');

const apiUrl = 'https://api.telegram.org/bot' + config.token + '/';
const app = express();
const namuRouter = new NamuRouter(config.token);

const namuwikiReqIds = [];
const inlineResults = [];
let lastRequest = 0;
let inlineId = 0;
const searchSelector = 'article.wiki-article section a:not(.page-link)';
const attempt_text = translation.attempt.replace('%d', config.commandAmount);

//Handles reply_markups
const handleWikiLinks = (chatId, links, isSerialized = true) => {
	const arr = [];
	let temparr = [];

	for(let i = 0; i < config.branchAmount; i++) {
		if(links.length > i) {
			const url = links[i];
			const hash = crypto.createHash('md5').update(chatId + ':' + url).digest('hex');

			inlineResults[hash] = {
				url: '/nw ' + url,
				to: chatId,
				expires: Date.now() + 120 * 1000
			};

			temparr.push({
				text: url,
				callback_data: hash
			});

			if(temparr.length >= 2) {
				arr.push(temparr);
				temparr = [];
			}
		}
	}

	if(temparr.length > 0) arr.push(temparr);

	if(isSerialized)
		return JSON.stringify({
			inline_keyboard: arr
		});

	return {
		inline_keyboard: arr
	};
};

//Handles 404 message
const handleSearch = async (url, chatId) => {
	let body = '';

	try {
		body = await rp({
			method: 'get',
			headers: {
				'User-Agent': config.userAgent
			},
			url: `${config.searchUrl}${fixedURIencode(url)}`
		});
		const $ = cheerio.load(body);
		const hrefs = $(searchSelector);
		const results = [];

		for(let i = 0; i < config.inlineAmount; i++) {
			if(hrefs.length > i){
				const url = decodeURIComponent($(hrefs.get(i)).attr('href').replace('/w/', ''));
				const hash = crypto.createHash('md5').update(chatId + ':' + url).digest('hex');

				inlineResults[hash] = {
					url: '/nw ' + url,
					to: chatId,
					expires: Date.now() + 120 * 1000
				};

				results.push([{
					text: url,
					callback_data: hash
				}]);
			}
		}

		await apiCall('sendSticker', {
			chat_id: chatId,
			sticker: fs.createReadStream(
				config.failSticker[Math.floor(Math.random() * config.failSticker.length)]
			),
			reply_markup: JSON.stringify({
				inline_keyboard: results
			})
		});

	} catch(err) {
		await logError(err, {Query: url}, chatId);
		return;
	}
};

//Handles /np Commands
const handleQuery = async (from, chatId, message) => {
	if(attempt(from)) {
		await ignoredApiCall('sendMessage', {
			chat_id: chatId,
			text: attempt_text
		});

		return;
	}

	let body;
	try {
		body = await rp({
			method: 'get',
			headers: {
				'User-Agent': config.userAgent
			},
			url: config.completeUrl + fixedURIencode(message.text.replace(/^\/nq(?:@[a-zA-Z0-9]*)?[ ]*/, ''))
		});
	} catch(err) {
		await logError(err, chatId);
		return;
	}

	const arr = handleWikiLinks(chatId, JSON.parse(body));

	await ignoredApiCall('sendMessage', {
		chat_id: chatId,
		text: translation.search,
		reply_markup: arr
	});
};

//Handles /nw Commands
const handleWiki = async (from, chatId, message) => {
	if(attempt(from)){
		await ignoredApiCall('sendMessage', {
			chat_id: chatId,
			text: attempt_text
		});

		return;
	}

	const url = message.text.replace(/^\/nw(?:@[a-zA-Z0-9]*)?[ ]*/, '');
	if(url === ''){
		await ignoredApiCall('sendMessage', {
			chat_id: chatId,
			text: translation.usage.join('\n'),
			disable_web_page_preview: "true",
			parse_mode: "html"
		});

		return;
	}

	let overview, links;

	try {
		({overview, links} = await getNamuwiki(url));
	} catch (err) {
		if(err.status === 404) {
			await handleSearch(url, chatId);
		} else if(err.status === 503) {
			await ignoredApiCall('sendMessage', {
				chat_id: chatId,
				text: translation.sucuri
			});
		} else {
			await logError(err, {
				Query: url
			}, chatId);
		}
		return;
	}

	const arr = handleWikiLinks(chatId, links);

	try {
		await apiCall('sendMessage', {
			chat_id: chatId,
			text: overview,
			parse_mode: 'html',
			reply_markup: arr,
			disable_web_page_preview: 'false'
		});
	} catch (err) {
		await logError(err, {Query: url}, chatId);
	}
};

//Handles @namuwikiBot inline search
const handleInline = async (from, query, id) => {
	if(attempt(from)){
		await ignoredApiCall('answerInlineQuery', {
			inline_query_id: id,
			results: [{
				type: 'article',
				id: 'query_too_fast',
				title: translation.query_too_fast,
				input_message_content: {
					message_text: attempt_text
				}
			}]
		});

		return;
	}

	let complete = [];

	try {
		complete = await rp({
			method: 'get',
			headers: {
				'User-Agent': config.userAgent
			},
			url: `${config.completeUrl}${fixedURIencode(query)}`,
			json: true
		});

		if(!Array.isArray(complete)) {
			const err = new Error("Returned object is not an array!");
			err.value = complete;

			throw err;
		}
	} catch (err) {
		await logError(err, {
			Inline: true,
			Query: query,
			From: from
		});

		await ignoredApiCall('answerInlineQuery', {
			inline_query_id: id,
			results: [{
				type: 'article',
				id: 'query_error',
				title: translation.query_error,
				input_message_content: {
					message_text: translation.error
				}
			}]
		});

		return;
	}

	const results = [];

	for(let url of complete.slice(0, config.inlineAmount)) {
		let overview = '', links = [];

		try {
			({overview, links} = await getNamuwiki(url));
		} catch (err) {
			if(err.status === 503) {
				results.push({
					type: 'article',
					id: 'query_sucuri',
					title: translation.query_error,
					input_message_content: {
						message_text: translation.sucuri
					}
				});
			} else if(err.status !== 404) {
				await logError(err, {
					Inline: true,
					Query: url,
					From: from
				});
			}
			continue;
		}

		//const arr = handleWikiLinks(from, links, false);

		results.push({
			type: 'article',
			id: crypto.createHash('md5').update(url).digest('hex'),
			title: url,
			message_text: overview,
			parse_mode: 'html',
			//reply_markup: arr,
			url: config.url + fixedURIencode(url)
		});
	};

	try {
		await apiCall('answerInlineQuery', {
			inline_query_id: id,
			results: JSON.stringify(results)
		});
	} catch(e) {
		logError(e, {
			Inline: true,
			Query: query,
			From: from
		});
	}
};

//Handles overall messages
const handleMessage = async (from, chatId, message) => {
	if(message.text.startsWith('/nq')){
		await handleQuery(from, chatId, message);
	}

	if(message.text.startsWith('/nw')){
		await handleWiki(from, chatId, message);
	}
};

namuRouter.on('message', async (message) => {
	const chatId = message.chat.id;
	const from = message.from.id;
	if(typeof message.text !== 'string') return;

	await handleMessage(from, chatId, message);
});

namuRouter.on('inline.callback.query', async (query) => {
	try{
		await apiCall('answerCallbackQuery', {
			callback_query_id: query.id
		});
	} catch(err) {
		logError(err, {});
		return;
	}

	const queryData = inlineResults[query.data];

	if(queryData === undefined){
		await ignoredApiCall('sendMessage', {
			chat_id: query.from.id,
			text: translation.query_invalid
		});

		return;
	}

	await handleMessage(query.from.id, queryData.to, {
		text: queryData.url
	});
});

namuRouter.on('inline.query', async (query) => {
	await handleInline(query.from.id, query.query, query.id);
});

setInterval(() => {
	Object.keys(inlineResults).forEach((k) => {
		if(inlineResults[k].expires < Date.now()){
			inlineResults[k] = undefined;
			delete inlineResults[k];
		}
	});
}, config.gcInterval);

const log = async (logContents, chatId) => {
	if(chatId)
		await ignoredApiCall('sendMessage', {
			chat_id: chatId,
			text: translation.error
		});

	console.log(chalk.bgRed("=======Starting error report======="));

	Object.keys(logContents).forEach((k) => {
		const v = logContents[k];
		console.log(chalk.yellow(k + " : " + v));
	});

	console.log(chalk.bgRed("========End of error report========"));
};

const logError = async (err, additionalInformation, chatId) => {
	if(err.name === 'StatusCodeError') {
		err.response = {};
	}
	const logObject = {
		Time: new Date().toUTCString(),
		Error: util.inspect(err),
		From: chatId
	};

	Object.keys(additionalInformation).forEach((k) => {
		logObject[k] = additionalInformation[k];
	});

	return await log(logObject, chatId);
};

const attempt = (from) => {
	if(namuwikiReqIds[from] !== undefined){
		if(namuwikiReqIds[from].date < Date.now()){
			namuwikiReqIds[from].count = 0;
			namuwikiReqIds[from].date = Date.now() + 60000;
		}

		if(namuwikiReqIds[from].count >= config.commandAmount){
			return true;
		}

		namuwikiReqIds[from].count++;
	}else{
		namuwikiReqIds[from] = {
			count: 0,
			date: Date.now() + 60000
		};
	}

	return false;
};

const apiCall = (target, data) => rp({
	method: 'POST',
	json: true,
	formData: data,
	url: `${apiUrl}${target}`
});

const ignoredApiCall = async (...args) => {
	try {
		return await apiCall(...args);
	} catch(err) {}
}

const isEmptyText = (text) => text.trim().length === 0;

let queryQueue = 0;
const getNamuwiki = async (url, redirectionCount = 0, waited = false) => {
	if(!waited && lastRequest + config.requestInterval > Date.now()){
		await (() => new Promise((resolve) => setTimeout(resolve, config.requestInterval * queryQueue)))();
		return await getNamuwiki(url, redirectionCount, true);
	}

	lastRequest = Date.now();

	if(redirectionCount > config.maxRedirection){
		callback(new Error("Too many redirections!"));
	}

	let resp, body, err;

	if(url.includes('#')) url = url.split('#')[0];

	queryQueue++;
	try {
		resp = await rp({
			method: 'get',
			headers: {
				'User-Agent': config.userAgent
			},
			url: config.rawUrl + fixedURIencode(url),
			resolveWithFullResponse: true
		});
	} catch(e) {
		err = e;
		err.status = resp ? resp.statusCode : 500;
		chalk.red;
	}
	queryQueue--;

	if(resp) body = resp.body;

	if(typeof body !== 'string' || body.includes('<!DOCTYPE html>')) {
		err = new Error("Not Found");
		err.status = 404;
	}

	if(err) {
		const loggerText = `${err.status} : ${url}`;
		if(err.status === 404)
			console.log(chalk.yellow(loggerText));
		else
			console.error(chalk.red(loggerText));
		throw err;
	}

	if(body.includes('#redirect')) {
		const redirectionTarget = body.match(/^\s*#redirect\s+(.*)(#s-.*)?\s*$/m);
		console.log(chalk.green(`302 : ${url}`));

		if(redirectionTarget && redirectionTarget[1]) {
			try {
				return await getNamuwiki(redirectionTarget[1], redirectionCount + 1, true);
			} catch(e) {
				throw e;
			}
		}
	}

	console.log(chalk.cyan(`200 : ${url}`));

	const split = body.split(/^\s*[=]+ .* [=]+\s*$/gm);
	let overview = "";

	if(split.length <= 1) overview = split[0];
	else {
		for(let i = 1; i < split.length; i++) {
			if(!isEmptyText(split[i])) {
				overview = split[i];
				break;
			}
		}
	}

	const links = [];

	for(let key of Object.keys(config.remove)) {
		const removed = await remover[key].remove(config.remove[key], overview, url);
		if(typeof removed === 'string') {
			overview = removed;
		}else if(typeof removed === 'object') {
			if(removed.text) overview = removed.text;
			if(removed.links) links.push(...removed.links);
		}
	}

	overview = truncate(overview, config.overviewLength);
	overview = `<b>${url}</b>\n${overview}\n\n<a href="${config.url}${fixedURIencode(url)}">자세히 보기</a>`;
	return {
		overview,
		links
	};
};

const createServer = async (app) => {
	const port = ((val) => {
		const portNumber = parseInt(val, 10);

		if(isNaN(portNumber)){
			return val;
		}

		if(portNumber >= 0){
			return portNumber;
		}

		return false;
	})(process.env.PORT || '443');
	app.set('port', port);

	const useCert = (process.env.CERT === 'true');
	const formData = {
		url: `${config.hookUrl}${config.token}`
	};
	let options, httpServer;

	if(useCert) {
		options = {
			key: fs.readFileSync('/cert/key.pem'),
			crt: fs.readFileSync('/cert/crt.pem')
		};

		httpServer = http.createServer(options, app);
		formData.certificate = fs.createReadStream('/cert/crt.pem');

	} else httpServer = http.createServer(app);

	httpServer.listen(port);
	httpServer.on('error', (err) => {
		if(err.syscall !== 'listen') throw err;
		const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

		switch(err.code){
			case 'EACCES':
				console.error('Permission Denied!');
				process.exit(1);
				return;

			case 'EADDRINUSE':
				console.error('Address in use!');
				process.exit(1);
				return;
		}

		throw error;
	});

	httpServer.on('listening', () => {
		const addr = httpServer.address();
		console.log((typeof addr === 'string') ? `Pipe ${addr}` : `Listening on port ${addr.port}`);
	});

	await apiCall('setWebhook', formData);
};

if((process.env.NODE_ENV || 'development') === 'development') app.use(logger('dev'));

app.use(bodyParser.text({
	type: 'application/json'
}));

app.use('/', namuRouter.router);

app.use((req, res, next) => {
	res.redirect('https://telegram.me/namuwikiBot');
});

createServer(app);
