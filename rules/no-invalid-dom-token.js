import {getStaticStringValue, isMemberExpression} from './ast/index.js';
import {
	escapeString,
	getParenthesizedRange,
	getStaticValueForControlFlow,
	isNodeValueNotDomNode,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID_EMPTY = 'no-invalid-dom-token/empty';
const MESSAGE_ID_WHITESPACE = 'no-invalid-dom-token/whitespace';
const MESSAGE_ID_SUGGESTION = 'no-invalid-dom-token/suggestion';
const messages = {
	[MESSAGE_ID_EMPTY]: 'DOM tokens must not be empty.',
	[MESSAGE_ID_WHITESPACE]: 'DOM tokens must not contain ASCII whitespace.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with separate tokens.',
};

const tokenListProperties = new Set(['classList', 'relList', 'sandbox', 'part', 'sizes', 'blocking', 'htmlFor', 'controlsList']);
const tokenArgumentCounts = new Map([
	['add', Infinity],
	['remove', Infinity],
	['toggle', 1],
	['replace', 2],
]);

// DOM tokens reject exactly Infra's ASCII whitespace, not all JavaScript whitespace.
const asciiWhitespacePattern = /[\t\n\f\r ]/v;
const asciiWhitespaceSequencePattern = /[\t\n\f\r ]+/v;

const unwrapExpression = node => {
	node = unwrapTypeScriptExpression(node);
	return node.type === 'ChainExpression' ? unwrapTypeScriptExpression(node.expression) : node;
};

const getMemberName = node => {
	if (!isMemberExpression(node) || node.property.type === 'PrivateIdentifier') {
		return;
	}

	return node.computed ? getStaticStringValue(unwrapTypeScriptExpression(node.property)) : node.property.name;
};

const getSplitSuggestion = (argument, context) => {
	const value = getStaticStringValue(unwrapTypeScriptExpression(argument));
	if (typeof value !== 'string') {
		return;
	}

	const tokens = value.split(asciiWhitespaceSequencePattern).filter(Boolean);
	const range = getParenthesizedRange(argument, context);
	if (tokens.length === 0 || wouldRemoveComments(context, range)) {
		return;
	}

	return {
		messageId: MESSAGE_ID_SUGGESTION,
		fix: fixer => fixer.replaceTextRange(range, tokens.map(token => escapeString(token)).join(', ')),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', function * (node) {
		const callee = unwrapExpression(node.callee);
		const maximumArguments = tokenArgumentCounts.get(getMemberName(callee));
		if (maximumArguments === undefined) {
			return;
		}

		const receiver = unwrapExpression(callee.object);
		if (
			!tokenListProperties.has(getMemberName(receiver))
			|| isNodeValueNotDomNode(unwrapExpression(receiver.object))
		) {
			return;
		}

		for (const argument of node.arguments.slice(0, maximumArguments)) {
			if (argument.type === 'SpreadElement') {
				// Spreads do not obscure later tokens in variadic methods, but their lengths make fixed argument positions unknown.
				if (maximumArguments !== Infinity) {
					break;
				}

				continue;
			}

			const token = unwrapTypeScriptExpression(argument);
			const value = getStaticStringValue(token) ?? getStaticValueForControlFlow(token, context)?.value;
			const hasWhitespace = typeof value === 'string'
				? asciiWhitespacePattern.test(value)
				: token.type === 'TemplateLiteral' && token.quasis.some(({value}) => typeof value.cooked === 'string' && asciiWhitespacePattern.test(value.cooked));

			if (value !== '' && !hasWhitespace) {
				continue;
			}

			const problem = {
				node: argument,
				messageId: value === '' ? MESSAGE_ID_EMPTY : MESSAGE_ID_WHITESPACE,
			};

			if (maximumArguments === Infinity && hasWhitespace) {
				const suggestion = getSplitSuggestion(argument, context);
				if (suggestion) {
					problem.suggest = [suggestion];
				}
			}

			yield problem;
		}
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
			description: 'Disallow invalid tokens in DOMTokenList methods.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
