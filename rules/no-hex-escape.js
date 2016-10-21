'use strict';
const hexRE = /\\x[a-fA-F0-9]{2}/;

function checkEscape(context, node, value) {
	const fixedValue = hexRE.test(value) ? value.replace(/\\x/g, '\\u00') : value;

	if (value !== fixedValue) {
		context.report({
			node,
			message: 'Use unicode escape codes instead of hexadecimal escapes.',
			fix: fixer => fixer.replaceText(node, fixedValue)
		});
	}
}

const create = context => {
	return {
		Literal: node => {
			checkEscape(context, node, node.raw);
		},
		TemplateElement: node => {
			checkEscape(context, node, node.value.raw);
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
