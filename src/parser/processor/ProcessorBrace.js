const Processor = require('./Processor');
class ProcessorBrace extends Processor {
	constructor() {
		super('Brace');
		this.hasFirstLineArgument = [
			'#!syntax',
			'#!wiki',
			'#!folding'
		];
		
		this.isNonParsing = [
			'',
			'#!syntax',
			'#!html'
		];
	}
	
	isStartOf(tokens, index) {
		return tokens[index].name === 'BraceOpen';
	}

	process(tokens, start, {parse, flatten}, {name}, debug=false) {
		const startToken = tokens[start];
		let end = null;
		let level = 1;
		
		for(let i = start + 1; i < tokens.length; i++) {
			if(tokens[i].name === 'BraceOpen') level++;
			
			if(tokens[i].name === 'BraceClose') {
				level--;
				
				if(level === 0) {
					end = i;
					break;
				}
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
		const innerContent = flatten(innerTokens);
		let innerParsing = innerContent;
		let args = '';
		let children = [];
		
		if(this.hasFirstLineArgument.includes(startToken.match[1])) {
			const [firstLine, leftLine] = innerContent.match(/([^]*)(\n[^]*)?/).slice(1);
			args = firstLine;
			innerParsing = leftLine;
		}
		
		if(this.isNonParsing.includes(startToken.match[1])) {
			children = [
				{
					name: 'Text',
					content: innerParsing
				}
			];
		} else {
			children = parse(innerParsing);
		}
		
		return {
			end: end,
			node: [
				{
					name: 'Brace',
					tag: startToken.match[1],
					args,
					children,
					content: startToken.content + innerContent + tokens[end].content
				}
			]
		};
	}
	
	get inside() {
		return ['Escape', 'Footnote', 'Macro', 'Inline', 'Link', 'Brace'];
	}
	
	get tokens() {
		return ['BraceOpen', 'BraceClose'];
	}
}

module.exports = ProcessorBrace;
