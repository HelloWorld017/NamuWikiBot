module.exports = (uri) => {
	return encodeURIComponent(uri).replace(/\(/g, '%28').replace(/\)/g, '%29');
};
