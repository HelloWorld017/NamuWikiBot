class Processor {
	constructor(name) {
		this.name = name;
	}

	isStartOf(tokens, index) {
		return false;
	}

	process(tokens, start, processors, debug=false) {
		return {
			end: 0,
			node: [null]
		};
	}
	
	get tokens() {
		return [];
	}
	
	get inside() {
		return [];
	}
}

module.exports = Processor;
