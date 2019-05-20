const TokenizerRegex = require('./TokenizerRegex');
const TokenizerRegexLine = require('./TokenizerRegexLine');

const tokenizers = [
	new TokenizerRegex('Escape', /\\\\/, null),
	new TokenizerRegex('Footnote', /\[\*[^ ]*[ ]*(.*?[^\]])[\]]{1}(?!\]+)/),
	new TokenizerRegex('Macro', /\[([a-z]+)(?:[^\S\r\n]*\((.*?)\)[^\S\r\n]*)?\]/i),
	new TokenizerRegex('Toc', /\[목차\]/),
	new TokenizerRegex('Inline', /('''|''|__|--|~~|\^\^|,,)/),
	
	new TokenizerRegex('LinkOpen', /\[\[/),
	new TokenizerRegex('LinkClose', /\]\]/),
	
	new TokenizerRegex('BraceOpen', /{{{([#!a-zA-Z0-9+]*)[^\S\r\n]*/),
	new TokenizerRegex('BraceClose', /\s*}}}/),
	
	new TokenizerRegexLine('TableRowStart', /^[^\S\r\n]*\|([^\[\]\|]*?)?\|((?:\|\|)*)/),
	new TokenizerRegexLine('TableRowEnd', /((?:\|\|)+)[^\S\r\n]*$/, true),
	
	new TokenizerRegexLine('Quote', /^(>+)(.*)$/),
	new TokenizerRegexLine('Horizontal', /^-{4,9}$/),
	new TokenizerRegexLine('Annotation', /^##(.*)$/),
	new TokenizerRegexLine('List', /^([^\S\r\n]+)([1IiAa]\.|\*)((?:#[0-9+])?)([^]*?)$/)
];

const tokenizerInternal = [
	new TokenizerRegex('TableDecoration', /<((?:table )?)([a-z]+?)=([^>]*?)>/),
	new TokenizerRegex('TableDivider', /(?<!^)((?:\|\|)+)(?!$)/),
	new TokenizerRegex('TableVAlignMerge', /<((?:\^v)?)\|([0-9]+)>/),
	new TokenizerRegex('TableHMerge', /<-([0-9]+)>/),
	new TokenizerRegex('TableHAlign', /<([\(\):])>/),
	new TokenizerRegex('TableColorDecoration', /<((?:[a-z]+)|(?:#[0-9a-f]{3,6}))>/)
];

const tokenize = tokenNames => text => {
	const usingTokenizers = [
		...tokenizers.filter(v => tokenNames.includes(v.name)),
		...tokenizerInternal.filter(v => tokenNames.includes(v.name))
	];
	const tokens = [];

	let tokenizing = text;
	let index = 0;
	while(tokenizing.length > 0) {
		let minimum = {token: null, length: 0, at: Infinity};

		usingTokenizers.forEach(tokenizer => {
			const result = tokenizer.tokenize(tokenizing, text, index);
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
				index,
				name: 'Text',
				content: textContent
			});
		}
		
		minimum.token.index = index + textContent.length;
		
		tokens.push(minimum.token);
		tokenizing = tokenizing.slice(minimum.at + minimum.length);
		index += minimum.at + minimum.length;
	}

	return tokens;
};

module.exports = tokenize;
module.exports.tokenizers = tokenizers;
