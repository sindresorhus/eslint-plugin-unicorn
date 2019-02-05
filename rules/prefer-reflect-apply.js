'use strict';
const astUtils = require('eslint-ast-utils');
const getDocsUrl = require('./utils/get-docs-url');

const isApplySignature = (argument1, argument2) => (
	argument1.type === 'Literal' &&
	argument1.raw === 'null' &&
	argument2.type === 'ArrayExpression'
);

const getReflectApplyCall = (sourceCode, func, args) => (
	`Reflect.apply(${sourceCode.getText(func)}, null, ${sourceCode.getText(args)})`
);

const fixDirectApplyCall = (node, sourceCode) => {
	if (
		astUtils.getPropertyName(node.callee) === 'apply' &&
		node.arguments.length === 2 &&
		isApplySignature(node.arguments[0], node.arguments[1])
	) {
		return fixer => (
			fixer.replaceTextRange(
				[node.start, node.end],
				getReflectApplyCall(sourceCode, node.callee.object, node.arguments[1])
			)
		);
	}

	return null;
};

const fixFunctionPrototypeCall = (node, sourceCode) => {
	if (
		astUtils.getPropertyName(node.callee) === 'call' &&
		sourceCode.getText(node.callee.object) === 'Function.prototype.apply' &&
		node.arguments.length === 3 &&
		isApplySignature(node.arguments[1], node.arguments[2])
	) {
		return fixer => (
			fixer.replaceTextRange(
				[node.start, node.end],
				getReflectApplyCall(sourceCode, node.arguments[0], node.arguments[2])
			)
		);
	}

	return null;
};

const create = context => {
	return {
		CallExpression: node => {
			if (
				node.callee.type === 'MemberExpression' &&
				!['Literal', 'ArrayExpression', 'ObjectExpression'].includes(node.callee.object.type)
			) {
				const sourceCode = context.getSourceCode();
				const fix = fixDirectApplyCall(node, sourceCode) || fixFunctionPrototypeCall(node, sourceCode);
				if (fix) {
					context.report({
						node,
						message: 'Prefer Reflect.apply over Function.prototype.apply.',
						fix
					});
				}
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
