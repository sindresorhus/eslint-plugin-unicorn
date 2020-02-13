'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const replaceTemplateElement = require('./utils/replace-template-element');

function checkEscape(context, node, value) {
	const fixedValue = value.replace(/(?<=(?:^|[^\\])(?:\\\\)*\\)x/g, 'u00');

	if (value !== fixedValue) {
		context.report({
			node,
			message: 'Use Unicode escapes instead of hexadecimal escapes.',
			fix: fixer =>
				node.type === 'TemplateElement' ?
					replaceTemplateElement(fixer, node, fixedValue) :
					fixer.replaceText(node, fixedValue)
		});
	}
}

const create = context => {
	return {
		Literal: node => {
			if (node.regex || typeof node.value === 'string') {
				checkEscape(context, node, node.raw);
			}
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
