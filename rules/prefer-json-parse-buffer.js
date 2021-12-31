'use strict';
const {findVariable, getStaticValue} = require('eslint-utils');
const {methodCallSelector} = require('./selectors/index.js');
const {removeArgument} = require('./fix/index.js');
const getKeyName = require('./utils/get-key-name.js');

const MESSAGE_ID = 'prefer-json-parse-buffer';
const messages = {
	[MESSAGE_ID]: 'Prefer reading the JSON file as a buffer.',
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

	return getIdentifierDeclaration(identifier.parent.init, variable.scope);
}

const isStringUtf8Node = (node, scope) => {
	const staticValue = getStaticValue(node, scope);
	return staticValue && isStringUtf8(staticValue.value);
}

const isStringUtf8 = (value) => {
	if (typeof value !== 'string') {
		return false;
	}

	value = value.toLowerCase();

	return value === 'utf8' || value === 'utf-8';
}

function isUtf8Encoding(node, scope) {
	if (
		node.type === 'ObjectExpression'
		&& node.properties.length === 1
		&& node.properties[0].type === 'Property'
		&& getKeyName(node.properties[0], scope) === 'encoding'
		&& isStringUtf8Node(node.properties[0].value, scope)
	) {
		return true;
	}

	if (isStringUtf8Node(node, scope)) {
		return true;
	}

	const staticValue = getStaticValue(node, scope);
	if (!staticValue) {
		return false;
	}

	let value = staticValue.value;
	if (
		typeof value === 'object'
		&& Object.keys(value).length === 1
		&& isStringUtf8(value.encoding)
	) {
		return true;
	}

	return false;
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

		const [, charsetNode] = node.arguments;
		if (!isUtf8Encoding(charsetNode, scope)) {
			return;
		}

		return {
			node: charsetNode,
			messageId: MESSAGE_ID,
			fix: fixer => removeArgument(fixer, charsetNode, context.getSourceCode()),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer reading a JSON file as a buffer.',
		},
		fixable: 'code',
		messages,
	},
};
