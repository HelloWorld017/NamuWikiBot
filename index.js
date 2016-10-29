var async = require('async');
var cheerio = require('cheerio');
var chalk = require('chalk');
var crypto = require('crypto');
var http = require('http');
var process = require('process');
var request = require('request');
var util = require('util');
var telegram = require('telegram-bot-api');

var uriencoder = require('./encoder');
var fixedURIencode = function(uri){
	return uriencoder(encodeURIComponent(uri));
};

var remover = require('./remover');
var config = require('./config/');

var api = new telegram({
	token: config.token,
	updates: {
		enabled: false
	}
});

global.api = api;
global.config = config;
var app = require('./app');

var namuwikiReqIds = [];
var inlineSession = {};
var inlineResults = [];
var lastRequest = 0;
var inlineId = 0;
var searchSelector = 'article.wiki-article section a:not(.page-link)';
var handleMessage = function(from, chatId, message){
	if(message.text.startsWith('/nw')){
		if(attempt(from, chatId)){
			api.sendMessage({
				chat_id: chatId,
				text: "조금 있다가 해보세요!\n(현재 60초에 명령어 " + config.commandAmount + "개로 제한하고 있습니다.)\n나무위키 본관측에 많은 트래픽이 가는 것을 방지하기 위한 조치이니 협조해주시면 감사하겠습니다!"
			}).catch(() => {});
		}

		var url = message.text.replace(/^\/nw(?:@[a-zA-Z0-9]*)?[ ]*/, '');
		if(url === ''){
			api.sendMessage({
				chat_id: chatId,
				text: '사용법: /nw [검색할 무언가]\n혹은 @namuwikiBot [검색할 무언가] 입력 후 기다리기\n\n개발자: @Khinenw\n사용한 이미지: 무냐 by eb\n세피로트 by SMINORFF_KAMCHATKA\n사용된 이미지는 모두 CC-BY-NC-SA 2.0 조건 하에 배포되고 있습니다.'
			}).catch(() => {});
			return;
		}

		var _url = url;
		getNamuwiki(url, function(err, url, overview){
			if(err){
				if(err === 404){
					request({
						method: 'get',
						headers: {
							'User-Agent': config.userAgent
						},
						url: config.searchUrl + fixedURIencode(_url)
					}, (err, response, body) => {
						if(!err && response.statusCode === 200){
							var $ = cheerio.load(body);
							var hrefs = $(searchSelector);
							var results = [];

							Array.apply(null, Array(config.inlineAmount)).map((v, k) => {return k;}).forEach((i) => {
								if(hrefs.length > i){
									var url = decodeURIComponent($(hrefs.get(i)).attr('href').replace('/w/', ''));
									var hash = crypto.createHash('md5').update(chatId + ':' + url).digest('hex');
									inlineResults[hash] = {
										url: '/nw ' + url,
										to: chatId,
										expires: Date.now() + 120 * 1000
									};

									results.push([{
										text: url,
										callback_data: hash
									}]);
								}
							});

							api.sendSticker({
								chat_id: chatId,
								sticker: config.failSticker[Math.floor(Math.random() * config.failSticker.length)],
								reply_markup: JSON.stringify({
									inline_keyboard: results
								})
							}).catch(() => {});
						}
					});
					return;
				}

				if(err === 503){
					api.sendMessage({
						chat_id: chatId,
						text: "현재 Cloudflare DDoS 프로텍션 때문에 문서에 접근이 불가합니다."
					}).catch(() => {});
					//TODO add bypassing sucuri ddos protection
					return;
				}
				return;
			}

			var text = "";
			if(config.useMarkdown){
				text = '**' + url + '**\n' + overview + '\n[자세히보기](' + config.url + fixedURIencode(url) + ')';
			}else{
				text = url + '\n' + overview + '\n' + config.url + fixedURIencode(url);
			}

			if(config.split && text.length > 4000){
				async.eachSeries(text.match(/[^]{1,4000}/g), function(v, cb){
					sendMarkdown(chatId, v, cb);
				});

				return;
			}

			sendMarkdown(chatId, text);
		});
	}
};

api.on('message', function(message){
	var chatId = message.chat.id;
	var from = message.from.id;
	if(typeof message.text !== 'string') return;

	handleMessage(from, chatId, message);
});

api.on('inline.callback.query', (query) => {
	var queryData = inlineResults[query.data];

	if(queryData === undefined){
		api.sendMessage({
			chat_id: query.from,
			text: '쿼리가 만료되었습니다! /nw@namuwikiBot 명령어를 다시 입력해주세요!'
		}).catch(() => {});
		return;
	}

	handleMessage(query.from, queryData.to, queryData.url);
});

api.on('inline.query', (query) => {
	if(inlineSession[query.from.id] === undefined){
		inlineSession[query.from.id] = [];
	}

	inlineSession[query.from.id] = {
		query: query,
		time: Date.now() + config.querySpeed
	};
});

