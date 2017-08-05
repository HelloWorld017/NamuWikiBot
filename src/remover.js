"use strict";
const LT = `\u{E2E2}NW_BOT_LT_MARK\u{EE22}`;
const GT = `\u{E2E2}NW_BOT_RT_MARK\u{EE22}`;
const AMP = `\u{E2E2}NW_BOT_AMP_MARK\u{EE22}`;
const QUOT = `\u{E2E2}NW_BOT_QUOT_MARK\u{EE22}`;

const replaceMap = (text, map) => {
	Object.keys(map).forEach((k) => {
		text = text.split(k).join(map[k]);
	});

	return text;
};

const escapeHTML = (text) => replaceMap(text, {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;'
});

const escapeNW = (text) => replaceMap(text, {
	'&': AMP,
	'<': LT,
	'>': GT,
	'"': QUOT
});

const unescapeNWMap = {};
unescapeNWMap[AMP] = '&';
unescapeNWMap[LT] = '<';
unescapeNWMap[GT] = '>';
unescapeNWMap[QUOT] = '"';

const unescapeNW = (text) => replaceMap(text, unescapeNWMap);

const fixedURIencode = require('./encoder');

class Remover{
	constructor(){

	}

	async remove(){
		throw new Error("Undefined method called!");
	}
}
//attachment:주소 형식의 이미지 제거
class AttachmentRemover extends Remover{
	constructor(){
		super();
		this.regex = /^attachment[ ]*:[ ]*(.*\..*)$/mg;
	}

	async remove(type, text){
		switch(type){
			case 'replace':
				text = text.replace(this.regex, (match, p1) => {
					return escapeNW(`<a href="https://attach.namu.wiki/${fixedURIencode(p1)}">이미지</a>`);
				});
				break;

			case 'tag':
				text = text.replace(this.regex, (match, p1) => fixedURIencode(p1));
				break;

			case 'whole':
				text = text.replace(this.regex, '');
				break;
		}

		return text;
	}
}

class BraceRemover extends Remover{
	constructor(tag){
		super();
		this.tag = tag;
	}

	async remove(type, text){
		switch(type){
			case 'tag':
				return text.replace(new RegExp("{{{" + this.tag, 'g'), '').replace(/}}}/g, '');

			case 'whole':
				return text.replace(new RegExp("{{{" + this.tag + "[^]*?}}}", 'g'), '');
		}

		return text;
	}
}

class FootnoteRemover extends Remover{
	constructor(){
		super();
		this.regex = /\[\*[^ ]*[ ]*(.+?)[^\]][\]]{1}(?!\]+)/g;
	}

	async remove(type, text){
		switch(type){
			case 'tag':
				return escapeNW(text.replace(this.regex, (match, p1) => escapeHTML(p1)));

			case 'whole':
				return text.replace(this.regex, '');
		}

		return text;
	}
}

class HyperlinkRemover extends Remover{
	constructor(){
		super();
		this.regex = /\[\[([^\[\]\|]*?)(?:\|([^\[\]]*?))?\]\]/g;
	}

