const RegexTokenizer = require('./RegexTokenizer');

const tokenizers = [
	new RegexTokenizer('Footnote', /\[\*[^ ]*[ ]*(.*?[^\]])[\]]{1}(?!\]+)/),
	new RegexTokenizer('Macro', /\[([a-z]+)(?:\s*\((.*?)\)\s*)?\]/i),
	new RegexTokenizer('Inline', /('''|''|__|--|~~|\^\^|,,|)[^]*?\1/),
	new RegexTokenizer('Link', /\[\[([^\[\]\|]*?)(?:\|([^\[\]]*?))?\]\]/),
	new RegexTokenizer('Brace', /{{{([#!a-zA-Z0-9+]*)[^]*?}}}/),
	new RegexTokenizer('Quote', /^\n>(.*)$/m)
];

const tokenize = text => {
	const escapeMaps = {};

	let i = 0;
	text.replace(/\\(.)/g, (match, p1) => {
		escapeMaps[i] = p1;
		i++;

		return `\uff22${i}\uffee`;
	});
};
