module.exports = {
	token: undefined,
	hookUrl: 'https://namu.khinenw.tk/',
	failSticker: [
		"./resources/notfound0.webp",
		"./resources/notfound1.webp",
		"./resources/notfound2.webp"
	],
	userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36",
	url: "https://namu.wiki/w/",
	rawUrl: "https://namu.wiki/raw/",
	searchUrl: "https://namu.wiki/search/",
	completeUrl: "https://namu.wiki/complete/",
	inlineAmount: 5,
	commandAmount: 10,
	maxRedirection: 5,
	querySpeed: 2000,
	queryInterval: 100,
	requestInterval: 100,
	useMarkdown: true,
	remove: {
		bold: 'tag',
		italic: 'tag',
		underline: 'tag',
		striken: 'whole',

		superscript: 'whole',
		subscript: 'whole',

		html: 'whole',
		size: 'tag',
		color: 'tag',
		nomarkup: 'tag',

		attachment: 'replace',
		image: 'replace',
		namuimage: 'replace',

		hyperlink: 'replace|noparagraph', //(replace, former, latter, tag, whole)|(paragraph, noparagraph)

		quote: 'replace', //replace changes it to grave accent. Because there is no quote in telegram.
		line: 'replace',
		table: 'tag',
		include: 'whole',
		footnote: 'whole'
	},
	split: true
};
