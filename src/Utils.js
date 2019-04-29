const Utils = {
	fixedURIencode: (uri) => encodeURIComponent(uri).replace(/\(/g, '%28').replace(/\)/g, '%29'),
	match: (str, regex) => {
		const result = [];
		while ((match = regex.exec(str)) !== null) {
			result.push(match);
		}
		
		return result;
	}
};

module.exports = Utils;
