import {hasSideEffect} from '@eslint-community/eslint-utils';
import {
	getParenthesizedText,
	getParenthesizedRange,
	getPrecedence,
	getStaticValueIfNoSideEffects,
	isKnownNonString,
	isParenthesized,
	isSameReference,
	PRECEDENCE_ADDITION,
} from './utils/index.js';
import {replaceArgument} from './fix/index.js';
import {isNumericLiteral, isStringLiteral, isMethodCall} from './ast/index.js';
import {getSubstringSingleCharacterIndex} from './shared/substring.js';

/*
`substring()`/`substr()` read a missing or `undefined` end as "the whole string" and a `null` end as `0`, and `Math.max(0, undefined)` is `NaN`, so the replacement has to turn only `undefined` into `Infinity`. `??` cannot be used, it coalesces `null` as well and would turn `""` into the whole string. The end is read twice, so this returns `undefined` for an end that has a side effect and the caller withholds the fix.
*/
const getCoalescedEndText = (node, context) => {
	if (hasSideEffect(node, context.sourceCode)) {
		return;
	}

	let text = getParenthesizedText(node, context);
	// The operand of an `===` needs parentheses for anything that binds looser than it, which is everything below addition: a logical, nullish or comparison expression. Extra parentheses are valid, so the bound is deliberately low. The conditional expression is a real operand of `Math.max()`, so only this operand needs them.
	if (!isParenthesized(node, context) && (node.type === 'LogicalExpression' || getPrecedence(node) < PRECEDENCE_ADDITION)) {
		text = `(${text})`;
	}

	return `${text} === undefined ? Infinity : ${text}`;
};

const MESSAGE_ID_SUBSTR = 'substr';
const MESSAGE_ID_SUBSTRING = 'substring';
const messages = {
	[MESSAGE_ID_SUBSTR]: 'Prefer `String#slice()` over `String#substr()`.',
	[MESSAGE_ID_SUBSTRING]: 'Prefer `String#slice()` over `String#substring()`.',
};

const getNumericValue = node => {
	if (isNumericLiteral(node)) {
		return node.value;
	}

	if (node.type === 'UnaryExpression' && node.operator === '-') {
		const argumentValue = getNumericValue(node.argument);
		if (argumentValue === undefined) {
			return;
		}

		return -argumentValue;
	}
};

// This handles cases where the argument is very likely to be a number, such as `.substring('foo'.length)`.
const isLengthProperty = node => (
	node?.type === 'MemberExpression'
	&& node.computed === false
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length'
);

const isPositiveIntegerLiteral = node => (
	isNumericLiteral(node)
	&& Number.isSafeInteger(node.value)
	&& node.value > 0
);

const isSafeNegativeIndexReceiver = node => (
	node.type === 'Identifier'
	|| isStringLiteral(node)
);

const hasCommentsInsideRange = (sourceCode, range) => sourceCode.getAllComments().some(comment => {
	const commentRange = sourceCode.getRange(comment);
	return commentRange[0] >= range[0] && commentRange[1] <= range[1];
});

const hasCommentInsideParentheses = (node, context) =>
	hasCommentsInsideRange(context.sourceCode, getParenthesizedRange(node, context));

// `replaceArgument()` also replaces the parentheses around the argument, so a comment inside them would be dropped.
const getArgumentReplacement = (fixer, node, text, context, abort) => {
	if (hasCommentInsideParentheses(node, context)) {
		abort();
	}

	return replaceArgument(fixer, node, text, context);
};

const getArgumentRangeWithLeadingComments = (node, context) => {
	const [start, end] = getParenthesizedRange(node, context);
	const firstToken = context.sourceCode.getTokenByRangeStart(start);
	const previousToken = context.sourceCode.getTokenBefore(firstToken);
	return [context.sourceCode.getRange(previousToken)[1], end];
};

const getNegativeIndex = (node, receiver, context) => {
	const {sourceCode} = context;

	if (
		node.type !== 'BinaryExpression'
		|| node.operator !== '-'
		|| !isPositiveIntegerLiteral(node.right)
		|| !isLengthProperty(node.left)
		|| !isSafeNegativeIndexReceiver(receiver)
		|| !isSameReference(node.left.object, receiver)
		|| hasCommentsInsideRange(sourceCode, getArgumentRangeWithLeadingComments(node, context))
	) {
		return;
	}

	return `-${node.right.raw}`;
};

