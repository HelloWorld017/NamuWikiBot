"use strict";
var async = require('async');

class Remover{
	constructor(){

	}

	remove(type, text, cb){
		cb(new Error("Undefined method called!"));
	}
}

class AnnotationRemover extends Remover{
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

class AttatchmentRemover extends Remover{
	constructor(){
		super();
	}

	remove(type, text, cb){
		switch(type){
			case 'tag':
				text = text.replace(/attatchment:[ ]*/g, '');
				break;

			case 'whole':
				text = text.replace(/^attatchment:.*$/mg, '');
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
				text = text.replace(new RegExp("\{\{\{" + this.tag, 'g'), '').replace(/\}\}\}/g, '');
				break;

			case 'whole':
				text = text.replace(new RegExp("\{\{\{" + this.tag + ".*\}\}\}", 'g'), '');
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

		if(type === 'whole') return text.replace(/\[\[[^\[\]]*\]\]/g, '');
		if(paragraph === 'noparagraph') text = text.replace(/\[\[#s-\d(\.\d)*(?:\|.*)?\]\]/g, '');

		switch(type){
			case 'replace':
				text = text.replace(this.regex, function(match, p1, p2){
					if(!p2){
						if(p1.startsWith(':파일:')) p1 = p1.replace(':파일:', '');
						return p1;
					}
					return p2 + '(' + p1 + ')';
				});

			case 'former':
				text = text.replace(this.regex, function(match, p1){
					if(p1.startsWith(':파일:')) p1 = p1.replace(':파일:', '');
					return p1;
				});
				break;

			case 'latter':
				text = text.replace(this.regex, function(match, p1, p2){
					if(!p2){
						if(p1.startsWith(':파일:')) p1 = p1.replace(':파일:', '');
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
	}

	remove(type, text, cb){
		 cb((type === 'whole') ? text.replace(/((https|http)?:\/\/[^ ]+\.(jpg|jpeg|png|gif))(?:\?([^ ]+))?/ig, '') : text);
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
	}

	remove(type, text, cb){
		cb((type === 'whole') ? text.replace(/\[\[파일:.*\]\]/g, '') : text);
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
				text = text.replace(new RegExp(this.tag + ".*" + this.tag, 'g'), '');
				break;
		}

		cb(text);
	}
}

module.exports = {
	bold: new SimpleTagRemover("'''", "**"),
	italic: new SimpleTagRemover("''", "*"),
	underline: new SimpleTagRemover("__"),
	striken: new MultipleDefinitionRemover(new SimpleTagRemover("--", "~~"), new SimpleTagRemover("~~", "~~")),

	superscript: new SimpleTagRemover("^^"),
	subscript: new SimpleTagRemover(",,"),

	nomarkup: new BraceRemover(""),
	html: new BraceRemover("#!html"),
	size: new BraceRemover("\\+[0-5]"),
	color: new BraceRemover("#[a-zA-Z0-9]+"),

	image: new ImageRemover(),
	namuimage: new NamuImageRemover(),

	hyperlink: new HyperlinkRemover(),

	quote: new QuoteRemover(),
	line: new SimpleTagRemover("\\[br\\]", "\n"),
	table: new SimpleTagRemover("\\|\\|"),
	annotation: new AnnotationRemover()
};
