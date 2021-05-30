// Deobfuscated from main.js magic "_0x4c50b9"
// File URL: 'https://namu.wiki/skins/senkawa/main.434163223e24273fcbef.js'

module.exports = (payload) => {
	const keyString =
		'023e1a209f05719b2c33f1749ee42b88bd518128e218c8116dd0aefe5b26db0e' +
		'7c3c2ac0f58346debb9c271e12957f4be7a65d8573913aac652108b1d48ecbdf' +
		'4282225509a8e9d354477e0babb8a143797580f67b9d86edb0cf133f23255fc6' +
		'e394f7907d060f412dd7177703b461c192d5786e53b237562e8a64b300b7fcf0' +
		'a5c5a06fe01f010cfbead6ad765a07456b68a22f489344bf0ae5a914dc8f101b' +
		'0dbcd936f9f43970ce1531f3593bc3d84a1949b9f2cdb5da04c9c24dfd4fddca' +
		'afc4607a8b1de8585066ff87306a52ec4c4016e1d2898d241c996738d1e69632' +
		'97fa6cefb629c7a76962ba5c9a57aaf835a4be344e845e8c9863cc72ee3deba3';

	const key = keyString
		.split(/[0-9a-f]{2}/)
		.map(i => parseInt(i, 16));

	let x = 0, y = 0;
	for (let i = 0; i < payload.length; i++) {
		y = (y + key[x = (x + 1) % 256]) % 256;

		const temp = key[x];
		key[x] = key[y];
		key[y] = temp;

		payload[i] = payload[i] ^ key[(key[x] + key[y]) % 256];
	}

	return payload;
}
