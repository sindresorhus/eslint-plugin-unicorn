'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

function checkEscape(context, node, value) {
	const fixedValue = typeof value === 'string' ?
		value.replace(/(?<=(?:^|[^\\])(?:\\\\)*)\\x/g, '\\u00') :
		value;

	if (value !== fixedValue) {
		context.report({
			node,
			message: 'Use Unicode escapes instead of hexadecimal escapes.',
			fix: fixer => {
				let {range: [start, end], type, tail} = node;

				if (type === 'TemplateElement') {
					start += 1;
					end -= tail ? 1 : 2;
				}

				return fixer.replaceTextRange([start, end], fixedValue);
			}
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
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
