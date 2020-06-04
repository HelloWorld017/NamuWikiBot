const Attempt = require('./Attempt');

const config = require('../config');
const {fixedURIencode} = require('./Utils');
const getNamuwiki = require('./Namuwiki');
const rp = require('request-promise');

class ApiHandler {
	constructor(inlineStore, logger, telegram, translation) {
		this.attempt = new Attempt(config, translation);
		this.inlineStore = inlineStore;
		this.logger = logger;
		this.telegram = telegram;
		this.translation = translation;
	}

	/* ==========
	* Get Reply Markup
	* ========== */
	wikiLinks(chatId, links, isSerialized = true) {
		const arr = [];
		let temparr = [];

		for(let i = 0; i < config.namuwiki.branchAmount; i++) {
			if(links.length > i) {
				const url = links[i];
				const hash = this.inlineStore.add(url, chatId);

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
	}

	/* ==========
	* Get 404 Message
	* ========== */
	async search(url, chatId) {
		const searchSelector = 'article.wiki-article section a:not(.page-link)';
		let body = '';

		try {
			body = await rp({
				method: 'get',
				headers: {
					'User-Agent': config.request.userAgent
				},
				url: `${config.request.searchUrl}${fixedURIencode(url)}`
			});
			const $ = cheerio.load(body);
			const hrefs = $(searchSelector);
			const results = [];

			for(let i = 0; i < config.inline.amount; i++) {
				if(hrefs.length > i){
					const url = decodeURIComponent($(hrefs.get(i)).attr('href').replace('/w/', ''));
					this.inlineStore.add(url, chatId);

					results.push([{
						text: url,
						callback_data: hash
					}]);
				}
			}

			await this.telegram.apiCall('sendSticker', {
				chat_id: chatId,
				sticker: config.failSticker[Math.floor(Math.random() * config.failSticker.length)],
				reply_markup: JSON.stringify({
					inline_keyboard: results
				})
			});

		} catch(err) {
			await this.logger.logError(err, {Query: url}, chatId);
			return;
		}
	}

	/* ==========
	* Command /nq
	* ========== */
	async handleQuery(from, chatId, message) {
		if(this.attempt.attempt(from)) {
			await this.telegram.ignoredApiCall('sendMessage', {
				chat_id: chatId,
				text: this.attempt.text
			});

			return;
		}

		let body;
		try {
			body = await rp({
				method: 'get',
				headers: {
					'User-Agent': config.request.userAgent
				},
				url: config.request.completeUrl +
					fixedURIencode(message.text.replace(/^\/nq(?:@[a-zA-Z0-9]*)?[ ]*/, ''))
			});
		} catch(err) {
			await this.logger.logError(err, chatId);
			return;
		}

		const arr = this.wikiLinks(chatId, JSON.parse(body));

		await this.telegram.ignoredApiCall('sendMessage', {
			chat_id: chatId,
			text: this.translation.search,
			reply_markup: arr
		});
	}

	/* ==========
	* Command /nw
	* ========== */
	async handleWiki(from, chatId, message) {
		if(this.attempt.attempt(from)) {
			await this.telegram.ignoredApiCall('sendMessage', {
				chat_id: chatId,
				text: this.attempt.text
			});

			return;
		}

		const url = message.text.replace(/^\/nw(?:@[a-zA-Z0-9]*)?[ ]*/, '');
		if(url === ''){
			await this.telegram.ignoredApiCall('sendMessage', {
				chat_id: chatId,
				text: this.translation.usage.join('\n'),
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
				await this.search(url, chatId);
			} else if(err.status === 503) {
				await this.telegram.ignoredApiCall('sendMessage', {
					chat_id: chatId,
					text: this.translation.sucuri
				});
			} else {
				await this.logger.logError(err, {
					Query: url
				}, chatId);
			}
			return;
		}

		const arr = this.wikiLinks(chatId, links);

		try {
			await this.telegram.apiCall('sendMessage', {
				chat_id: chatId,
				text: overview,
				parse_mode: 'html',
				reply_markup: arr,
				disable_web_page_preview: 'false'
			});
		} catch (err) {
			await this.logger.logError(err, {Query: url}, chatId);
		}
	}

	/* ==========
	* @namuwikiBot Inline Search
	* ========== */
	async handleInline(from, query, id) {
		if(this.attempt.attempt(from)){
			await this.telegram.ignoredApiCall('answerInlineQuery', {
				inline_query_id: id,
				results: [{
					type: 'article',
					id: 'query_too_fast',
					title: this.translation.query_too_fast,
					input_message_content: {
						message_text: this.attempt.text
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
					'User-Agent': config.request.userAgent
				},
				url: `${config.request.completeUrl}${fixedURIencode(query)}`,
				json: true
			});

			if(!Array.isArray(complete)) {
				const err = new Error("Returned object is not an array!");
				err.value = complete;

				throw err;
			}
		} catch (err) {
			await this.logger.logError(err, {
				Inline: true,
				Query: query,
				From: from
			});

			await this.telegram.ignoredApiCall('answerInlineQuery', {
				inline_query_id: id,
				results: [{
					type: 'article',
					id: 'query_error',
					title: this.translation.query_error,
					input_message_content: {
						message_text: this.translation.error
					}
				}]
			});

			return;
		}

		const results = [];

		for(let url of complete.slice(0, config.inline.amount)) {
			let overview = '', links = [];

			try {
				({overview, links} = await getNamuwiki(url));
			} catch (err) {
				if(err.status === 503) {
					results.push({
						type: 'article',
						id: 'query_sucuri',
						title: this.translation.query_error,
						input_message_content: {
							message_text: this.translation.sucuri
						}
					});
				} else if(err.status !== 404) {
					await this.logger.logError(err, {
						Inline: true,
						Query: url,
						From: from
					});
				}
				continue;
			}

			results.push({
				type: 'article',
				id: crypto.createHash('md5').update(url).digest('hex'),
				title: url,
				message_text: overview,
				parse_mode: 'html',
				url: config.request.url + fixedURIencode(url)
			});
		};

		try {
			await this.telegram.apiCall('answerInlineQuery', {
				inline_query_id: id,
				results: JSON.stringify(results)
			});
		} catch(e) {
			this.logger.logError(e, {
				Inline: true,
				Query: query,
				From: from
			});
		}
	}

	/* ==========
	* Handle Overall Messages
	* ========== */
	async handleMessage (from, chatId, message) {
		if(message.text.startsWith('/nq')){
			await this.handleQuery(from, chatId, message);
		}

		if(message.text.startsWith('/nw')){
			await this.handleWiki(from, chatId, message);
		}
		
		if(message.text.startsWith('@namuwikiBot')){
			await this.handleInline(from, query, id);
		}
	}
}

module.exports = ApiHandler;
