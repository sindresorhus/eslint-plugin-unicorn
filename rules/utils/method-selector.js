'use strict';

module.exports = options => {
	const {name, length} = {
		...options
	};

	const checkLength = typeof length === 'number';

	return [
		'CallExpression',
		'[callee.type="MemberExpression"]',
		'[callee.computed=false]',
		'[callee.property.type="Identifier"]',
		name ? `[callee.property.name="${name}"]` : '',
		checkLength ? `[arguments.length=${length}]` : '',
		...(
			!checkLength || length === 0 ?
				[] :
				Array.from(
					{length},
					(_, index) => `[arguments.${index}.type!="SpreadElement"]`
				)
		)
	].join('');
};
