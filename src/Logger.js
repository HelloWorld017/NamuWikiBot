const chalk = require('chalk');
const util = require('util');

class Logger {
	constructor(telegram, translation) {
		this.telegram = telegram;
		this.translation = translation;

		telegram.logger = this;
	}

	async log(logContents, chatId) {
		if(chatId)
			await this.telegram.ignoredApiCall('sendMessage', {
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
