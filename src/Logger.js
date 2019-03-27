const Telegram = require('./Telegram');

class Logger {
	constructor(translation) {
		this.translation = translation;
	}

	async log (logContents, chatId) {
		if(chatId)
			await Telegram.ignoredApiCall('sendMessage', {
				chat_id: chatId,
				text: this.translation.error
			});

		console.log(chalk.bgRed("=======Starting error report======="));

		Object.keys(logContents).forEach((k) => {
			const v = logContents[k];
			console.log(chalk.yellow(k + " : " + v));
		});

		console.log(chalk.bgRed("========End of error report========"));
	}

	async logError(err, additionalInformation, chatId) {
		if(err.name === 'StatusCodeError') {
			err.response = {};
		}
		const logObject = {
			Time: new Date().toUTCString(),
			Error: util.inspect(err),
			From: chatId
		};

		Object.keys(additionalInformation).forEach((k) => {
			logObject[k] = additionalInformation[k];
		});

		return await this.log(logObject, chatId);
	}
}

module.exports = Logger;
