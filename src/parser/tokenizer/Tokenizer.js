class Tokenizer {
	constructor(name) {
		this.name = name;
	}

	tokenize(string) {
		return {
			token: null,
			length: 0
		};
	}
}

export default Tokenizer;
