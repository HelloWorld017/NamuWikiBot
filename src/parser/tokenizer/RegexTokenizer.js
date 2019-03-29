const Tokenizer = require("./Tokenizer");

class RegexTokenizer extends Tokenizer {
	constructor(name, regex) {
		super(name);

		this.regex = regex;
	}

	tokenize(string) {
		const match = string.match(this.regex);

		if(match) {
			return {
				token: {
					name: this.name,
					content: match[0],
					match
				},
				length: match[0].length
			}
		}

		return {
			token: null,
			length: 0
		};
	}
}

module.exports = RegexTokenizer;
