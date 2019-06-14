'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const isMathPow = node => {
	const {callee} = node;
	return (
		callee.type === 'MemberExpression' &&
		callee.object.type === 'Identifier' &&
		callee.object.name === 'Math' &&
		callee.property.type === 'Identifier' &&
		callee.property.name === 'pow'
	);
};

const parseArgument = (source, arg) => {
	const text = source.getText(arg);

	switch (arg.type) {
		case 'Identifier':
			return arg.name;
		case 'Literal':
			return text;
		case 'CallExpression':
			return text;
		case 'UnaryExpression':
			return text;
		default:
			// Handle cases like Math.pow(2, 2-1);
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
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
