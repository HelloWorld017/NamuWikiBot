module.exports = (uri) => {
	return uri.replace(/\(/g, '%28').replace(/\)/g, '%29');
};
