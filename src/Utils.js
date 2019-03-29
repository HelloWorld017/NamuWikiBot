const Utils = {
	fixedURIencode: (uri) => encodeURIComponent(uri).replace(/\(/g, '%28').replace(/\)/g, '%29')
};

module.exports = Utils;
