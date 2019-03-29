const chalk = require('chalk');
const cheerio = require('cheerio');
const config = require('../config');
const {fixedURIencode} = require('./Utils');
const remover = require('./Remover');
const rp = require('request-promise');
const truncate = require('html-truncate');

const isEmptyText = (text) => text.trim().length === 0;

let queryQueue = 0;
let lastRequest = 0;

const getNamuwiki = async (url, redirectionCount = 0, waited = false) => {
	if(!waited && lastRequest + config.request.interval > Date.now()){
		await (() => new Promise((resolve) => setTimeout(resolve, config.request.interval * queryQueue)))();
		return await getNamuwiki(url, redirectionCount, true);
	}

	lastRequest = Date.now();

	if(redirectionCount > config.namuwiki.maxRedirection){
		callback(new Error("Too many redirections!"));
	}

	let resp, body, err;

	if(url.includes('#')) url = url.split('#')[0];

	queryQueue++;
	try {
		resp = await rp({
			method: 'get',
			headers: {
				'User-Agent': config.request.userAgent
			},
			url: config.request.rawUrl + fixedURIencode(url),
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

	overview = truncate(overview, config.namuwiki.overviewLength);
	overview = `<b>${url}</b>\n${overview}\n\n<a href="${config.request.url}${fixedURIencode(url)}">자세히 보기</a>`;

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

module.exports = getNamuwiki;
