const Tokenizer = require("./Tokenizer");

class TokenizerRegex extends Tokenizer {
	constructor(name, regex, negativeLookBehind = '\\') {
		super(name);

		this.originalRegex = regex;
		this.negativeLookBehind = negativeLookBehind;
		
		const regexStr = regex.source;
		const concatedRegex = negativeLookBehind === null
			? regexStr
			: '(?<!\\' + negativeLookBehind + ')' + regexStr;
		
		this.regex = new RegExp(concatedRegex, regex.flags);
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

module.exports = TokenizerRegex;
