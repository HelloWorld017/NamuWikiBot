const Processor = require('./Processor');
class ProcessorLink extends Processor {
	constructor() {
		super('Link');
	}
	
	isStartOf(tokens, index) {
		return tokens[index].name === 'LinkOpen';
	}
	
	process(tokens, start, {parse, flatten}, {name}, debug=false) {
		const startToken = tokens[start];
		let end = null;
		let level = 1;
		
		for(let i = start + 1; i < tokens.length; i++) {
			if(tokens[i].name === 'LinkOpen') {
				level++;
			}
			
			if(tokens[i].name === 'LinkClose') {
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
		const linkDescriptor = {};
		
		let splitPoint = -1;
		let showText = '';
		let link = '';
		
		for(let i = 0; i < innerContent.length; i++) {
			if(innerContent[i] === '|' && innerContent[i - 1] !== '\\') {
				splitPoint = i;
				break;
			}
		}
		
		if(splitPoint !== -1) {
			link = innerContent.slice(0, splitPoint);
			showText = innerContent.slice(splitPoint + 1);
		} else {
			link = innerContent;
			showText = innerContent;
		}
		
		if(/^https?:\/\/|mailto:/.test(link)) {
			linkDescriptor.external = link;
		} else {
			if(link.startsWith('../')) {
				const rawLink = link.replace('../', '');
				const parentMatch = name.match(/^(.*)\//);
				if(parentMatch) link = parentMatch[1] + rawLink;
				else link = name + rawLink;
			} else if(link.startsWith('/')) {
				link = name + link;
			}
			
			const anchorMatch = link.match(/^(.*)#(.*)/);
			if(anchorMatch) {
				linkDescriptor.anchor = anchorMatch[2];
				link = anchorMatch[1];
			}
			
			linkDescriptor.internal = link;
		}
		
		return {
			end: end,
			node: [
				{
					name: 'Link',
					link: linkDescriptor,
					children: parse(showText),
					content: startToken.content + innerContent + tokens[end].content
				}
			]
		};
	}
	
	get inside() {
		return ['Escape', 'Footnote', 'Macro', 'Inline', 'Link', 'Brace'];
	}
	
	get tokens() {
		return ['LinkOpen', 'LinkClose'];
	}
}

module.exports = ProcessorLink;
