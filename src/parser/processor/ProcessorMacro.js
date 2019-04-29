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
		
		return {
			end: start,
			node: [
				{
					name: 'Macro',
					macro: {
						name: startToken.match[1],
						args: startToken.match[2]
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