function * fixSubstrArguments({node, fixer, context, abort}) {
	const argumentNodes = node.arguments;
	const [firstArgument, secondArgument] = argumentNodes;

	if (!secondArgument) {
		return;
	}

	const firstArgumentStaticResult = getStaticValueIfNoSideEffects(firstArgument, context);
	const replaceSecondArgument = text => getArgumentReplacement(fixer, secondArgument, text, context, abort);

	if (firstArgumentStaticResult?.value === 0) {
		const negativeIndex = getNegativeIndex(secondArgument, node.callee.object, context);
		if (negativeIndex) {
			yield replaceSecondArgument(negativeIndex);
			return;
		}

		if (isNumericLiteral(secondArgument) || isLengthProperty(secondArgument)) {
			return;
		}

		const numericValue = getNumericValue(secondArgument);
		if (typeof numericValue === 'number') {
			yield replaceSecondArgument(String(Math.max(0, numericValue)));
			return;
		}

		const endText = getCoalescedEndText(secondArgument, context);
		if (!endText) {
			return abort();
		}

		yield fixer.replaceTextRange(getParenthesizedRange(secondArgument, context), `Math.max(0, ${endText})`);
		return;
	}

	if (argumentNodes.every(node => isNumericLiteral(node))) {
		// `substr()` runs `ToInteger` on each argument before adding them
		yield replaceSecondArgument(String(Math.trunc(firstArgument.value) + Math.trunc(secondArgument.value)));
		return;
	}

	return abort();
}

function * fixSubstringArguments({node, fixer, context, abort}) {
	const [firstArgument, secondArgument] = node.arguments;

	const firstNumber = firstArgument ? getNumericValue(firstArgument) : undefined;
	const replaceFirstArgument = text => getArgumentReplacement(fixer, firstArgument, text, context, abort);

	if (!secondArgument) {
		if (isLengthProperty(firstArgument)) {
			return;
		}

		if (firstNumber !== undefined) {
			yield replaceFirstArgument(String(Math.max(0, firstNumber)));
			return;
		}

		const firstArgumentRange = getParenthesizedRange(firstArgument, context);
		yield fixer.insertTextBeforeRange(firstArgumentRange, 'Math.max(0, ');
		yield fixer.insertTextAfterRange(firstArgumentRange, ')');
		return;
	}

	const secondNumber = getNumericValue(secondArgument);
	const replaceSecondArgument = text => getArgumentReplacement(fixer, secondArgument, text, context, abort);

	if (firstNumber !== undefined && secondNumber !== undefined) {
		const argumentsValue = [Math.max(0, firstNumber), Math.max(0, secondNumber)];
		if (firstNumber > secondNumber) {
			argumentsValue.reverse();
		}

		if (argumentsValue[0] !== firstNumber) {
			yield replaceFirstArgument(String(argumentsValue[0]));
		}

		if (argumentsValue[1] !== secondNumber) {
			yield replaceSecondArgument(String(argumentsValue[1]));
		}

		return;
	}

	if (firstNumber === 0 || secondNumber === 0) {
		/*
		When the arguments are swapped the literal `0` was the `substring()` end and the moved argument was the start, where `undefined` means `0`, not "to the end", so it is used as is and read only once.
		*/
		const endText = secondNumber === 0
			? getParenthesizedText(firstArgument, context)
			: getCoalescedEndText(secondArgument, context);
		if (!endText) {
			return abort();
		}

		yield replaceFirstArgument('0');
		yield replaceSecondArgument(`Math.max(0, ${endText})`);
		return;
	}

	// As values aren't Literal, we cannot know whether secondArgument will become smaller than the first or not, causing an issue:
	//   .substring(0, 2) and .substring(2, 0) returns the same result
	//   .slice(0, 2) and .slice(2, 0) doesn't return the same result
	// There's also an issue with us not knowing whether the value will be negative or not, due to:
	//   .substring() treats a negative number the same as it treats a zero.
	// The latter issue could be solved by wrapping all dynamic numbers in Math.max(0, <value>), but the resulting code would not be nice

	return abort();
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {methods: ['substr', 'substring']})) {
			return;
		}

		if (isKnownNonString(node.callee.object, context)) {
			return;
		}

		const method = node.callee.property.name;
		if (
			method === 'substring'
			&& getSubstringSingleCharacterIndex(node)
		) {
			return;
		}

		return {
			node,
			messageId: method,
			* fix(fixer, {abort}) {
				yield fixer.replaceText(node.callee.property, 'slice');

				if (node.arguments.length === 0) {
					return;
				}

				if (
					node.arguments.length > 2
					|| node.arguments.some(node => node.type === 'SpreadElement')
				) {
					return abort();
				}

				const fixArguments = method === 'substr' ? fixSubstrArguments : fixSubstringArguments;
				yield fixArguments({
					node,
					fixer,
					context,
					abort,
				});
			},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#slice()` over `String#substr()` and `String#substring()`.',
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
