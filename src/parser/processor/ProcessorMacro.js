const Processor = require('./Processor');
class ProcessorMacro extends Processor {
	constructor() {
		super('Macro');
	}
	
	isStartOf(tokens, index) {
		return tokens[index].name === 'Macro';
	}
	
	process(tokens, start, {parse, flatten}, {name}, debug=false) {
		const startToken = tokens[start];
		const argsRaw = startToken.match[2];
		const argsSplit = argsRaw.split(/(?<!\\)(?:\\\\)*,/g);
		let args = [];
		let kwargs = {};
		
		argsSplit.reduce((isKwArgs, curr, index) => {
			if(isKwArgs === null) return null;
			
			const kwMatch = curr.match(/([^=]*)=(.*)/);
			if(isKwArgs) {
				if(!kwMatch) {
					args = [argsRaw];
					kwargs = {};
					return null;
				}
			} else {
				if(index > 1 && kwMatch) isKwArgs = true;
			}
			
			if(isKwArgs) {
				kwargs[kwMatch[1]] = kwMatch[2];
			} else {
				args.push(curr);
			}
		}, false);
		
		return {
			end: start,
			node: [
				{
					name: 'Macro',
					macro: {
						name: startToken.match[1],
						args,
						kwargs
					},
					content: startToken.content
				}
			]
		};
	}
	
	get inside() {
		return [];
	}
	
	get tokens() {
		return ['Macro'];
	}
}

module.exports = ProcessorMacro;