setInterval(() => {
	async.forEachOfSeries(inlineSession, (v, k, asyncCallback) => {
		if(v.done) return;
		if(Date.now() < v.time) return;

		inlineSession[k].done = true;

		var query = v.query;
		if(attempt(query.from.id)) return;

		request({
			method: 'get',
			headers: {
				'User-Agent': config.userAgent
			},
			url: config.searchUrl + fixedURIencode(query.query)
		}, (err, response, body) => {
			if(!err && response.statusCode === 200){
				var $ = cheerio.load(body);
				var hrefs = $(searchSelector);
				var results = [];

				async.eachSeries(Array.apply(null, Array(config.inlineAmount)).map((v, k) => {return k;}), (i, cb) => {
					if(hrefs.length > i){
						getNamuwiki(decodeURIComponent($(hrefs.get(i)).attr('href').replace('/w/', '')), (err, url, overview) => {
							if(err){
								return;
							}

							results.push({
								type: 'article',
								id: (++inlineId) + '',
								title: url,
								message_text: '**' + url + '**\n' + overview + '\n[자세히보기](' + config.url + fixedURIencode(url) + ')',
								//parse_mode: 'Markdown',
								url: config.url + fixedURIencode(url)
							});
							cb();
						}, 0, true);
					}
				}, () => {
					api.answerInlineQuery({
						inline_query_id: query.id,
						results: results
					}, (err, res) => {
						if(err){
							console.log(chalk.bgRed(util.inspect(err)));
							return;
						}
						asyncCallback();
					});
				});
			}
		});
	});

}, config.queryInterval);

setInterval(() => {
	Object.keys(inlineResults).forEach((k) => {
		if(inlineResults[k].expires < Date.now()){
			inlineResults[k] = undefined;
			delete inlineResults[k];
		}
	});
}, 60000);

function log(logContents, chatId){
	api.sendMessage({
		chat_id: chatId,
		text: "요청을 처리하는 도중 서버측에서 오류가 발생했습니다! :(\n@Khinenw 에게 제보하여주시면 감사하겠습니다!"
	}).catch(() => {});

	console.log(chalk.bgRed("=======Starting error report======="));
	async.forEachOfSeries(logContents, function(v, k, cb){
		console.log(chalk.yellow(k + " : " + v));
		cb();
	}, function(){
		console.log(chalk.bgRed("========End of error report========"));
	});
}

function attempt(from){
	if(namuwikiReqIds[from] !== undefined){
		if(namuwikiReqIds[from].date < Date.now()){
			namuwikiReqIds[from].count = 0;
			namuwikiReqIds[from].date = Date.now() + 60000;
		}

		if(namuwikiReqIds[from].count >= config.commandAmount){
			return true;
		}

		namuwikiReqIds[from].count++;
	}else{
		namuwikiReqIds[from] = {
			count: 0,
			date: Date.now() + 60000
		};
	}

	return false;
}

function sendMarkdown(chatId, v, cb){
	cb = cb || () => {};

	api.sendMessage({
		chat_id: chatId,
		text: v,
		parse_mode: 'Markdown'
	}, function(err, data){
		if(err){
			api.sendMessage({
				chat_id: chatId,
				text: v
			}, (err, data) => {
				if(err){
					log({
						'Time': (new Date()).toUTCString(),
						'Error 1': util.inspect(err)/*,
						'URL': url*/					}, chatId);
				}

				cb();
			});
			return;
		}

		cb();
	});
}

function getNamuwiki(url, callback, redirectionCount, waited){
	if(!waited && lastRequest + config.requestInterval > Date.now()){
		setTimeout(() => {
			getNamuwiki(url, callback, redirectionCount, true);
		}, config.requestInterval);
		return;
	}

	lastRequest = Date.now();

	if(redirectionCount > config.maxRedirection){
		callback(new Error("Too many redirections!"));
	}

	request({
		method: 'get',
		headers: {
			'User-Agent': config.userAgent
		},
		url: config.rawUrl + fixedURIencode(url)
	}, function(err, response, body){
		if(!err && response.statusCode === 200){
			console.log(chalk.cyan(response.statusCode + ': ' + url));

			if(body.includes('#redirect ')){
				var redirectionTarget = body.match(/^\s*#redirect\s+(.*)\s*$/m);
				if(redirectionTarget && redirectionTarget[1]){
					getNamuwiki(redirectionTarget[1], callback, redirectionCount + 1, true);
					return;
				}
			}

			var split = body.split(/^\s*[=]+ .* [=]+\s*$/gm);
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
			if(err){
				console.error(chalk.bgRed(err.toString()));
				callback(500);
				return;
			}
			console.log(chalk.yellow(response.statusCode + ': ' + url));
			callback(response.statusCode);
			return;
		}
	});
}

var port = ((val) => {
	var portNumber = parseInt(val, 10);

	if(isNaN(portNumber)){
		return val;
	}

	if(portNumber >= 0){
		return portNumber;
	}

	return false;
})(process.env.PORT || '443');

var useCert = (process.env.CERT === 'true');

app.set('port', port);

var options;

if(useCert){
	options = {
		key: fs.readFileSync('/cert/key.pem'),
		crt: fs.readFileSync('/cert/crt.pem')
	};
}

if(useCert) var httpServer = http.createServer(options, app);
else var httpServer = http.createServer(app);

httpServer.listen(port);
httpServer.on('error', (err) => {
	if(err.syscall !== 'listen') throw err;
	var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

	switch(err.code){
		case 'EACCES':
			console.error('Permission Denied!');
			process.exit(1);
			return;

		case 'EADDRINUSE':
			console.error('Address in use!');
			process.exit(1);
			return;
	}

	throw error;
});

httpServer.on('listening', () => {
	var addr = httpServer.address();
	console.log((typeof addr === 'string') ? 'Pipe ' + addr : 'Listening on port ' + addr.port);
});

if(!useCert){
	var _baseurl = 'https://api.telegram.org/bot' + config.token + '/';

	request({
		method: 'POST',
		json: true,
		formData: {
			url: config.hookUrl + config.token
		},
		url: _baseurl + 'setWebhook'
	});
}else api.setWebhook(config.hookUrl + config.token, options.crt);
