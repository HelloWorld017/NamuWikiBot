const Processor = require('./Processor');

const abcdize = num => (num - 1).toString(26).split('').map((v, i, arr) => {
	let index = parseInt(v, 26) - 1;
	if(i === arr.length - 1) index++;

	return 'abcdefghijklmnopqrstuvwxyz'[index];
}).join('');

class ProcessorList extends Processor {
	constructor() {
		super('List');
	}
	
	isStartOf(tokens, index) {
		return tokens[index].name === 'List';
	}
	
	process(tokens, start, {parse, flatten}, {name}, debug=false) {
		const startToken = tokens[start];
		let end = null;
		
		const whitespace = /^\s*$/;
		const newline = /\n/g;
		
		for(let i = start; i < tokens.length; i++) {
			if(tokens[i].name === 'List') {
				let isEnd = true;
				for(let delta = 1; delta <= 2; delta++) {
					if(i + delta >= tokens.length) {
						break;
					}
					
					if(tokens[i + delta].name === 'List') {
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
		
		let level = 0;
		
		const result = [];
		const context = {};
		const listTokens = tokens.slice(start, end + 1);
		listTokens.forEach(list => {
			if(list.name !== 'List') return;
			
			const [rawContent, rawIndent, rawChar, rawStart, rawChildren] = list.match;
			let levelDelta = 0;
			
			if(rawIndent.length !== level) {
				levelDelta = Math.sign(rawIndent.length - level);
				level += levelDelta;
				
				if(levelDelta >= 1) {
					context[level] = {
						index: 0,
						char: rawChar
					};
				}
			}
			
			if(context[level].char !== rawChar) {
				context[level].index = 0;
				context[level].char = rawChar;
			}
			
			const children = parse(rawChildren);
			
			if(rawChar === '*') {
				result.push({
					name: 'ListItem',
					listChar: '*',
					unordered: true,
					level,
					children,
					content: rawContent
				});
				
				return;
			}
			
			context[level].index++;
			
			if(rawStart) {
				const newIndex = parseInt(rawStart.slice(1));
				if(isFinite(newIndex)) {
					context[level].index = newIndex;
				}
			}
			
			let listChar = '';
			switch(rawChar) {
				case '1.':
					listChar = '' + context[level].index;
					break;
					
				case 'I.':
					listChar = romanize(context[level].index).toUpperCase();
					break;
				
				case 'i.':
					listChar = romanize(context[level].index).toLowerCase();
					break;
				
				case 'A.':
					listChar = abcdize(context[level].index).toUpperCase();
					break;
				
				case 'a.':
					listChar = abcdize(context[level].index).toLowerCase();
					break;
			}
			
			listChar += '.';
			
			result.push({
				name: 'ListItem',
				listChar,
				level,
				children,
				content: rawContent
			});
		});
		
		return {
			end: end,
			node: [
				{
					name: 'List',
					children: result,
					content: flatten(listTokens)
				}
			]
		};
	}
	
	get inside() {
		return ['Escape', 'Footnote', 'Macro', 'Inline', 'Link', 'Brace'];
	}
	
	get tokens() {
		return ['List'];
	}
}

module.exports = ProcessorList;
