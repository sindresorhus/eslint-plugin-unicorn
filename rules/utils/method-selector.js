'use strict';

module.exports = (method, argumentsLength) => [
	'CallExpression',
	'[callee.type="MemberExpression"]',
	`[callee.property.name="${method}"]`,
	`[arguments.length=${argumentsLength}]`,
	...Array.from(
		{length: argumentsLength},
		(_, index) => `[arguments.${index}.type!="SpreadElement"]`
	)
].join('');
