const ParagraphParser = require('./ParagraphParser');
const {parse} = require('./processor');

module.exports = (text, context, targetParagraph = '1', debug = false) => {
	let content = text;
	
	if(targetParagraph !== '*') {
		const paragraphs = ParagraphParser.parse(text);
		if(!paragraphs[targetParagraph]) {
			targetParagraph = '';
		}
		content = paragraphs[targetParagraph];
	}
	
	return parse(content, context, debug);
};
