const EventEmitter = require('events');
const {Router} = require('express');

class NamuRouter extends EventEmitter {
	constructor(token) {
		super();

		this._router = Router();
		this._router.post(`/${token}`, (req, res) => {
			const item = JSON.parse(req.body);
			res.status(200).send(':D');

			this.handleItem(item);
		});
	}

	handleUpdate(item) {
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
	}

	get router() {
		return this._router;
	}
}

module.exports = NamuRouter;
