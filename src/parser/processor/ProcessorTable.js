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
		
		if(startToken.name === 'TableCaption') {
			table.name = startToken.match[1];
		}
		
		const table = {
			styles: {},
			cells: {}
		};
		const whitespace = /^\s*$/;
		const newline = /\n/g;
		
		let x = 0, y = 0;
		const createCell = () => {
			const cellId = [`${x}:${y}`];
			if(!table.cells[cellId]) {
				table.cells[cellId] = {
					children: [],
					align: {},
					styles: {},
					merge: {}
				};
			}
			
			return cellId;
		};
		
		for(let i = start + 1; i < tokens.length; i++) {
			switch(tokens[i].name) {
				case 'TableDivider': {
					const mergingLength = tokens[i].content.length / 2;
					if(tokens[i - 1] && whitespace.test(tokens[i - 1].content)) {
						y++;
						x = 0;
					}
					
					while(table.cells[`${x}:${y}`]) {
						x++;
					}
					
					createCell();
					
					for(let mergingX = 1; mergingX < mergingLength; mergingX++) {
						table.cells[`${x + mergingX}:${y}`] = table.cells[`${x}:${y}`];
					}
					break;
				}
				
				case 'TableColorDecoration': {
					const [color] = tokens[i].match.slice(1);
					const cellId = createCell();
					table.cells[cellId].styles.bgcolor = color;
					break;
				}
				
				case 'TableDecoration': {
					const [isTable, key, value] = tokens[i].match.slice(1);
					if(isTable) {
						table.styles[key] = value;
						break;
					}
					
					const cellId = createCell();
					table.cells[cellId].styles[key] = value;
					break;
				}
				
				case 'TableVAlignMerge': {
					const [alignValue, mergingLength] = tokens[i].match.slice(1);
					const cellId = createCell();
					
					if(alignValue === '^')
						table.cells[cellId].align.top = true;
					
					else if(alignValue === 'v')
						table.cells[cellId].align.bottom = true;
					
					else {
						table.cells[cellId].align.top = true;
						table.cells[cellId].align.bottom = true;
					}
					
					for(let mergingY = 1; mergingY < mergingLength; mergingY++) {
						table.cells[`${x}:${y + mergingY}`] = table.cells[`${x}:${y}`];
					}
					break;
				}
				
				case 'TableHAlign': {
					const [alignValue] = tokens[i].match.slice(1);
					const cellId = createCell();
					
					if(alignValue === '(') {
						table.cells[cellId].align.forceLeft = true;
						table.cells[cellId].align.forceRight = false;
					} else if (alignValue === ')') {
						table.cells[cellId].align.forceLeft = false;
						table.cells[cellId].align.forceRight = true;
					} else {
						table.cells[cellId].align.forceLeft = true;
						table.cells[cellId].align.forceRight = true;
					}
					break;
				}
				
				case 'TableHMerge': {
					const [mergingLength] = tokens[i].match.slice(1);
					const cellId = createCell();
					
					for(let mergingX = 1; mergingX < mergingLength; mergingX++) {
						table.cells[`${x + mergingX}:${y}`] = table.cells[`${x}:${y}`];
					}
					break;
				}
				
				default: {
					if(whitespace.test(tokens[i].content)) {
						const lineBreaks = tokens[i].content.match(newline);
						if(lineBreaks && lineBreaks.length >= 2) {
							end = i - 1;
							break;
						}
						continue;
					}
					
					const cellId = createCell();
					table.cells[cellId].children.push(tokens[i]);
					break;
				}
			}
		}
		
		Object.keys(table.cells).forEach(k => {
			const children = table.cells[k].children;
			if(children.length === 0) return;
			
			table.cells[k].align.left = children[0].content.startsWith(' ');
			table.cells[k].align.right = children[children.length - 1].content.endsWith(' ');
			
			if(table.cells[k].align.forceLeft) {
				table.cells[k].align.left = table.cells[k].align.forceLeft;
				delete table.cells[k].align.forceLeft;
			}
			
			if(table.cells[k].align.forceRight) {
				table.cells[k].align.right = table.cells[k].align.forceRight;
				delete table.cells[k].align.forceRight;
			}
		});
		
		if(end === null) {
			if(Object.keys(table.cells).length === 0) {
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
			
			end = tokens.length;
		}
		
		const innerTokens = tokens.slice(start + 1, end);
		
		return {
			end: end,
			node: [
				{
					name: 'Table',
					children: [],
					table,
					content: innerTokens.map(v => v.content).join('')
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
