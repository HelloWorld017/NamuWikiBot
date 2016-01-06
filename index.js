var async = require('async');
var telegram = require('./telegram-bot');
var remover = require('./remover.js');
var request = require('request');
var config = require('./config/');

var api = new telegram({
	token: config.token,
	updates: {
		enabled: true
	}
});

api.on('message', function(message){
	var chatId = message.chat.id;
	if(typeof message.text !== 'string') return;

	if(message.text.startsWith('/nw')){
		var url = message.text.replace(/^\/nw(?:[@]*[a-zA-Z0-9]*)[ ]*/, '');
		if(url === ''){
			api.sendMessage({
				chat_id: chatId,
				text: '사용법: /nw [검색할 무언가]\n개발자: @Khinenw\n사용한 이미지: 무냐 by eb\n세피로트 by SMINORFF_KAMCHATKA\n사용된 이미지는 모두 CC-BY-NC-SA 2.0 조건 하에 배포되고 있습니다.',
			});
			return;
		}

		getNamuwiki(url, function(err, url, overview){
			if(err){
				api.sendSticker({
					chat_id: chatId,
					sticker: config.failSticker[Math.floor(Math.random() * config.failSticker.length)];
				});
				return;
			}

			var text = "";
			if(config.useMarkdown){
				text = '**' + url + '**\n' + overview + '\n[자세히보기](' + config.url + encodeURIComponent(url) + ')';
			}else{
				text = url + '\n' + overview + '\n' + config.url + encodeURIComponent(url);
			}

			text.match(/.{1,500}/g).forEach(function(v){
				api.sendMessage({
					chat_id: chatId,
					text: text,
					parse_mode: 'Markdown'
				}, function(err, data){
					if(err){
						api.sendMessage({
							chat_id: chatId,
							text: text
						}, function(err2, data2){
							api.sendMessage({
								chat_id: chatId,
								text: "요청을 처리하는 도중 서버측에서 오류가 발생했습니다!:(\n@Khinenw 에게 제보하여주시면 감사하겠습니다!"
							});

							console.log("=======Starting error report=======");
							console.log("Time : " + (new Date()).toUTCString());
							console.log("Error 1 : " + err);
							console.log("Error 2 : " + err);
							console.log("URL : " + url);
							console.log("========End of error report========");
						});
					}
				});
			});
		});
	}
});

function getNamuwiki(url, callback, redirectionCount){
	if(redirectionCount === undefined) redirectionCount = 0;
	if(redirectionCount > config.maxRedirection){
		callback(new Error("Too many redirections!"));
	}

	request.get({
		headers: {
			'User-Agent': config.userAgent
		},
		url: config.rawUrl + encodeURIComponent(url)
	}, function(err, response, body){
		console.log(response.statusCode + ': ' + url);
		if(!err && response.statusCode === 200){
			if(body.includes('#redirect ')){
				var redirectionTarget = body.match(/^#redirect .*$/m)[0].replace('#redirect ', '');
				getNamuwiki(redirectionTarget, callback, redirectionCount + 1);
				return;
			}

			var split = body.split(/^[=]+ .* [=]+$/gm);
			var overview = "";

			if(split.length <= 1){
				overview = split[0];
			}else{
				overview = split[1];
			}

			async.forEachOfSeries(config.remove, function(v, k, cb){
				remover[k].remove(v, overview, function(returnVal){
					overview = returnVal;
					cb();
				});
			}, function(){
				callback(undefined, url, overview);
			});
		}else{
			callback(new Error(response.statusCode));
		}
	});
}