	async remove(param, text, ctx) {
		const links = [];
		const split = param.split("|");
		const type = split[0];
		const paragraph = split[1];

		if(paragraph === 'noparagraph') {
			const regex = /\[\[(#s-\d+(?:\.\d+)*)(?:\|(.*))?\]\]/g;
			switch(type) {
				case 'whole':
					text = text.replace(regex, '');
					break;

				case 'replace':
					text = text.replace(regex, (match, p1, p2) => {
						if(!p2) p2 = '§';

						return escapeNW(`<a href="https://namu.wiki/w/${fixedURIencode(ctx)}$1">${escapeHTML(p2)}</a>`);
					});
					break;

				case 'latter':
					text = text.replace(regex, '$2');
					break;
			}
		}

		switch(type){
			case 'whole':
				text = text.replace(/\[\[[^\[\]]*\]\]/g, '');
				break;

			case 'replace':
				text = text.replace(this.regex, (match, p1, p2) => {
					if(p1.startsWith(':파일:')) p1 = p1.replace(':파일:', 'https://namu.wiki/file/');

					const anchorSplit = p1.split('#');
					const url = anchorSplit[0];
					const anchor = escapeHTML(anchorSplit[1] ? `#${anchorSplit[1]}` : '');

					const isExternal = /^(http|https):\/\/[^]+/.test(p1);

					if(!p2){
						if(!isExternal) {
							links.push(url);
							return escapeNW(
								`<a href="https://namu.wiki/w/${fixedURIencode(url)}${anchor}">` +
									escapeHTML(url) +
								`</a>`
							);
						}

						return escapeNW(`<a href="${escapeHTML(url)}${anchor}">외부링크</a>`);
					}

					if(!isExternal) {
						links.push(url);
						return escapeNW(
							`<a href="https://namu.wiki/w/${fixedURIencode(url)}${anchor}">` +
								escapeHTML(`${p2}(${p1})`) +
							`</a>`
						);
					}

					return escapeNW(`<a href="${escapeHTML(p1)}">${escapeHTML(p2)}</a>`);
				});
				break;

			case 'former':
				text = text.replace(this.regex, (match, p1) => {
					if(p1.startsWith(':파일:')) p1 = p1.replace(':파일:', 'https://namu.wiki/file/');
					return p1;
				});
				break;

			case 'latter':
				text = text.replace(this.regex, (match, p1, p2) => {
					if(!p2){
						if(p1.startsWith(':파일:')) p1 = p1.replace(':파일:', 'https://namu.wiki/file/');
						return p1;
					}
					return p2;
				});
				break;

			case 'tag':
				text = text.replace(/\[\[/g, '').replace(/\]\]/g, '');
				break;
		}

		return {text, links};
	}
}

//링크만 있는 이미지 제거
class ImageRemover extends Remover{
	constructor(){
		super();
		this.regex = /((https|http)?:\/\/[^ ]+\.(jpg|jpeg|png|gif))(?:\?([^ ]+))?/ig;
	}

	async remove(type, text){
		 switch(type){
			 case 'whole': return text.replace(this.regex, '');
			 case 'replace': return text.replace(this.regex, (match, p1) => {
				 return escapeNW(`<a href="${fixedURIencode(p1)}">이미지</a>`);
			 });
		 }

		 return text;
	}
}

class IncludeRemover extends Remover{
	constructor(){
		super();
	}

	async remove(type, text){
		if(type === "whole")
			return text.replace(/include\[\(.*\)\]/ig, '').replace(/include\(.*\)/ig, '');

		return text;
	}
}

class LineBreakRemover extends Remover{
	constructor(){
		super();
	}

	async remove(type, text){
		switch(type){
			case "whole": return text.replace(/\[br\]/g, '');
			case "replace": return text.replace(/\[br\]/g, '\n');
		}

		return text;
	}
}

class MultipleDefinitionRemover extends Remover{
	constructor(){
		super();
		this.removers = arguments;
	}

	async remove(type, text){
		for(let remover of this.removers) {
			text = await remover.remove(type, text);
		}

		return text;
	}
}

//[[파일:이미지]] 형식의 이미지 제거
class NamuImageRemover extends Remover{
	constructor(){
		super();
		this.regex = /\[\[파일:([^\[\]]*?)\]\]/g;
	}

	async remove(type, text){
		switch(type){
			case 'whole':
				return text = text.replace(this.regex, '');

			case 'replace':
				return text = text.replace(this.regex, (match, p1) => {
					return escapeNW(`<a href="https://namu.wiki/file/${fixedURIencode(p1)}">이미지</a>`);
				});
		}

		return text;
	}
}

class QuoteRemover extends Remover{
	constructor(){
		super();
	}

	async remove(type, text, cb){
		switch(type){
			case 'replace':
				return text.replace(/^>(.*)$/gm, (match, p1) => escapeNW(`<code>${escapeHTML(p1)}</code>`));

			case 'tag':
				return text.replace(/^>/gm, '');

			case 'whole':
				return text.replace(/^>.*$/gm, '');
		}

		return text;
	}
}

class SimpleTagRemover extends Remover{
	constructor(tag, polyfill){
		super();
		this.tag = tag;
		this.polyfill = polyfill;
	}

	async remove(type, text) {
		switch(type){
			case 'replace':
				return text.replace(new RegExp("(" + this.tag + ")", 'ig'), this.polyfill);

			case 'tag':
				return text.replace(new RegExp(this.tag, 'g'), '');

			case 'whole':
				return text.replace(new RegExp(this.tag + ".*?" + this.tag, 'g'), '');
		}

		return text;
	}
}

class SimpleTagHTMLRemover extends Remover {
	constructor(tag, htmlTagName) {
		super();
		this.tag = tag;
		this.html = htmlTagName;
	}

	async remove(type, text) {
		switch(type) {
			case 'replace':
				/*
					1. Template is escaped. ([lt]b[gt]$1[lt]/b[gt])
					2. Replaced ([lt]b[gt]blah<>blah[lt]/b[gt])
					3. HTML chars are escaped. ([lt]b[gt]blah&lt;&gt;blah[lt]/b[gt]) (by Finalizer)
					4. NW chars are unescaped.(<b>blah&lt;&gt;blah</b>) (by Finalizer)
				*/
				return text.replace(
					new RegExp(this.tag + '([^]*?)' + this.tag, 'ig'),
					(match, p1) => {
						return escapeNW(`<${this.html}>${escapeHTML(p1)}</${this.html}>`);
					}
				);

			case 'tag':
				return text.replace(new RegExp(this.tag, 'g'), '');

			case 'whole':
				return text.replace(new RegExp(this.tag + ".*?" + this.tag, 'g'), '');
		}

		return text;
	}
}

class TableRemover extends Remover{
	constructor(){
		super();
	}

	async remove(type, text){
		switch(type){
			case 'tag':
				text = text
					.replace(/<#[a-fA-F0-9]{3,6}?>/g, '') //<#000000> 꼴 제거
					.replace(/\|\|/g, '') // || 제거
					.replace(/<\|[0-9]+>/g, '') //<|숫자> 꼴 제거
					.replace(/<-[0-9]+>/g, '') //<-숫자> 꼴 제거
					.replace(/<table.*?=.*?>/g, '') //<table???=???> 꼴 제거
					.replace(/<v\|[0-9]+>/g, '') //<v|숫자>
					.replace(/<\)>/g, '') //<)> 제거
					.replace(/<\(>/g, '') //<(> 제거
					.replace(/<:>/g, '') //<:> 제거
					.replace(/<(bgcolor|rowbgcolor|width|height)=.*?>/g, '') //<???=???> 꼴 제거
					.replace(/\|.*?\|/g, ''); //캡션
		}

		return text;
	}
}

class YoutubeRemover extends Remover {
	constructor() {
		super();
		this.regex = /\[youtube\(([a-zA-Z0-9]+)(?:,.*)*\)\]/gi;
	}

	async remove(type, text) {
		switch(type) {
			case 'whole':
				return text.replace(this.regex, '');

			case 'replace':
				return text.replace(
					this.regex,
					(match, p1) => escapeNW(`<a href="https://youtube.com/watch?v=${p1}">동영상</a>`)
				);
		}

		return text;
	}
}

class Finalizer extends Remover {
	constructor() {
		super();
	}

	async remove(type, text) {
		if(type)
			text = unescapeNW(escapeHTML(text));

		return text;
	}
}

module.exports = {
	bold: new SimpleTagHTMLRemover("'''", 'b'),
	italic: new SimpleTagHTMLRemover("''", 'i'),
	underline: new SimpleTagRemover("__"),
	striken: new MultipleDefinitionRemover(new SimpleTagRemover("--", "~~"), new SimpleTagRemover("~~", "~~")),

	superscript: new SimpleTagRemover("\\^\\^"),
	subscript: new SimpleTagRemover(",,"),

	html: new BraceRemover("#!html"),
	size: new BraceRemover("\\+[0-5]"),
	color: new BraceRemover("#[a-zA-Z0-9]+"),
	nomarkup: new BraceRemover(""),

	attachment: new AttachmentRemover(),
	image: new ImageRemover(),
	namuimage: new NamuImageRemover(),

	hyperlink: new HyperlinkRemover(),

	quote: new QuoteRemover(),
	line: new SimpleTagRemover("\\[br\\]", "\n"),
	youtube: new YoutubeRemover(),
	table: new TableRemover(),
	include: new IncludeRemover(),
	footnote: new FootnoteRemover(),
	finalizer: new Finalizer()
};
