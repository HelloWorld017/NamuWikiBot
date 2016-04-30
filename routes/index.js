module.exports = (token) => {
	var router = require('express').Router();

	router.post('/' + token, (req, res, next) => {
		var item = JSON.parse(req.body);

		global.api.emit('update', item);

		if (item.callback_query){
		    global.api.emit('inline.callback.query', item.callback_query);
		    return;
		}

		if(item.inline_query){
		    global.api.emit('inline.query', item.inline_query);
		    return;
		}

		if(item.chosen_inline_result){
		    global.api.emit('inline.result', item.chosen_inline_result);
		    return;
		}

		if(item.message) global.api.emit('message', item.message);
	});

	return router;
};
