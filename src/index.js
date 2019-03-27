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
const attempt_text = translation.attempt.replace('%d', config.commandAmount);

namuRouter.on('message', async (message) => {
	const chatId = message.chat.id;
	const from = message.from.id;
	if(typeof message.text !== 'string') return;

	await handleMessage(from, chatId, message);
});

namuRouter.on('inline.callback.query', async (query) => {
	try{
		await telegram.apiCall('answerCallbackQuery', {
			callback_query_id: query.id
		});
	} catch(err) {
		logError(err, {});
		return;
	}

	const queryData = inlineResults[query.data];

	if(queryData === undefined){
		await telegram.ignoredApiCall('sendMessage', {
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
	await api.handleInline(query.from.id, query.query, query.id);
});

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
};

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

	/*const $ = cheerio.load(overview, {
		xmlMode: true
	});

	//Unwrap nested tags
	$.root().children().each((i, _el) => {
		const el = $(_el);
		if(!el) return;

		const children = el.children();
		if(!children) return;

		children.each((i2, _el2) => {
			const el2 = $(_el2);
			if(!el2) return;

			el2.html(el2.text());
		});
	});

	overview = $.html().replace('<root>', '').replace('</root>', '').replace(/<([^<> ]*[^<>]*)\/>/g, '<$1></>');*/

	const tagRegex = /(<([^<> ]+)(?:\s+\w+(?:="[^<>"=]+"))*>)(.+?)(<\/\2>)/g;

	const toText = (text) => {
		return text.replace(tagRegex, (match, startingTag, tagName, content, endTag) => {
			if(content.match(tagRegex)) {
				return toText(content);
			}

			return content;
		});
	};

	overview = overview.replace(tagRegex, (match, startingTag, tagName, content, endTag) => {
		if(content.match(tagRegex)) {
			return toText(content);
		}

		return startingTag + content + endTag;
	});

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
