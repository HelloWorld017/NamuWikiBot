"use strict";
var async = require('async');
var fixedURIencode = require('./encoder');

class Remover{
	constructor(){

	}

	remove(type, text, cb){
		cb(new Error("Undefined method called!"));
	}
}
//attachment:주소 형식의 이미지 제거
class AttachmentRemover extends Remover{
	constructor(){
		super();
		this.regex = /^attachment[ ]*:[ ]*(.*\..*)$/mg;
	}

	remove(type, text, cb){
		switch(type){
			case 'replace':
				text = text.replace(this.regex, (match, p1) => {
					return '[이미지](https://attach.namu.wiki/' + fixedURIencode(p1) + ')';
				});
				break;

			case 'tag':
				text = text.replace(this.regex, '$1');
				break;

			case 'whole':
				text = text.replace(this.regex, '');
				break;
		}

		cb(text);
	}
}

class BraceRemover extends Remover{
	constructor(tag){
		super();
		this.tag = tag;
	}

	remove(type, text, cb){
		switch(type){
			case 'tag':
				text = text.replace(new RegExp("{{{" + this.tag, 'g'), '').replace(/}}}/g, '');
				break;

			case 'whole':
				text = text.replace(new RegExp("{{{" + this.tag + "[^]*?}}}", 'g'), '');
				break;
		}

		cb(text);
	}
}

class FootnoteRemover extends Remover{
	constructor(){
		super();
		this.regex = /\[\*[^ ]*[ ]*(.+?)[^\]][\]]{1}(?!\]+)/g;
	}

	remove(type, text, cb){
		switch(type){
			case 'tag':
				text = text.replace(this.regex, '$1');
				break;

			case 'whole':
				text = text.replace(this.regex, '');
				break;
		}

		cb(text);
	}
}

class HyperlinkRemover extends Remover{
	constructor(){
		super();
		this.regex = /\[\[([^\[\]\|]*)(?:\|([^\[\]]*))?\]\]/g;
	}

	remove(param, text, cb){
		var split = param.split("|");
		var type = split[0];
		var paragraph = split[1];

		if(paragraph === 'noparagraph') text = text.replace(/\[\[#s-\d(\.\d)*(?:\|.*)?\]\]/g, '');

		if(p1.startsWith(':파일:')) p1 = p1.replace(':파일:', 'https://namu.wiki/file/');
		switch(type){
			case 'whole':
				cb(text.replace(/\[\[[^\[\]]*\]\]/g, ''));
				return;

			case 'replace':
				text = text.replace(this.regex, function(match, p1, p2){
					if(!p2){
						return p1;
					}

					if(!/^(http|https):\/\/[^]+/.match(text){
						return p2 + "(" + p1 + ")";
					}

					return '[' + p2 + ']' + '(' + fixedURIencode(p1) + ')';
				});

			case 'former':
				text = text.replace(this.regex, function(match, p1){
					return p1;
				});
				break;

			case 'latter':
				text = text.replace(this.regex, function(match, p1, p2){
					if(!p2){
						return p1;
					}
					return p2;
				});
				break;

			case 'tag':
				text = text.replace(/\[\[/g, '').replace(/\]\]/g, '');
				break;
		}

		cb(text);
	}
}

//링크만 있는 이미지 제거
class ImageRemover extends Remover{
	constructor(){
		super();
		this.regex = /((https|http)?:\/\/[^ ]+\.(jpg|jpeg|png|gif))(?:\?([^ ]+))?/ig;
	}

	remove(type, text, cb){
		 switch(type){
			 case 'whole': text = text.replace(this.regex, ''); break;
			 case 'replace': text = text.replace(this.regex, (match, p1) => {
				 return '[이미지](' + fixedURIencode(p1) + ')';
			 }); break;
		 }

		 cb(text);
	}
}

class IncludeRemover extends Remover{
	constructor(){
		super();
	}

	remove(type, text, cb){
		if(type === "whole"){
			text = text.replace(/include\[\(.*\)\]/ig, '').replace(/include\(.*\)/ig, '');
		}

		cb(text);
	}
}

class LineBreakRemover extends Remover{
	constructor(){
		super();
	}

	remove(type, text, cb){
		switch(type){
			case "whole": text = text.replace(/\[br\]/g, ''); break;
			case "replace": text = text.replace(/\[br\]/g, '\n'); break;
		}

		cb(text);
	}
}

class MultipleDefinitionRemover extends Remover{
	constructor(){
		super();
		this.removers = arguments;
	}

	remove(type, text, cb){
		async.each(this.removers, function(v, callback){
			v.remove(type, text, function(res){
				text = res;
				callback();
			});
		}, function(){
			cb(text)
		});
	}
}

//[[파일:이미지]] 형식의 이미지 제거
class NamuImageRemover extends Remover{
	constructor(){
		super();
		this.regex = /\[\[파일:([^\[\]]*?)\]\]/g;
	}

	remove(type, text, cb, query){
		switch(type){
			case 'whole':
				text = text.replace(this.regex, '');
				break;

			case 'replace':
				text = text.replace(this.regex, (match, p1) => {
					return '[이미지](https://namu.wiki/file/' + fixedURIencode(p1) + ')';
				});
				break;
		}

		cb(text);
	}
}

class QuoteRemover extends Remover{
	constructor(){
		super();
	}

	remove(type, text, cb){
		switch(type){
			case 'replace':
				text = text.replace(/^>(.*)$/gm, '` $1`');
				break;

			case 'tag':
				text = text.replace(/^>/gm, '');
				break;

			case 'whole':
				text = text.replace(/^>.*$/gm, '');
				break;
		}

		cb(text);
	}
}

class SimpleTagRemover extends Remover{
	constructor(tag, polyfill){
		super();
		this.tag = tag;
		this.polyfill = polyfill;
	}

	remove(type, text, cb){
		switch(type){
			case 'replace':
				text = text.replace(new RegExp("(" + this.tag + ")", 'ig'), this.polyfill);
				break;

			case 'tag':
				text = text.replace(new RegExp(this.tag, 'g'), '');
				break;

			case 'whole':
				text = text.replace(new RegExp(this.tag + ".*?" + this.tag, 'g'), '');
				break;
		}

		cb(text);
	}
}

class TableRemover extends Remover{
	constructor(){
		super();
	}

	remove(type, text, cb){
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

		cb(text);
	}
}

module.exports = {
	bold: new SimpleTagRemover("'''", "**"),
	italic: new SimpleTagRemover("''", "*"),
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
	table: new TableRemover(),
	include: new IncludeRemover(),
	footnote: new FootnoteRemover()
};
