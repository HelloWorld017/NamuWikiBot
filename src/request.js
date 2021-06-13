const axios = require('axios');
const config = require('../config/');
const https = require('https');

const apiUrl = 'https://api.telegram.org/bot' + config.token + '/';

const apiCall = async (target, data) => (await axios({
	method: 'POST',
	body: data,
	url: `${apiUrl}${target}`
})).data;

const ignoredApiCall = async (...args) => {
	try {
		return await apiCall(...args);
	} catch(err) {}
};

const namuApiCall = axios.create({
	httpsAgent: new https.Agent({ minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' }),
	headers: {
		'User-Agent': config.userAgent
	}
});

module.exports = { apiCall, ignoredApiCall, namuApiCall };
