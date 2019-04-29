const ParagraphParser = require('./ParagraphParser');
const {parse} = require('./processor');

module.exports = (text, context, targetParagraph = '1', debug = false) => {
	const paragraphs = ParagraphParser.parse(text);
	if(!paragraphs[targetParagraph]) {
		targetParagraph = '';
	}
	
	return parse(paragraphs[targetParagraph], context, debug);
};
