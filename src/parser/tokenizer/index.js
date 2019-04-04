const RegexTokenizer = require('./RegexTokenizer');

const tokenizers = [
	new RegexTokenizer('Escape', /\\\\/, null),
	new RegexTokenizer('Footnote', /\[\*[^ ]*[ ]*(.*?[^\]])[\]]{1}(?!\]+)/),
	new RegexTokenizer('Macro', /\[([a-z]+)(?:\s*\((.*?)\)\s*)?\]/i),
	new RegexTokenizer('Inline', /('''|''|__|--|~~|\^\^|,,)/),
	new RegexTokenizer('LinkOpen', /\[\[/),
	new RegexTokenizer('LinkClose', /\]\]/),
	new RegexTokenizer('BraceOpen', /{{{([#!a-zA-Z0-9+]*)/),
	new RegexTokenizer('BraceClose', /}}}/),
	new RegexTokenizer('Quote', /^\n>(.*)$/m, null)
	//TODO table
];

const tokenize = text => {
	const tokens = [];

	let tokenizing = text;
	while(tokenizing.length > 0) {
		let minimum = {token: null, length: 0, at: Infinity};

		tokenizers.forEach(tokenizer => {
			const result = tokenizer.tokenize(tokenizing);
			if(result.token && result.at < minimum.at) {
				minimum = result;
			}
		});

		if(!isFinite(minimum.at)) {
			tokens.push({
				name: 'Text',
				content: tokenizing
			});
			break;
		}

		const textContent = tokenizing.slice(0, minimum.at);
		if(textContent.length > 0) {
			tokens.push({
				name: 'Text',
				content: textContent
			});
		}

		tokens.push(minimum.token);
		tokenizing = tokenizing.slice(minimum.at + minimum.length);
	}

	return tokens;
};

module.exports = tokenize;
