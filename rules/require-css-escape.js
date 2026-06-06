import {isMethodCall} from './ast/index.js';
import {isNodeValueNotDomNode} from './utils/index.js';

const MESSAGE_ID = 'require-css-escape';
const messages = {
	[MESSAGE_ID]: 'Use `CSS.escape()` for interpolated values in CSS selectors.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkAllSelectors: {
				type: 'boolean',
				description: 'Check all selector interpolations instead of only attribute selector interpolations.',
			},
		},
	},
];

const selectorMethods = [
	'closest',
	'matches',
	'querySelector',
	'querySelectorAll',
];

const hasUnclosedAttributeSelector = string => string.lastIndexOf('[') > string.lastIndexOf(']');

const getCookedText = quasi => quasi.value.cooked;

const isAttributeSelectorInterpolation = (templateLiteral, expressionIndex) => {
	let textBefore = '';

	for (const quasi of templateLiteral.quasis.slice(0, expressionIndex + 1)) {
		const cookedText = getCookedText(quasi);
		if (cookedText === undefined) {
			return false;
		}

		textBefore += cookedText;
	}

	if (!hasUnclosedAttributeSelector(textBefore)) {
		return false;
	}

	for (const quasi of templateLiteral.quasis.slice(expressionIndex + 1)) {
		const cookedText = getCookedText(quasi);
		if (cookedText === undefined) {
			return false;
		}

		if (cookedText.includes(']')) {
			return true;
		}
	}

	return false;
};

const isCssEscapeCall = node =>
	isMethodCall(node, {
		object: 'CSS',
		method: 'escape',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	});

const getWrapFix = expression => fixer => expression.type === 'SequenceExpression'
	? [
		fixer.insertTextBefore(expression, 'CSS.escape(('),
		fixer.insertTextAfter(expression, '))'),
	]
	: [
		fixer.insertTextBefore(expression, 'CSS.escape('),
		fixer.insertTextAfter(expression, ')'),
	];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {checkAllSelectors} = context.options[0];

	context.on('CallExpression', function * (node) {
		if (
			!isMethodCall(node, {
				methods: selectorMethods,
				minimumArguments: 1,
			})
			|| isNodeValueNotDomNode(node.callee.object)
		) {
			return;
		}

		const [argument] = node.arguments;
		if (
			argument.type !== 'TemplateLiteral'
			|| argument.expressions.length === 0
		) {
			return;
		}

		for (const [index, expression] of argument.expressions.entries()) {
			if (
				isCssEscapeCall(expression)
				|| (
					!checkAllSelectors
					&& !isAttributeSelectorInterpolation(argument, index)
				)
			) {
				continue;
			}

			yield {
				node: expression,
				messageId: MESSAGE_ID,
				fix: getWrapFix(expression),
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require `CSS.escape()` for interpolated values in CSS selectors.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{checkAllSelectors: false}],
		messages,
	},
};

export default config;
