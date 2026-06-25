import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isFunction} from './ast/index.js';
import {
	getConstVariableInitializer,
	isPromiseType,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-async-promise-finally';
const messages = {
	[MESSAGE_ID]: 'Do not pass an async function to `Promise#finally()`.',
};

const isAsyncNonGeneratorFunction = node =>
	isFunction(node)
	&& node.async
	&& !node.generator;

function isPromiseObject(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		return isPromiseType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
		);
	} catch {
		// TypeScript can throw while resolving incomplete projects; keep this rule best-effort.
	}
}

function isAsyncFunctionDeclarationReference(node, context) {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (variable?.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;
	return definition.type === 'FunctionName'
		&& isAsyncNonGeneratorFunction(definition.node);
}

function isAsyncFinallyCallback(node, context) {
	node = unwrapTypeScriptExpression(node);

	if (isAsyncNonGeneratorFunction(node)) {
		return true;
	}

	const initializer = getConstVariableInitializer(node, context);
	if (initializer && isAsyncNonGeneratorFunction(unwrapTypeScriptExpression(initializer))) {
		return true;
	}

	return isAsyncFunctionDeclarationReference(node, context);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		const {callee} = callExpression;
		if (callee.type !== 'MemberExpression') {
			return;
		}

		const method = getPropertyName(callee, context.sourceCode.getScope(callExpression));
		if (method !== 'finally') {
			return;
		}

		const promiseObject = isPromiseObject(callee.object, context);
		if (promiseObject === false) {
			return;
		}

		const [callback] = callExpression.arguments;
		if (!callback || !isAsyncFinallyCallback(callback, context)) {
			return;
		}

		return {
			node: callback,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow async functions as `Promise#finally()` callbacks.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
