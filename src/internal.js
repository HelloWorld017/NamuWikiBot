const config = require('../config/');
const decryptNamuwikiResponse = require('./snippets/decryptNamuwikiResponse');
const getNamuwikiNonce = require('./snippets/getNamuwikiNonce');
const rp = require('request-promise');

const Internal = {
	async getHydratedStates() {
		const body = await rp({
			method: 'get',
			headers: {
				'accept': 'text/html, application/xhtml+xml, application/xml',
				'accept-encoding': 'identity',
				'accept-language': 'ko-KR, ko',
				'user-agent': config.userAgent
			},
			uri: `${config.url}robots.txt`
		});

		const match = body.match(/INITIAL_STATE={(.*?)}<\/script>/);
		if (!match) {
			return {};
		}

		try {
			const parsedMatch = JSON.parse(`{${match[1]}}`);
			return parsedMatch;
		} catch(e) {
			return null;
		}
	},

	getInternalRequestObject(state, url, params) {
		const chika = 'df3a7afb4fbb49988';
		const qs = new URLSearchParams({
			b: chika,
			...params
		});

		const generatedUrl = `${url}?${qs.toString()}`;
		return {
			uri: config.internalUrl + generatedUrl,
			method: 'get',
			headers: {
				'User-Agent': config.userAgent,
				'X-Chika': chika,
				'X-You': state['_303a89c2'],
				'X-Riko': state['_c037b411'],
				'X-Namuwiki-Nonce': getNamuwikiNonce(generatedUrl.toLowerCase())
			},
			encoding: null,
			resolveWithFullResponse: true
		};
	},

	decryptResponse(response) {
		// const key = response.headers['x-namuwiki-key'];
		// It seems it doesn't use the x-namuwiki-key

		const body = decryptNamuwikiResponse(response.body);
		return body.toString();
	},

	async getComplete(state, query) {
		if (!state) {
			state = await this.getHydratedStates();
		}

		const resp = await rp(this.getInternalRequestObject(state, '/Complete', { q: query }));
		return this.decryptResponse(resp);
	}
}

module.exports = Internal;
