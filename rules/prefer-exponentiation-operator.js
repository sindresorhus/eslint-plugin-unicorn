'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isObjectMethod = require('./utils/is-object-method');

const isMathPow = node => isObjectMethod(node, 'Math', 'pow');

const parseArgument = (source, argument) => {
	const text = source.getText(argument);

	switch (argument.type) {
		case 'Identifier':
			return argument.name;
		case 'Literal':
			return text;
		case 'CallExpression':
			return text;
		default:
			// Handle cases like Math.pow(-0, 2-1);
			return `(${text})`;
	}
};

const fix = (context, node, fixer) => {
	const source = context.getSourceCode();
	const comments = source.getCommentsInside(node);

	if (comments && comments.length > 0) {
		return;
	}

	const base = parseArgument(source, node.arguments[0]);
	const exponent = parseArgument(source, node.arguments[1]);

	const replacement = `${base} ** ${exponent}`;

	return fixer.replaceText(node, replacement);
};

const create = context => {
	return {
		CallExpression(node) {
			if (isMathPow(node)) {
				context.report({
					node,
					message: 'Prefer the exponentiation operator over `Math.pow()`.',
					fix: fixer => fix(context, node, fixer)
				});
			}
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
	},
	deprecated: true,
	replacedBy: [
		'prefer-exponentiation-operator'
	]
};
