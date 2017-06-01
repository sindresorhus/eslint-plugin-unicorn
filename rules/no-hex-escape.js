/* eslint-disable unicorn/no-hex-escape */
'use strict';

const create = context => {
	const checkEscape = (node, value) => {
		const fixedValue = typeof value === 'string' ? value.replace(/\\x/g, '\\u00') : value;

		if (value !== fixedValue) {
			context.report({
				node,
				message: 'Use unicode escapes instead of hexadecimal escapes.',
				fix: fixer => fixer.replaceTextRange([node.start, node.end], fixedValue)
			});
		}
	};

	return {
		Literal: node => checkEscape(node, node.raw),
		TemplateElement: node => checkEscape(node, node.value.raw)
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
