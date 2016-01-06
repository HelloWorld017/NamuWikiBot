module.exports = {
	token: undefined,
	failSticker: [
		"./notfound0.webp",
		"./notfound1.webp",
		"./notfound2.webp"
	],
	userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36",
	url: "https://namu.wiki/w/",
	rawUrl: "https://namu.wiki/raw/",
	maxRedirection: 5,
	useMarkdown: true,
	remove: {
		bold: 'tag',
		italic: 'tag',
		underline: 'tag',
		striken: 'whole',

		superscript: 'whole',
		subscript: 'whole',

		nomarkup: 'tag',
		size: 'tag',
		color: 'tag',
		html: 'whole',

		attachment: 'whole',
		image: 'as-is',
		namuimage: 'replace',

		hyperlink: 'latter|noparagraph', //(replace, former, latter, tag, whole)|(paragraph, noparagraph)

		quote: 'replace', //replace changes it to grave accent. Because there is no quote in telegram.
		line: 'replace',
		table: 'whole',
		annotation: 'whole'
	},
	split: false
};
