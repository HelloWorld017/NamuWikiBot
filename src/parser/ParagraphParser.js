const {match} = require('../Utils');

const ParagraphParser = {
	parse(text) {
		const paragraphLiterals = match(text, /^(=+)(#?)[ ]+([^=\r\n]+)[ ]+\2\1$/gm);
		const paragraphs = {};
		let lastIndex = 0;
		let lastLevel = -1;
		let hierachy = [];
		
		paragraphLiterals.forEach(matchResult => {
			const lastParagraph = text.slice(lastIndex, matchResult.index);
			const [level, isHidden, paragraphName] = matchResult;
			paragraphs[hierachy.join('')] = lastParagraph;
			
			if(level.length > lastLevel) {
				hierachy.push(1);
			} else if(level.length === lastLevel) {
				hierachy[hierachy.length - 1]++;
			} else {
				if(hierachy.length > 0) hierachy.pop();
			}
			
			lastIndex = matchResult.index;
			
			if(lastLevel < 0) {
				lastLevel = level.length - 1;
			}
		});
		
		paragraphs[hierachy.join('')] = text.slice(lastIndex);
		
		return paragraphs;
	}
};

module.exports = ParagraphParser;
