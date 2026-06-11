import {isFunction, isMethodCall, isStringLiteral} from './ast/index.js';
import {
	getParenthesizedRange,
	getParenthesizedText,
	isNodeValueNotFunction,
} from './utils/index.js';

const MESSAGE_ID = 'no-unsafe-string-replacement';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID]: 'Do not use a non-literal replacement value with `String#{{method}}()`.',
	[MESSAGE_ID_SUGGESTION]: 'Wrap the replacement in a function.',
};

const isStaticTemplateLiteral = node =>
	node.type === 'TemplateLiteral'
	&& node.expressions.length === 0;

const isAllowedReplacement = node =>
	isStringLiteral(node)
	|| isStaticTemplateLiteral(node)
	|| isFunction(node);

const needsParenthesesInConciseArrowBody = (node, text) =>
	(
		node.type === 'SequenceExpression'
		&& !text.trimStart().startsWith('(')
	)
	|| text.trimStart().startsWith('{');

function hasAwaitOrYield(node, visitorKeys) {
	if (node.type === 'AwaitExpression' || node.type === 'YieldExpression') {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			if (value.some(node => node && hasAwaitOrYield(node, visitorKeys))) {
				return true;
			}
		} else if (value && hasAwaitOrYield(value, visitorKeys)) {
			return true;
		}
	}

	return false;
}

const canSuggest = (node, context) =>
	isNodeValueNotFunction(node)
	&& !hasAwaitOrYield(node, context.sourceCode.visitorKeys);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			methods: ['replace', 'replaceAll'],
			minimumArguments: 2,
		})) {
			return;
		}

		const [pattern, replacement] = node.arguments;
		if (
			pattern.type === 'SpreadElement'
			|| replacement.type === 'SpreadElement'
		) {
			return;
		}

		if (isAllowedReplacement(replacement)) {
			return;
		}

		const problem = {
			node: replacement,
			messageId: MESSAGE_ID,
			data: {
				method: node.callee.property.name,
			},
		};

		if (!canSuggest(replacement, context)) {
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				fix(fixer) {
					let replacementText = getParenthesizedText(replacement, context);

					if (needsParenthesesInConciseArrowBody(replacement, replacementText)) {
						replacementText = `(${replacementText})`;
					}

					return fixer.replaceTextRange(getParenthesizedRange(replacement, context), `() => ${replacementText}`);
				},
			},
		];

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow non-literal replacement values in `String#replace()` and `String#replaceAll()`.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
