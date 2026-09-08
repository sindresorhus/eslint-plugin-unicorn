import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isFunction} from './ast/index.js';
import {getConstVariableInitializer, isPromiseType} from './utils/index.js';
import {isIteratorExpression, unwrapExpression} from './shared/iterator-helpers.js';

const MESSAGE_ID = 'no-async-iterator-callback';
const messages = {
	[MESSAGE_ID]: 'Do not pass an asynchronous callback to `Iterator#{{method}}()`; returned promises are not awaited.',
};
const methods = new Set(['filter', 'forEach', 'some', 'every', 'find', 'flatMap']);

function getDirectConstInitializer(node, context) {
	const initializer = getConstVariableInitializer(node, context);
	return initializer?.parent.id.type === 'Identifier' ? unwrapExpression(initializer) : undefined;
}

const isAsyncFunction = node => isFunction(node) && node.async && !node.generator;

function isAsyncCallback(node, context) {
	node = unwrapExpression(node);
	if (isAsyncFunction(node)) {
		return true;
	}

	const initializer = getDirectConstInitializer(node, context);
	if (initializer && isAsyncFunction(initializer)) {
		return true;
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (variable?.defs.length !== 1 || variable.references.some(reference => reference.isWrite())) {
		return false;
	}

	const [definition] = variable.defs;
	return definition.type === 'FunctionName' && isAsyncFunction(definition.node);
}

function hasPromiseReturnType(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const type = parserServices.getTypeAtLocation(unwrapExpression(node));
		return type.getCallSignatures().some(signature => {
			const returnType = checker.getReturnTypeOfSignature(signature);
			const types = returnType.isUnion() ? returnType.types : [returnType];
			return types.some(type => isPromiseType(type, checker) === true);
		});
	} catch {
		// Type information can be unavailable in incomplete projects; retain syntax-based detection.
		return false;
	}
}

function isIteratorReceiver(node, context) {
	node = unwrapExpression(node);
	if (isIteratorExpression(node, context)) {
		return true;
	}

	const initializer = getDirectConstInitializer(node, context);
	return initializer ? isIteratorExpression(initializer, context) : false;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		const {callee} = node;
		const [callback] = node.arguments;
		if (callee.type !== 'MemberExpression' || !callback || callback.type === 'SpreadElement') {
			return;
		}

		const method = getPropertyName(callee, context.sourceCode.getScope(node));
		if (
			!methods.has(method)
			|| !isIteratorReceiver(callee.object, context)
			|| !(isAsyncCallback(callback, context) || hasPromiseReturnType(callback, context))
		) {
			return;
		}

		return {
			node: callback,
			messageId: MESSAGE_ID,
			data: {method},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow asynchronous callbacks in synchronous iterator helpers.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
