module.exports = (uri) => encodeURIComponent(uri).replace(/\(/g, '%28').replace(/\)/g, '%29');
