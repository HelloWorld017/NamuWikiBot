const Processor = require('./Processor');

class ProcessorTable extends Processor {
	constructor() {
		super('Table');
	}

	isStartOf(tokens, index) {
		return tokens[index].name === 'TableRowStart';
	}

	process(tokens, start, {parse, flatten}, debug=false) {
		const startToken = tokens[start];
		let end = null;
		
		if(startToken.match[1] && startToken.match[1].length > 0)
			table.name = startToken.match[1];
		
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
					styles: {}
				};
			}
			
			return cellId;
		};
		
		const mergeCell = (mergingLength, direction = 0) => {
			const cellId = `${x}:${y}`;
			for(let merging = 1; merging < mergingLength; merging++) {
				const cellIdRaw = [x, y];
				cellIdRaw[direction] += merging;
				table.cells[cellIdRaw.join(':')] = {
					children: [],
					reference: cellId,
					isMergedCell: true
				};
			}
		};
		
		for(let i = start + 1; i < tokens.length; i++) {
			if(tokens[i].name === 'TableRowEnd') {
				let isEnd = true;
				for(let delta = 1; delta <= 2; delta++) {
					if(i + delta >= tokens.length) {
						break;
					}
					
					if(tokens[i + delta].name === 'TableRowStart') {
						if(!tokens[i + delta].match[1] || tokens[i + delta].match[1] === '') {
							isEnd = false;
						}
						break;
					}
					
					if(!whitespace.test(tokens[i + delta].content)) {
						break;
					}
					
					const lines = tokens[i + delta].content.match(newline);
					if(lines && lines.length > 1) {
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
						content: startToken.content
					}
				]
			};
		}
		
		const tableTokens = parse(flatten(tokens.slice(start, end + 1)));
		tableTokens.forEach((token, i) => {
			const args = token.match ? token.match.slice(1) : [];
			
			switch(token.name) {
				case 'TableRowStart': {
					x = 0;
					y++;
					
					while(table.cells[`${x}:${y}`]) {
						x++;
					}
					createCell();
					
					const [_, mergingLength] = args;
					mergeCell(mergingLength.length / 2 + 1);
					
					break;
				}
				
				case 'TableDivider': {
					while(table.cells[`${x}:${y}`]) {
						x++;
					}
					createCell();
					
					const [mergingLength] = args;
					mergeCell(mergingLength.length / 2);
					
					break;
				}
				
				case 'TableRowEnd': {
					const [mergingLength] = args;
					mergeCell(mergingLength.length / 2);
					
					break;
				}
				
				case 'TableColorDecoration': {
					const [color] = args;
					const cellId = createCell();
					table.cells[cellId].styles.bgcolor = color;
					break;
				}
				
				case 'TableDecoration': {
					const [isTable, key, value] = args;
					if(isTable) {
						table.styles[key] = value;
						break;
					}
					
					const cellId = createCell();
					table.cells[cellId].styles[key] = value;
					break;
				}
				
				case 'TableVAlignMerge': {
					const [alignValue, mergingLength] = args;
					const cellId = createCell();
					
					if(alignValue === '^')
						table.cells[cellId].align.top = true;
					
					else if(alignValue === 'v')
						table.cells[cellId].align.bottom = true;
					
					else {
						table.cells[cellId].align.top = true;
						table.cells[cellId].align.bottom = true;
					}
					
					mergeCell(parseInt(mergingLength), 1);
					break;
				}
				
				case 'TableHAlign': {
					const [alignValue] = args;
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
					const [mergingLength] = args;
					
					createCell();
					mergeCell(parseInt(mergingLength));
					break;
				}
				
				default: {
					const cellId = createCell();
					table.cells[cellId].children.push(token);
					break;
				}
			}
		});
		
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
		
		return {
			end: end,
			node: [
				{
					name: 'Table',
					children: [],
					table,
					content: tableTokens.map(v => v.content).join('')
				}
			]
		};
	}
	
	get inside() {
		return [
			'Escape', 'Footnote', 'Macro', 'Inline', 'Link', 'Brace',
			
			'TableRowStart', 'TableRowEnd', 'TableHAlign', 'TableHMerge',
			'TableVAlignMerge', 'TableDecoration', 'TableDivider', 'TableCaption'
		];
	}
	
	get tokens() {
		return ['TableRowStart', 'TableRowEnd'];
	}
}

module.exports = ProcessorTable;
