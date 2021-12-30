'use strict';
const {findVariable, getStaticValue} = require('eslint-utils');
const {methodCallSelector} = require('./selectors/index.js');
const {removeArgument} = require('./fix/index.js');
const getKeyName = require('./utils/get-key-name.js');

const MESSAGE_ID = 'prefer-json-parse-buffer';
const messages = {
	[MESSAGE_ID]: 'Prefer read JSON file as buffer.',
};

const jsonParseArgumentSelector = [
	methodCallSelector({
		object: 'JSON',
		method: 'parse',
		argumentsLength: 1,
	}),
	' > .arguments:first-child',
].join('');

const getAwaitExpressionArgument = node => {
	while (node && node.type === 'AwaitExpression') {
		node = node.argument;
	}

	return node;
};

function getIdentifierDeclaration(node, scope) {
	node = getAwaitExpressionArgument(node);

	if (!node || node.type !== 'Identifier') {
		return node;
	}

	const variable = findVariable(scope, node);
	if (!variable) {
		return;
	}

	const {identifiers, references} = variable;

	if (identifiers.length !== 1 || references.length !== 2) {
		return;
	}

	const [identifier] = identifiers;

	if (
		identifier.parent.type !== 'VariableDeclarator'
		|| identifier.parent.id !== identifier
	) {
		return;
	}

	return getIdentifierDeclaration(identifier.parent.init, scope);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[jsonParseArgumentSelector](node) {
		const scope = context.getScope();
		node = getIdentifierDeclaration(node, scope);
		if (
			!(
				node
					&& node.type === 'CallExpression'
					&& !node.optional
					&& node.arguments.length === 2
					&& !node.arguments.some(node => node.type === 'SpreadElement')
					&& node.callee.type === 'MemberExpression'
					&& !node.callee.optional
			)
		) {
			return;
		}

		const method = getKeyName(node.callee, scope);
		if (method !== 'readFile' && method !== 'readFileSync') {
			return;
		}

		const [, charset] = node.arguments;
		const staticValue = getStaticValue(charset, scope);
		if (!charset) {
			return;
		}

		let charsetValue = staticValue.value;
		if (typeof charsetValue !== 'string') {
			return;
		}

		charsetValue = charsetValue.toLowerCase();

		if (charsetValue !== 'utf8' && charsetValue !== 'utf-8') {
			return;
		}

		return {
			node: charset,
			messageId: MESSAGE_ID,
			fix: fixer => removeArgument(fixer, charset, context.getSourceCode()),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer read JSON file as buffer.',
		},
		fixable: 'code',
		messages,
	},
};
