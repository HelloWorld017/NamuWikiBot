class Attempt {
	constructor(config, translation) {
		this.commandAmount = config.attempt.commands;
		this.expiresIn = config.attempt.expire;
		this.text = translation.attempt.replace('%d', this.commandAmount);
		this.reqIds = [];
	}

	attempt(from) {
		if(this.reqIds[from] !== undefined){
			if(this.reqIds[from].date < Date.now()){
				this.reqIds[from].count = 0;
				this.reqIds[from].date = Date.now() + this.expiresIn;
			}

			if(this.reqIds[from].count >= this.commandAmount){
				return true;
			}

			this.reqIds[from].count++;
		}else{
			this.reqIds[from] = {
				count: 0,
				date: Date.now() + this.expiresIn
			};
		}

		return false;
	};
}

module.exports = Attempt;
