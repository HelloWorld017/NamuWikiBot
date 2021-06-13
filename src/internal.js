const config = require('../config');
const decryptNamuwikiResponse = require('./snippets/decryptNamuwikiResponse');
const getNamuwikiNonce = require('./snippets/getNamuwikiNonce');
const { namuApiCall } = require('./request');

const Internal = {
	async getHydratedStates() {
		const { data: body } = await namuApiCall.get(config.url);

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
			url: config.internalUrl + generatedUrl,
			method: 'get',
			headers: {
				'User-Agent': config.userAgent,
				'X-Chika': chika,
				'X-You': state['_303a89c2'],
				'X-Riko': state['_c037b411'],
				'X-Namuwiki-Nonce': getNamuwikiNonce(generatedUrl.toLowerCase())
			},
			responseType: 'buffer'
		};
	},

	decryptResponse(response) {
		// const key = response.headers['x-namuwiki-key'];
		// It seems it doesn't use the x-namuwiki-key

		const body = decryptNamuwikiResponse(response.body);
		return body.toString();
	},

	async getComplete(query) {
		if (!this.isStateAvailable()) {
			this.state = await this.getHydratedStates();
		}

		const { data } = await namuApiCall(this.getInternalRequestObject(this.state, '/Complete', { q: query }));
		return this.decryptResponse(data);
	},

	isStateAvailable() {
		return !this.state || this.state.createdAt + config.maxStateLifetime < Date.now();
	}
}

module.exports = Internal;
