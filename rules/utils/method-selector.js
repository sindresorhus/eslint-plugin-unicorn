'use strict';

module.exports = options => {
	const {name, length, object} = {
		...options
	};

	const selector = [
		'CallExpression',
		'[callee.type="MemberExpression"]',
		'[callee.computed=false]',
		'[callee.property.type="Identifier"]'
	];

	if (name) {
		selector.push(`[callee.property.name="${name}"]`);
	}

	if (object) {
		selector.push('[callee.object.type="Identifier"]');
		selector.push(`[callee.object.name="${object}"]`);
	}

	if (typeof length === 'number') {
		selector.push(`[arguments.length=${length}]`);

		// Exclude arguments with `SpreadElement` type
		for (let index = 0; index < length; index += 1) {
			selector.push(`[arguments.${index}.type!="SpreadElement"]`);
		}
	} else if (typeof length === 'string') {
		selector.push(`[arguments.length${length}]`);
	} else if (Array.isArray(length)) {
		const [min, max] = length;
		selector.push(`[arguments.length>=${min}]`);
		selector.push(`[arguments.length<=${max}]`);

		// TODO: DRY this part
		// Exclude arguments with `SpreadElement` type
		for (let index = 0; index < max; index += 1) {
			selector.push(`[arguments.${index}.type!="SpreadElement"]`);
		}
	}

	return selector.join('');
};
