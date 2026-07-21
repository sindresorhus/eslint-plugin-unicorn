import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getConstVariableInitializer,
	hasOptionalChainElement,
	isKnownNonString,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-string-trim';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#{{replacement}}()` before `String#{{method}}()`.',
};

const methods = ['startsWith', 'endsWith'];
const getReplacement = method => method === 'startsWith' ? 'trimStart' : 'trimEnd';

const stringifiableSearchValueTypes = new Set([
	'bigint',
	'boolean',
	'number',
	'string',
	'undefined',
]);

const knownNonStringExpressionTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'ObjectExpression',
]);

const isImportedZodNamespace = (node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), node);

	return variable?.defs.some(definition => {
		if (definition.type !== 'ImportBinding' || definition.parent.source.value !== 'zod') {
			return false;
		}

		return definition.node.type === 'ImportNamespaceSpecifier'
			|| (
				definition.node.type === 'ImportSpecifier'
				&& definition.node.imported.name === 'z'
			);
	}) ?? false;
};

const isZodStringCall = (node, context) =>
	isMethodCall(node, {
		method: 'string',
		argumentsLength: 0,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})
	&& node.callee.object.type === 'Identifier'
	&& isImportedZodNamespace(node.callee.object, context);

const isSearchStringSafe = (method, searchString) => method === 'startsWith'
	? searchString === searchString.trimEnd()
	: searchString === searchString.trimStart();

const getStaticValueResult = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	return getStaticValue(node, context.sourceCode.getScope(node));
};

const getStaticSearchString = (node, context) => {
	const result = getStaticValueResult(node, context);
	if (!result) {
		return;
	}

	const {value} = result;
	return value === null || stringifiableSearchValueTypes.has(typeof value)
		? String(value)
		: undefined;
};

const isStaticNonString = (node, context) => {
	node = unwrapTypeScriptExpression(node);
	node = unwrapTypeScriptExpression(getConstVariableInitializer(node, context) ?? node);

	if (knownNonStringExpressionTypes.has(node.type)) {
		return true;
	}

	const result = getStaticValueResult(node, context);
	return result ? typeof result.value !== 'string' : false;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			methods,
			maximumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const trimCall = node.callee.object;
		if (!isMethodCall(trimCall, {
			method: 'trim',
			argumentsLength: 0,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		if (hasOptionalChainElement(node)) {
			return;
		}

		const trimReceiver = trimCall.callee.object;
		if (
			isStaticNonString(trimReceiver, context)
			|| isKnownNonString(trimReceiver, context)
			|| isZodStringCall(trimReceiver, context)
		) {
			return;
		}

		const {property: outerMethodNode} = node.callee;
		const {property: trimMethodNode} = trimCall.callee;
		const method = outerMethodNode.name;
		const [searchArgument] = node.arguments;

		if (searchArgument) {
			const searchString = getStaticSearchString(searchArgument, context);

			if (
				searchString === undefined
				|| !isSearchStringSafe(method, searchString)
			) {
				return;
			}
		}

		const replacement = getReplacement(method);

		return {
			node: trimMethodNode,
			messageId: MESSAGE_ID,
			data: {method, replacement},
			fix: fixer => fixer.replaceText(trimMethodNode, replacement),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `String#trim()` before `String#startsWith()` or `String#endsWith()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
