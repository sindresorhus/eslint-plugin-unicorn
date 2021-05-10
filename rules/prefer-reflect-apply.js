'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isLiteralValue = require('./utils/is-literal-value');
const getPropertyName = require('./utils/get-property-name');

const MESSAGE_ID = 'prefer-reflect-apply';
const messages = {
	[MESSAGE_ID]: 'Prefer `Reflect.apply()` over `Function#apply()`.'
};

const isApplySignature = (argument1, argument2) => (
	(
		// eslint-disable-next-line unicorn/no-null
		isLiteralValue(argument1, null) ||
		argument1.type === 'ThisExpression'
	) &&
	(
		argument2.type === 'ArrayExpression' ||
		(argument2.type === 'Identifier' && argument2.name === 'arguments')
	)
);

const getReflectApplyCall = (sourceCode, target, receiver, argumentsList) => (
	`Reflect.apply(${sourceCode.getText(target)}, ${sourceCode.getText(receiver)}, ${sourceCode.getText(argumentsList)})`
);

const fixDirectApplyCall = (node, sourceCode) => {
	if (
		getPropertyName(node.callee) === 'apply' &&
		node.arguments.length === 2 &&
		isApplySignature(node.arguments[0], node.arguments[1])
	) {
		return fixer => (
			fixer.replaceText(
				node,
				getReflectApplyCall(sourceCode, node.callee.object, node.arguments[0], node.arguments[1])
			)
		);
	}
};

const fixFunctionPrototypeCall = (node, sourceCode) => {
	if (
		getPropertyName(node.callee) === 'call' &&
		getPropertyName(node.callee.object) === 'apply' &&
		getPropertyName(node.callee.object.object) === 'prototype' &&
		node.callee.object.object.object &&
		node.callee.object.object.object.type === 'Identifier' &&
		node.callee.object.object.object.name === 'Function' &&
		node.arguments.length === 3 &&
		isApplySignature(node.arguments[1], node.arguments[2])
	) {
		return fixer => (
			fixer.replaceText(
				node,
				getReflectApplyCall(sourceCode, node.arguments[0], node.arguments[1], node.arguments[2])
			)
		);
	}
};

const create = context => {
	return {
		CallExpression: node => {
			if (
				!(
					node.callee.type === 'MemberExpression' &&
					!['Literal', 'ArrayExpression', 'ObjectExpression'].includes(node.callee.object.type)
				)
			) {
				return;
			}

			const sourceCode = context.getSourceCode();
			const fix = fixDirectApplyCall(node, sourceCode) || fixFunctionPrototypeCall(node, sourceCode);
			if (fix) {
				context.report({
					node,
					messageId: MESSAGE_ID,
					fix
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
			description: 'Prefer `Reflect.apply()` over `Function#apply()`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema: [],
		messages
	}
};
