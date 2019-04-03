const Tokenizer = require("./Tokenizer");

class RegexTokenizer extends Tokenizer {
	constructor(name, regex, negativeLookBehind = '\\') {
		super(name);

		this.regex = regex;
		this.negativeLookBehind = negativeLookBehind;
	}

	tokenize(string) {
		const match = string.match(this.regex);

		if(match) {
			return {
				token: {
					name: this.name,
					content: match[0],
					match: [...match]
				},
				length: match[0].length,
				at: match.index
			}
		}

		return {
			token: null,
			length: 0
		};
	}
}

module.exports = RegexTokenizer;
