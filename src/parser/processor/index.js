const tokenize = require('../tokenizer');

const ProcessorBrace = require('./ProcessorBrace');
const ProcessorInline = require('./ProcessorInline');
const ProcessorLink = require('./ProcessorLink');
const ProcessorList = require('./ProcessorList');
const ProcessorMacro = require('./ProcessorMacro');
const ProcessorQuote = require('./ProcessorQuote');
const ProcessorTable = require('./ProcessorTable');

const processors = [
	new ProcessorBrace(),
	new ProcessorInline(),
	new ProcessorLink(),
	new ProcessorMacro(),
	new ProcessorList(),
	new ProcessorQuote(),
	new ProcessorTable(),
];

const flatten = tokens => tokens.map(v => v.content).join('');
const splitProcessorTokenizer = processorOrTokenizerNames => {
	const processorNames = [];
	const tokenizerNames = processorOrTokenizerNames
		.map(name => {
			const foundProcessor = processors.find(v => v.name === name);
			if(foundProcessor !== undefined) {
				processorNames.push(name);
				return foundProcessor.tokens;
			}
			return name;
		})
		.reduce((prev, curr) => prev.concat(curr), []);
	
	return {
		processorNames,
		tokenizerNames
	};
};
const parseInternal = (processorOrTokenizerNames, context, debug = false) => contentOrTokens => {
	let content = contentOrTokens;
	if(typeof contentOrTokens === 'string') {
		content = [
			{
				name: 'Text',
				content: contentOrTokens
			}
		];
	}
	
	content = content.reduce((array, v) => {
		const isLastString = typeof array[array.length - 1] === 'string';
		if(v.name === 'Text') {
			if(!isLastString) array.push('');
			array[array.length - 1] += v.content;
			
			return array;
		}
		
		array.push(v);
		return array;
	}, []);
	
	const {processorNames, tokenizerNames} = splitProcessorTokenizer(processorOrTokenizerNames);
	
	const tokenizeUsing = tokenize(tokenizerNames);
	const tokenized = content.reduce((array, v) => {
		if(typeof v === 'string') {
			array.push(...tokenizeUsing(v));
		} else {
			array.push(v);
		}
		
		return array;
	}, []);
	
	return process(processorNames, context, debug)(tokenized);
};

const process = (processorNames, context, debug=false) => tokens => {
	const usingProcessors = processors.filter(v => processorNames.includes(v.name));
	usingProcessors.forEach(processor => {
		const {tokenizerNames} = splitProcessorTokenizer(processor.inside);
		const tokenizeUsing = tokenize(tokenizerNames);

		const tools = {
			parse: parseInternal(processor.inside, context, debug),
			tokenize: tokenizeUsing,
			flatten
		};
		
		let tokenLength = tokens.length;
		for(let i = 0; i < tokenLength; i++) {
			if(!processor.isStartOf(tokens, i)) continue;
			
			
			const {end, node} = processor.process(tokens, i, tools, context, debug);
			tokens.splice(i, end - i + 1, ...node);
			tokenLength = tokens.length;
		}
	});
	
	return tokens;
};

module.exports = process;
module.exports.parse = (text, ...args) => parseInternal([
	'Escape',
	'Footnote',
	...tokenize.tokenizers.map(v => v.name),
	...processors.map(v => v.name)
].reduce((prev, v) => {
	if(!prev.includes(v)) {
		prev.push(v);
	}
	
	return prev;
}, []), ...args)(text);
