var async = require('async');
var chalk = require('chalk');
var request = require('request');
var util = require('util');

var telegram = require('./telegram-bot');
var remover = require('./remover.js');
var config = require('./config/');

var api = new telegram({
	token: config.token,
	updates: {
		enabled: true
	}
});

var namuwikiReqIds = [];

api.on('message', function(message){
	var chatId = message.chat.id;
	var from = message.from.id;
	if(typeof message.text !== 'string') return;

	if(message.text.startsWith('/nw')){
		if(namuwikiReqIds[from] !== undefined){
			if(namuwikiReqIds[from].date < Date.now()){
				namuwikiReqIds[from].count = 0;
				namuwikiReqIds[from].date = Date.now() + 60000;
			}
			
			if(namuwikiReqIds[from].count >= 5){
				api.sendMessage({
					chat_id: chatId,
					text: "조금 있다가 해보세요!\n(현재 60초에 명령어 5개로 제한하고 있습니다.)\n나무위키 본관측에 많은 트래픽이 가는 것을 방지하기 위한 조치이니 협조해주시면 감사하겠습니다!"
				});
				return;
			}
			
			namuwikiReqIds[from].count++;
		}else{
			namuwikiReqIds[from] = {
				count: 0,
				date: Date.now() + 60000
			};
		}
		
		var url = message.text.replace(/^\/nw(?:@[a-zA-Z0-9]*)?[ ]*/, '');
		if(url === ''){
			api.sendMessage({
				chat_id: chatId,
				text: '사용법: /nw [검색할 무언가]\n개발자: @Khinenw\n사용한 이미지: 무냐 by eb\n세피로트 by SMINORFF_KAMCHATKA\n사용된 이미지는 모두 CC-BY-NC-SA 2.0 조건 하에 배포되고 있습니다.',
			});
			return;
		}

		getNamuwiki(chatId, url, function(err, url, overview){
			if(err){
				if(err === 404){
					api.sendSticker({
						chat_id: chatId,
						sticker: config.failSticker[Math.floor(Math.random() * config.failSticker.length)]
					});
					return;
				}

				if(err === 503){
					api.sendMessage({
						chat_id: chatId,
						text: "현재 Cloudflare DDoS 프로텍션 때문에 문서에 접근이 불가합니다."
					});
					return;
				}
				return;
			}

			var text = "";
			if(config.useMarkdown){
				text = '**' + url + '**\n' + overview + '\n[자세히보기](' + config.url + encodeURIComponent(url) + ')';
			}else{
				text = url + '\n' + overview + '\n' + config.url + encodeURIComponent(url);
			}

			if(config.split && text.length > 4000){
				// 2048 쪼개서 보낸다. 쪼갤 경우 마크다운 오류가 발생하기 쉬우므로 그냥 보낸다.
				if(config.useMarkdown) text = url + '\n' + overview + '\n' + config.url + encodeURIComponent(url);

				async.eachSeries(text.match(/[^]{1,4000}/g), function(v, cb){
					api.sendMessage({
						chat_id: chatId,
						text: v
					}, function(err, data){
						if(err){
							log({
								'Time': (new Date()).toUTCString(),
								'Error 1': util.inspect(err),
								'URL': url
							}, chatId);
						}

						cb();
					});
				});

				return;
			}

			api.sendMessage({
				chat_id: chatId,
				text: text,
				parse_mode: 'Markdown'
			}, function(err, data){
				if(err){
					// 에러가 마크다운에 의해 발생했을 경우, 마크다운 없이 보내본다.
					if(config.useMarkdown) text = url + '\n' + overview + '\n' + config.url + encodeURIComponent(url);
					api.sendMessage({
						chat_id: chatId,
						text: text
					}, function(err2, data2){
						if(err2){
							// 마크다운 오류도 아니므로 오류 메시지와 함께 처리
							log({
								'Time': (new Date()).toUTCString(),
								'Error 1': util.inspect(err),
								'Error 2': util.inspect(err2),
								'URL': url
							}, chatId);
						}
					});
				}
			});
		});
	}
});

function log(logContents, chatId){
	api.sendMessage({
		chat_id: chatId,
		text: "요청을 처리하는 도중 서버측에서 오류가 발생했습니다! :(\n@Khinenw 에게 제보하여주시면 감사하겠습니다!"
	});

	console.log(chalk.bgRed("=======Starting error report======="));
	async.forEachOfSeries(logContents, function(v, k, cb){
		console.log(chalk.yellow(k + " : " + v));
		cb();
	}, function(){
		console.log(chalk.bgRed("========End of error report========"));
	});
}

function getNamuwiki(chatId, url, callback, redirectionCount){
	if(redirectionCount === undefined) redirectionCount = 0;
	if(redirectionCount > config.maxRedirection){
		callback(new Error("Too many redirections!"));
	}

	request({
		'method': 'get',
		headers: {
			'User-Agent': config.userAgent
		},
		url: config.rawUrl + encodeURIComponent(url)
	}, function(err, response, body){
		if(!err && response.statusCode === 200){
			console.log(chalk.cyan(response.statusCode + ': ' + url));

			if(body.includes('#redirect ')){
				var redirectionTarget = body.match(/^#redirect .*$/m)[0].replace('#redirect ', '');
				getNamuwiki(chatId, redirectionTarget, callback, redirectionCount + 1);
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
			console.log(chalk.yellow(response.statusCode + ': ' + url));
			callback(response.statusCode);
			return;
		}
	});
}
