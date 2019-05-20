const Processor = require('./Processor');

class ProcessorQuote extends Processor {
	constructor() {
		super('Quote');
	}
	
	isStartOf(tokens, index) {
		return tokens[index].name === 'Quote';
	}
	
	process(tokens, start, {parse, flatten}, {name}, debug=false) {
		const startToken = tokens[start];
		const whitespace = /^\s*$/;
		const newline = /\n/g;
		
		let end = null;
		
		for(let i = start; i < tokens.length; i++) {
			if(tokens[i].name === 'Quote') {
				let isEnd = true;
				for(let delta = 1; delta <= 2; delta++) {
					if(i + delta >= tokens.length) {
						break;
					}
					
					if(tokens[i + delta].name === 'Quote') {
						isEnd = false;
						break;
					}
					
					if(!whitespace.test(tokens[i + delta].content)) {
						break;
					}
					
					const lines = tokens[i + delta].content.match(newline);
					if(lines && lines.length > 2) {
						break;
					}
				}
				
				if(isEnd) {
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
						content: parse(startToken.content)
					}
				]
			};
		}
		
		const rootNode = {
			name: 'Quote',
			children: [],
			content: '',
			isRoot: true
		};
		let leafNode = rootNode;
		let previousLevel = 1;
		
		const quoteTokens = tokens.slice(start, end + 1);
		quoteTokens.forEach(quote => {
			if(quote.name === 'Text') {
				leafNode.children[leafNode.children.length - 1].content += quote.content;
				leafNode.content += quote.content;
				return;
			}
			
			let [level, text] = quote.match.slice(1);
			level = level.length;
			
			if(level > previousLevel) {
				previousLevel = level;
				
				const newNode = {
					name: 'Quote',
					children: [
						{
							name: 'Text',
							content: text
						}
					],
					level,
					parent: leafNode,
					content: quote.match[0]
				};
				leafNode.children.push(newNode);
				leafNode = newNode;
				return;
			}
			
			if(level < previousLevel) {
				previousLevel = level;
				leafNode.children = parse(leafNode.children);
				
				const parent = leafNode.parent;
				delete leafNode.parent;
				
				leafNode = parent;
			}
			
			const sibiling = leafNode.children[leafNode.children.length - 1];
			if(sibiling && sibiling.name === 'Text') {
				sibiling.content += text;
			} else {
				leafNode.children.push({
					name: 'Text',
					content: text
				});
			}
		});
		
		if(leafNode.parent) {
			leafNode.children = parse(leafNode.children);
			delete leafNode.parent;
		}
		
		delete rootNode.isRoot;
		
		return {
			end: end,
			node: [
				rootNode
			]
		};
	}
	
	get inside() {
		return ['Escape', 'Footnote', 'Macro', 'Inline', 'Link', 'Brace'];
	}
	
	get tokens() {
		return ['Quote'];
	}
}

module.exports = ProcessorQuote;
