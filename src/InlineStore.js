class InlineStore {
	constructor(config) {
		this.store = {};

		setInterval(() => {
			this.removeExpired();
		}, config.gcInterval);
	}

	add(url, chatId) {
		const hash = crypto.createHash('md5').update(chatId + ':' + url).digest('hex');

		this.store[hash] = {
			url: '/nw ' + url,
			to: chatId,
			expires: Date.now() + 120 * 1000
		};
	}

	removeExpired() {
		Object.keys(this.store).forEach((k) => {
			if(this.store[k].expires < Date.now()){
				this.store[k] = undefined;
				delete this.store[k];
			}
		});
	}
}

module.exports = InlineStore;
