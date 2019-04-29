const Processor = require('./Processor');

class ProcessorInline extends Processor {
	constructor() {
		super('Inline');
	}

	isStartOf(tokens, index) {
		return tokens[index].name === 'Inline';
	}

	process(tokens, start, {parse, flatten}, debug=false) {
		const startToken = tokens[start];
		let end = null;
		
		for(let i = start + 1; i < tokens.length; i++) {
			if(tokens[i].name === 'Inline' && tokens[i].match[1] === startToken.match[1]) {
				end = i;
				break;
			}
		}
		
		if(end === null) {
			return {
				end: start + 1,
				node: [
					{
						name: 'Text',
						content: startToken.content
					}
				]
			};
		}
		
		const innerTokens = tokens.slice(start + 1, end);
		
		return {
			end: end,
			node: [
				{
					name: 'Inline',
					tag: startToken.match[1],
					children: parse(innerTokens),
					content: startToken.content + flatten(innerTokens) + tokens[end].content
				}
			]
		};
	}
	
	get inside() {
		return ['Escape', 'Footnote', 'Macro', 'Inline', 'Link', 'Brace'];
	}
	
	get tokens() {
		return ['Inline'];
	}
}

module.exports = ProcessorInline;
