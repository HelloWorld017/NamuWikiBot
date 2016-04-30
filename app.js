var bodyParser = require('body-parser');
var express = require('express');
var logger = require('morgan');
var process = require('process');
var index = require('./routes/index');

var app = express();

if((process.env.NODE_ENV || 'development') === 'development') app.use(logger('dev'));
app.use(bodyParser.text());

app.use('/', index(global.config.token));
app.use((req, res, next) => {
	res.redirect('https://telegram.me/namuwikiBot');
});

module.exports = app;
