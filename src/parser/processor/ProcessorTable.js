const Processor = require('./Processor');

class ProcessorTable extends Processor {
	constructor() {
		super('Table');
	}

	isStartOf(tokens, index) {
		return tokens[index].name === 'TableCaption' || tokens[index].name === 'TableDivider';
	}

	process(tokens, start, {parse, flatten}, debug=false) {
		const startToken = tokens[start];
		let end = null;
		
		let isInCell = true;
		let horiz = 0;
		const table = {};
		
		for(let i = start + 1; i < tokens.length; i++) {
			if(tokens[i].name === 'TableDivider') {
				isInCell = !isInCell;
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
		return ['TableHAlign', 'TableHMerge', 'TableVAlignMerge', 'TableDecoration', 'TableDivider', 'TableCaption'];
	}
}

module.exports = ProcessorTable;
