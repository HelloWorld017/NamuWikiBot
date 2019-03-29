'use strict';
const bodyParser = require('body-parser');
const chalk = require('chalk');
const express = require('express');
const fs = require('fs');
const http = require('http');
const morgan = require('morgan');

const config = require('./config/');
const {fixedURIencode} = require('./src/Utils');
const translation = require('./resources/text.json');
const packageInfo = require('./package.json');

const ApiHandler = require('./src/ApiHandler');
const InlineStore = require('./src/InlineStore');
const Logger = require('./src/Logger');
const NamuRouter = require('./src/NamuRouter');
const Telegram = require('./src/Telegram');

const isDev = (process.env.NODE_ENV || 'development') === 'development';

const app = express();
const inlineStore = new InlineStore();
const namuRouter = new NamuRouter();
const telegram = new Telegram(isDev);

const logger = new Logger(telegram, translation);
const handler = new ApiHandler(inlineStore, logger, telegram, translation);

namuRouter.on('message', async (message) => {
	const chatId = message.chat.id;
	const from = message.from.id;
	if(typeof message.text !== 'string') return;

	await handler.handleMessage(from, chatId, message);
});

namuRouter.on('inline.callback.query', async (query) => {
	try{
		await telegram.apiCall('answerCallbackQuery', {
			callback_query_id: query.id
		});
	} catch(err) {
		logError(err, {});
		return;
	}

	const queryData = inlineStore.get(query.data);

	if(queryData === undefined){
		await telegram.ignoredApiCall('sendMessage', {
			chat_id: query.from.id,
			text: translation.query_invalid
		});

		return;
	}

	await handler.handleMessage(query.from.id, queryData.to, {
		text: queryData.url
	});
});

namuRouter.on('inline.query', async (query) => {
	await handler.handleInline(query.from.id, query.query, query.id);
});

const createServer = async (app) => {
	const port = ((val) => {
		const portNumber = parseInt(val, 10);

		if(isNaN(portNumber)){
			return val;
		}

		if(portNumber >= 0){
			return portNumber;
		}

		return false;
	})(process.env.PORT || config.update.passive.cert ? '443' : '80');
	app.set('port', port);

	const cert = config.update.passive.cert;
	const formData = {
		url: `${config.update.passive.url}${config.token}`
	};
	let options, httpServer;

	if(cert) {
		options = {
			key: fs.readFileSync(path.resolve(cert, 'key.pem')),
			crt: fs.readFileSync(path.resolve(cert, 'crt.pem'))
		};

		httpServer = http.createServer(options, app);
		formData.certificate = fs.createReadStream('./cert/crt.pem');

	} else httpServer = http.createServer(app);

	httpServer.listen(port);
	httpServer.on('error', (err) => {
		if(err.syscall !== 'listen') throw err;
		const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

		switch(err.code){
			case 'EACCES':
				console.error(chalk.bgRed('Permission Denied!'));
				process.exit(1);
				return;

			case 'EADDRINUSE':
				console.error(chalk.bgRed('Address in use!'));
				process.exit(1);
				return;
		}

		throw error;
	});

	httpServer.on('listening', () => {
		const addr = httpServer.address();
		console.log(chalk.magenta(
			(typeof addr === 'string') ? `Pipe ${addr}` : `Listening on port ${addr.port}`)
		);
	});

	await telegram.apiCall('setWebhook', formData);
};

console.log(chalk.bgCyan("namuwikiBot " + packageInfo.version));
if(isDev) {
	console.log(chalk.black(chalk.bgYellow(`!! WARNING / namuwikiBot is running in "CONSTRUCTION MODE" / WARNING !!`)));
}

if(config.update.mode === 'passive') {
	console.log(chalk.blue("Using Passive(Web Hook) Mode"));

	if(isDev) app.use(morgan('dev'));

	app.use(bodyParser.text({
		type: 'application/json'
	}));

	app.use('/', namuRouter.router);

	app.use((req, res, next) => {
		res.redirect('https://telegram.me/namuwikiBot');
	});

	createServer(app);
} else {
	console.log(chalk.red("Using Active(Long Poll) Mode"));

	let offset = 0;
	const poll = async () => {
		try {
			const args = {};
			if(offset) args.offset = offset;

			const respObject = await telegram.apiCall('getUpdates', args);
			if(!respObject.ok) throw new Error("Request failed with " + respObject.description);

			respObject.result.forEach(item => {
				namuRouter.handleItem(item);
				offset = Math.max(item.update_id + 1, offset);
			});
		} catch(e) {
			logger.logError(e, {
				While: 'Polling'
			});
		}

		process.nextTick(poll);
	};

	telegram.apiCall('deleteWebhook').then(() => {
		poll();
	});
}
