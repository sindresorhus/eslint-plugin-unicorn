'use strict';

module.exports = options => {
	const {name, length, allowSpreadElement} = {
		allowSpreadElement: false,
		...options
	};

	return [
		'CallExpression',
		'[callee.type="MemberExpression"]',
		'[callee.computed=false]',
		'[callee.property.type="Identifier"]',
		name ? `[callee.property.name="${name}"]` : '',
		`[arguments.length=${length}]`,
		...(
			allowSpreadElement ?
				[] :
				Array.from(
					{length},
					(_, index) => `[arguments.${index}.type!="SpreadElement"]`
				)
		)
	].join('');
};
