const Tokenizer = require("./Tokenizer");

class TokenizerRegexLine extends Tokenizer {
	constructor(name, regex) {
		super(name);

		this.regex = regex;
		this.regex.global = true;
		this.regex.multiline = true;
	}

	tokenize(string, original, index) {
		this.regex.lastIndex = 0;
		
		let match = this.regex.exec(string);
		
		while(match) {
			const lastChar = original[index - 1];
			if(lastChar === '\n') {
				break;
			}
			
			match = this.regex.exec(string);
		}

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

module.exports = TokenizerRegexLine;
