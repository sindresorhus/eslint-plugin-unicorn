import {getStaticValue} from '@eslint-community/eslint-utils';
import {
	checkVueTemplate,
	isMethodNamed,
	getTokenStore,
	getCallArgumentText,
	getMemberExpressionObjectText,
	getParenthesizedRange,
	isArray,
	isKnownNonString,
	isRegExp,
	needsSemicolon,
	shouldAddParenthesesToUnaryExpressionReplacement,
	wouldRemoveComments,
} from './utils/index.js';
import simpleArraySearchRule from './shared/simple-array-search-rule.js';
import {isLiteral, isNegativeOne} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID = 'prefer-includes';
const messages = {
	[MESSAGE_ID]: 'Use `.includes()`, rather than `.{{method}}()`, when checking for existence.',
};
// Ignore `{_,lodash,underscore}.{indexOf,lastIndexOf}`
const ignoredVariables = new Set(['_', 'lodash', 'underscore']);
const isIgnoredTarget = node => node.type === 'Identifier' && ignoredVariables.has(node.name);
const isLiteralZero = node => isLiteral(node, 0);
// `NaN`, `Number.NaN`, `0 / 0`, but not a binding that happens to be named `NaN`
// Same check as in `shared/simple-array-search-rule.js`
const isNaNValue = (node, context) => Number.isNaN(getStaticValue(node, context.sourceCode.getScope(node))?.value);
const isNegativeResult = node => ['===', '==', '<', '<='].includes(node.operator);

const getProblem = (context, node, target, argumentsNodes) => {
	const tokenStore = getTokenStore(context, target);

	const memberExpressionNode = target.parent;
	const isNegative = isNegativeResult(node);
	const targetSource = getMemberExpressionObjectText(target, context, isNegative ? target : node);

	// Strip default `fromIndex`
	if (isLiteralZero(argumentsNodes[1])) {
		argumentsNodes = argumentsNodes.slice(0, 1);
	}

	const argumentsSource = argumentsNodes.map(argument => getCallArgumentText(argument, context));

	let replacement = `${isNegative ? '!' : ''}${targetSource}.includes(${argumentsSource.join(', ')})`;
	if (isNegative && shouldAddParenthesesToUnaryExpressionReplacement(node, context)) {
		replacement = `(${replacement})`;
		if (needsSemicolon(tokenStore.getTokenBefore(node), context, replacement)) {
			replacement = ';' + replacement;
		}
	}

	return {
		node: memberExpressionNode.property,
		messageId: MESSAGE_ID,
		data: {
			method: node.left.callee.property.name,
		},
		// The comparison is rebuilt from the receiver and retained arguments, so comments elsewhere would be dropped
		fix: wouldRemoveComments(context, node, [target, ...argumentsNodes].map(node => getParenthesizedRange(node, context)))
			? undefined
			: function * (fixer) {
				yield fixer.replaceText(node, replacement);
				yield fixSpaceAroundKeyword(fixer, node, context);
			},
	};
};

const includesOverSomeRule = simpleArraySearchRule({
	method: 'some',
	replacement: 'includes',
	checkBooleanPredicate: true,
});

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	includesOverSomeRule.listen(context);

	context.on('BinaryExpression', node => {
		const {left, right, operator} = node;

		if (!isMethodNamed(left, 'indexOf') && !isMethodNamed(left, 'lastIndexOf')) {
			return;
		}

		const target = left.callee.object;

		if (isIgnoredTarget(target)) {
			return;
		}

		const {arguments: argumentsNodes} = left;

		// Ignore something.indexOf(foo, 0, another)
		if (argumentsNodes.length > 2) {
			return;
		}

		// String#indexOf() coerces a RegExp to a string, but String#includes() rejects it.
		if (
			argumentsNodes.length > 0
			&& isRegExp(argumentsNodes[0], context)
			&& !isArray(target, context)
			&& !isKnownNonString(target, context)
		) {
			return;
		}

		// `indexOf()` compares with `===` and never finds `NaN`, while `.includes()` uses SameValueZero
		if (argumentsNodes.length > 0 && isNaNValue(argumentsNodes[0], context)) {
			return;
		}

		// `lastIndexOf(value, fromIndex)` searches backward from `fromIndex`, while `.includes(value, fromIndex)`
		// searches forward, so they're only equivalent when no `fromIndex` is passed. A spread can hide a `fromIndex`.
		if (
			isMethodNamed(left, 'lastIndexOf')
			&& (argumentsNodes.length > 1 || argumentsNodes.some(argument => argument.type === 'SpreadElement'))
		) {
			return;
		}

		if (
			// `indexOf()` only returns `-1` or a non-negative index, so `<= -1` is `=== -1` too
			(['!==', '!=', '>', '===', '==', '<='].includes(operator) && isNegativeOne(right))
			|| (['>=', '<'].includes(operator) && isLiteralZero(right))
		) {
			return getProblem(
				context,
				node,
				target,
				argumentsNodes,
			);
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.includes()` over `.indexOf()`, `.lastIndexOf()`, and `Array#some()` when checking for existence or non-existence.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages: {
			...messages,
			...includesOverSomeRule.messages,
		},
		languages: [
			'js/js',
		],
	},
};

export default config;
