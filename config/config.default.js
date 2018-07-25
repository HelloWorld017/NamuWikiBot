module.exports = {
	token: undefined,
	hookUrl: 'https://namu.khinenw.tk/',
	failSticker: [
		"AAQFABPA2r0yAAQ83MiKrz-riLwdAAIC",
		"AAQFABPW5b0yAAT1FavQm3UInFMEAAIC",
		"CAADBQADMAADUZLAVkoN4oAcmBapAg"
	],
	userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36",
	url: "https://namu.wiki/w/",
	rawUrl: "https://namu.wiki/raw/",
	searchUrl: "https://namu.wiki/search/",
	completeUrl: "https://namu.wiki/complete/",
	inlineAmount: 1,
	branchAmount: 8, //namugazi
	commandAmount: 10,
	maxRedirection: 5,
	gcInterval: 60000,
	requestInterval: 100,
	overviewLength: 1024,
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

		line: 'replace',
		youtube: 'replace',
		quote: 'replace', //replace changes it to grave accent. Because there is no quote in telegram.
		table: 'tag',
		include: 'whole',
		toc: 'replace',
		footnote_macro: 'replace',
		age: 'replace',
		date: 'replace',
		pagecount: 'replace',
		footnote: 'whole',

		finalizer: true
	}
};
