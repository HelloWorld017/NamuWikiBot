const Tokenizer = require("./Tokenizer");

class TokenizerRegexLine extends Tokenizer {
	constructor(name, regex, reverse = false) {
		super(name);

		this.regex = new RegExp(regex.source, 'gm' + regex.flags);
		this.reverse = reverse;
	}

	tokenize(string, original, index) {
		this.regex.lastIndex = 0;
		let match = this.regex.exec(string);
		
		while(match) {
			const lastChar = this.reverse
			 	? original[index + match.index + match[0].length]
				: original[index + match.index - 1];
			
			if(lastChar === '\n' || lastChar === '\r') {
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
