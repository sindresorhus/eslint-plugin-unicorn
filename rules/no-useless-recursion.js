import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction} from './ast/index.js';

const MESSAGE_ID = 'no-useless-recursion';
const messages = {
	[MESSAGE_ID]: 'Use a loop instead of this recursive function call.',
};
const usingDeclarationKinds = new Set(['using', 'await using']);

const getFunctionNode = node => {
	for (; node; node = node.parent) {
		if (isFunction(node)) {
			return node;
		}
	}
};

const isSelfReference = (identifier, functionNode, sourceCode) => {
	const variable = findVariable(sourceCode.getScope(identifier), identifier);
	return variable?.identifiers.includes(functionNode.id);
};

const isInsideTryStatement = (node, functionNode) => {
	for (; node && node !== functionNode; node = node.parent) {
		if (node.type === 'TryStatement') {
			return true;
		}
	}

	return false;
};

const isUsingDeclaration = node => node?.type === 'VariableDeclaration' && usingDeclarationKinds.has(node.kind);

const hasUsingDeclarationInLoopHeader = node => {
	if (node.type === 'ForStatement') {
		return isUsingDeclaration(node.init);
	}

	return (
		node.type === 'ForOfStatement'
		&& isUsingDeclaration(node.left)
	);
};

const hasUsingDeclarationBefore = (node, functionNode) => {
	for (; node && node !== functionNode; node = node.parent) {
		if (hasUsingDeclarationInLoopHeader(node)) {
			return true;
		}

		if (node.parent?.type !== 'BlockStatement') {
			continue;
		}

		const nodeIndex = node.parent.body.indexOf(node);
		if (node.parent.body.slice(0, nodeIndex).some(statement => isUsingDeclaration(statement))) {
			return true;
		}
	}

	return false;
};

const isUselessRecursion = (returnStatement, sourceCode) => {
	const {argument} = returnStatement;
	if (
		argument?.type !== 'CallExpression'
		|| argument.optional
		|| argument.callee.type !== 'Identifier'
	) {
		return false;
	}

	const functionNode = getFunctionNode(returnStatement);
	return Boolean(
		functionNode?.id
		&& !functionNode.generator
		&& !isInsideTryStatement(returnStatement, functionNode)
		&& !hasUsingDeclarationBefore(returnStatement, functionNode)
		&& argument.callee.name === functionNode.id.name
		&& isSelfReference(argument.callee, functionNode, sourceCode),
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ReturnStatement', returnStatement => {
		if (!isUselessRecursion(returnStatement, sourceCode)) {
			return;
		}

		return {
			node: returnStatement.argument.callee,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow simple recursive function calls that can be replaced with a loop.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
