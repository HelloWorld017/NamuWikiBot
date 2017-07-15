module.exports = (token) => {
	var router = require('express').Router();

	router.post('/' + token, (req, res, next) => {
		console.log('Youve got mail');
		var item = JSON.parse(req.body);

		global.bevents.emit('update', item);

		if (item.callback_query){
		    global.bevents.emit('inline.callback.query', item.callback_query);
		    return;
		}

		if(item.inline_query){
		    global.bevents.emit('inline.query', item.inline_query);
		    return;
		}

		if(item.chosen_inline_result){
		    global.bevents.emit('inline.result', item.chosen_inline_result);
		    return;
		}

		if(item.message) global.bevents.emit('message', item.message);
		res.end(':D');
	});

	return router;
};
