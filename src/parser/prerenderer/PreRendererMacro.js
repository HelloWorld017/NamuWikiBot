const PreRenderer = require('./PreRenderer');

const {padn} = require('../../Utils');

class PreRendererMacro extends PreRenderer {
	constructor() {
		super('Macro');
		this.statistics = {};
	}
	
	prepareRender(macros, tokens) {
		let str = '';
		
		macros.forEach(v => {
			switch(v.name.toLowerCase()) {
				case 'datetime':
				case 'date':
					const date = new Date();
					const yyyy = date.getFullYear();
					const MM = padn(2, date.getMonth() + 1);
					const dd = padn(2, date.getDate());
					
					const HH = padn(2, date.getHours());
					const mm = padn(2, date.getMinutes());
					const dd = padn(2, date.getSeconds());
					
					str = `${yyyy}-${MM}-${dd} ${HH}:${mm}:${dd}`;
					break;
				
				case 'br':
					str = '\n';
					break;
				
				case 'pagecount':
					const [namespace] = v.args;
					break;
				
				case 'include':
					break;
				
				case '목차':
				case 'tableofcontents':
					break;
				
				case '각주':
				case 'footnote':
					break;
				
				case 'age':
					break;
				
				case 'dday':
					break;
				
				case 'ruby':
					break;
			}
		});
	}
	
	get tokens() {
		return ['Macro'];
	}
}
