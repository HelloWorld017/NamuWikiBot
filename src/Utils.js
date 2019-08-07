const Utils = {
	fixedURIencode: (uri) => encodeURIComponent(uri).replace(/\(/g, '%28').replace(/\)/g, '%29'),
	match: (str, regex) => {
		const result = [];
		while ((match = regex.exec(str)) !== null) {
			result.push(match);
		}
		
		return result;
	},
	padn: (str, n, letter = '0') => letter.repeat(Math.max(0, n - str.length)) + str
};

module.exports = Utils;
