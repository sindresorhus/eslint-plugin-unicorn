import {isPromiseType} from './utils/index.js';

const MESSAGE_ID_ASYNC_DISPOSE = 'no-invalid-well-known-symbol-methods/async-dispose';
const MESSAGE_ID_DISPOSE_GENERATOR = 'no-invalid-well-known-symbol-methods/dispose-generator';
const MESSAGE_ID_SYNC_ITERATOR = 'no-invalid-well-known-symbol-methods/sync-iterator';
const MESSAGE_ID_ASYNC_ITERATOR = 'no-invalid-well-known-symbol-methods/async-iterator';
const MESSAGE_ID_SUGGESTION = 'no-invalid-well-known-symbol-methods/suggestion';

const messages = {
	[MESSAGE_ID_ASYNC_DISPOSE]: '`Symbol.dispose` must not return a Promise. Use `Symbol.asyncDispose` instead.',
	[MESSAGE_ID_DISPOSE_GENERATOR]: '`Symbol.dispose` must not be a generator. Use a normal method for synchronous disposal or `Symbol.asyncDispose` for asynchronous disposal.',
	[MESSAGE_ID_SYNC_ITERATOR]: '`Symbol.iterator` must return a sync iterator. Use `Symbol.asyncIterator` for async iterators.',
	[MESSAGE_ID_ASYNC_ITERATOR]: '`Symbol.asyncIterator` must return an async iterator directly. Use an async generator or return the iterator synchronously.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Symbol.{{replacement}}` instead.',
};

const promiseTypeNames = new Set(['Promise', 'PromiseLike']);
const checkedSymbolNames = new Set(['dispose', 'iterator', 'asyncIterator']);

function getWellKnownSymbolName(member) {
	if (
		!member.computed
		|| member.key.type !== 'MemberExpression'
		|| member.key.computed
		|| member.key.object.type !== 'Identifier'
		|| member.key.object.name !== 'Symbol'
		|| member.key.property.type !== 'Identifier'
	) {
		return;
	}

	return member.key.property.name;
}

function getFunctionNode(member) {
	if (member.kind === 'get' || member.kind === 'set') {
		return;
	}

	if (
		member.type === 'MethodDefinition'
		|| member.type === 'PropertyDefinition'
	) {
		return member.value;
	}

	if (member.type === 'Property') {
		return member.value;
	}
}

function isFunctionNode(node) {
	return node?.type === 'FunctionExpression' || node?.type === 'ArrowFunctionExpression';
}

function isPromiseTypeReference(node) {
	return (
		node.type === 'TSTypeReference'
		&& node.typeName.type === 'Identifier'
		&& promiseTypeNames.has(node.typeName.name)
	);
}

function hasPromiseReturnTypeAnnotation(functionNode) {
	const typeNode = functionNode.returnType?.typeAnnotation;
	if (!typeNode) {
		return false;
	}

	if (typeNode.type === 'TSTypeReference') {
		return isPromiseTypeReference(typeNode);
	}

	if (typeNode.type === 'TSUnionType') {
		return typeNode.types.some(typeNode => isPromiseTypeReference(typeNode));
	}

	return false;
}

function hasPromiseReturnTypeInformation(functionNode, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const typeScriptNode = parserServices.esTreeNodeToTSNodeMap.get(functionNode);
		const signature = checker.getSignatureFromDeclaration(typeScriptNode);
		if (signature) {
			return isPromiseType(checker.getReturnTypeOfSignature(signature), checker) === true;
		}

		const type = parserServices.getTypeAtLocation(functionNode);
		return type.getCallSignatures().some(signature =>
			isPromiseType(checker.getReturnTypeOfSignature(signature), checker) === true,
		);
	} catch {
		return false;
	}
}

const hasPromiseReturnType = (functionNode, context) =>
	hasPromiseReturnTypeAnnotation(functionNode)
	|| hasPromiseReturnTypeInformation(functionNode, context);

function getReplacementSuggestion(member, replacement) {
	return {
		messageId: MESSAGE_ID_SUGGESTION,
		data: {replacement},
		fix: fixer => fixer.replaceText(member.key.property, replacement),
	};
}

function getProblem(member, context) {
	const symbolName = getWellKnownSymbolName(member);
	if (!checkedSymbolNames.has(symbolName)) {
		return;
	}

	const functionNode = getFunctionNode(member);
	if (!isFunctionNode(functionNode)) {
		return;
	}

	if (
		symbolName === 'dispose'
		&& functionNode.generator
	) {
		return {
			node: member.key,
			messageId: MESSAGE_ID_DISPOSE_GENERATOR,
		};
	}

	const returnsPromise = !functionNode.async && hasPromiseReturnType(functionNode, context);

	if (
		symbolName === 'dispose'
		&& (functionNode.async || returnsPromise)
	) {
		return {
			node: member.key,
			messageId: MESSAGE_ID_ASYNC_DISPOSE,
			fix: fixer => fixer.replaceText(member.key.property, 'asyncDispose'),
		};
	}

	if (
		symbolName === 'iterator'
		&& (functionNode.async || returnsPromise)
	) {
		const problem = {
			node: member.key,
			messageId: MESSAGE_ID_SYNC_ITERATOR,
		};

		if (functionNode.generator) {
			problem.suggest = [
				getReplacementSuggestion(member, 'asyncIterator'),
			];
		}

		return problem;
	}

	if (
		symbolName === 'asyncIterator'
		&& !functionNode.generator
		&& (functionNode.async || returnsPromise)
	) {
		return {
			node: member.key,
			messageId: MESSAGE_ID_ASYNC_ITERATOR,
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MethodDefinition', node => getProblem(node, context));
	context.on('Property', node => getProblem(node, context));
	context.on('PropertyDefinition', node => getProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow invalid implementations of well-known symbol methods.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
