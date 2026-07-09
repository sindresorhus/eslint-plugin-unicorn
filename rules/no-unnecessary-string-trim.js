import {getStaticValue} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {hasOptionalChainElement, isKnownNonString, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-string-trim';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#{{replacement}}()` before `String#{{method}}()`.',
};

const methods = ['startsWith', 'endsWith'];
const getReplacement = method => method === 'startsWith' ? 'trimStart' : 'trimEnd';

const isSearchStringSafe = (method, searchString) => method === 'startsWith'
	? searchString === searchString.trimEnd()
	: searchString === searchString.trimStart();

const getStaticSearchString = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	const staticValue = getStaticValue(node, context.sourceCode.getScope(node))?.value;
	return typeof staticValue === 'string' ? staticValue : undefined;
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

		if (isKnownNonString(trimCall.callee.object, context)) {
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
