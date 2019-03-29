const config = require('../config');
const rp = require('request-promise');

class Telegram {
	constructor(isDev) {
		this.apiUrl = 'https://api.telegram.org/bot' + config.token + '/';
		this.logger = null;
		this.isDev = isDev;
	}

	async apiCall(target, data) {
		return rp({
			method: 'POST',
			json: true,
			formData: data,
			url: `${this.apiUrl}${target}`
		});
	}

	async ignoredApiCall(...args) {
		try {
			return await this.apiCall(...args);
		} catch(err) {
			if(this.isDev && this.logger) {
				this.logger.logError(err, {});
			}
		}
	}
}

module.exports = Telegram;
