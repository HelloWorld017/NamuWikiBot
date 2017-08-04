const EventEmitter = require('events');
const {Router} = require('express');

class NamuRouter extends EventEmitter {
	constructor(token) {
		this._router = Router();

		this._router.post(`/${token}`, (req, res, next) => {
			const item = JSON.parse(req.body);

			this.emit('update', item);

			if(item.callback_query) {
				this.emit('inline.callback.query', item.callback_query);
				return;
			}

			if(item.inline_query) {
				this.emit('inline.query', item.inline_query);
				return;
			}

			if(item.chosen_inline_result) {
				this.emit('inline.result', item.chosen_inline_result);
				return;
			}

			if(item.message) this.emit('message', item.message);

			res.end(':D');
		});
	}

	get router() {
		return this._router;
	}
}

module.exports = NamuRouter;
