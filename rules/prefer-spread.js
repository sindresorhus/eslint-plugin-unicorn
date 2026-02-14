import {
	getStaticValue,
	isCommaToken,
	isCommentToken,
	hasSideEffect,
} from '@eslint-community/eslint-utils';
import {
	getParentheses,
	getParenthesizedRange,
	getParenthesizedText,
	needsSemicolon,
	isNodeMatches,
	isMethodNamed,
	hasOptionalChainElement,
} from './utils/index.js';
import {removeMethodCall} from './fix/index.js';
import {isLiteral, isMethodCall, isEmptyArrayExpression} from './ast/index.js';
import typedArrayTypes from './shared/typed-array.js';

const ERROR_ARRAY_FROM = 'array-from';
const ERROR_ARRAY_CONCAT = 'array-concat';
const ERROR_ARRAY_SLICE = 'array-slice';
const ERROR_ARRAY_TO_SPLICED = 'array-to-spliced';
const ERROR_STRING_SPLIT = 'string-split';
const SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE = 'argument-is-spreadable';
const SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE = 'argument-is-not-spreadable';
const SUGGESTION_CONCAT_TEST_ARGUMENT = 'test-argument';
const SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS = 'spread-all-arguments';
const SUGGESTION_USE_SPREAD = 'use-spread';
const messages = {
	[ERROR_ARRAY_FROM]: 'Prefer the spread operator over `Array.from(…)`.',
	[ERROR_ARRAY_CONCAT]: 'Prefer the spread operator over `Array#concat(…)`.',
	[ERROR_ARRAY_SLICE]: 'Prefer the spread operator over `Array#slice()`.',
	[ERROR_ARRAY_TO_SPLICED]: 'Prefer the spread operator over `Array#toSpliced()`.',
	[ERROR_STRING_SPLIT]: 'Prefer the spread operator over `String#split(\'\')`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE]: 'First argument is an `array`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE]: 'First argument is not an `array`.',
	[SUGGESTION_CONCAT_TEST_ARGUMENT]: 'Test first argument with `Array.isArray(…)`.',
	[SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS]: 'Spread all unknown arguments.',
	[SUGGESTION_USE_SPREAD]: 'Use `...` operator.',
};

const ignoredSliceCallee = [
	'arrayBuffer',
	'blob',
	'buffer',
	'file',
	'this',
];

// TypedArray and ArrayBuffer constructors - these have .slice() but spreading them
// either doesn't work (ArrayBuffer has no iterator) or changes the type (TypedArray.slice()
// returns the same typed array, but spreading converts to number[])
const typedArrayConstructors = new Set([
	...typedArrayTypes,
	'ArrayBuffer',
	'SharedArrayBuffer',
]);

/**
Check if node is a TypedArray/ArrayBuffer construction (new Uint8Array(...)).

@param {import('estree').Node} node
@returns {boolean}
*/
function isTypedArrayConstruction(node) {
	return (
		node.type === 'NewExpression'
		&& node.callee.type === 'Identifier'
		&& typedArrayConstructors.has(node.callee.name)
	);
}

const isArrayLiteral = node => node.type === 'ArrayExpression';
const hasArrayHoles = node => node.elements.some(element => element?.type === undefined);
const isArrayLiteralHasTrailingComma = (node, sourceCode) => {
	if (isEmptyArrayExpression(node)) {
		return false;
	}

	return isCommaToken(sourceCode.getLastToken(node, 1));
};

const isArrayLiteralOuterCommentsPreservable = (node, context) => {
	if (hasArrayHoles(node)) {
		return false;
	}

	const parentheses = getParentheses(node, context);
	if (parentheses.length === 0) {
		return false;
	}

	const {sourceCode} = context;
	const hasCommentBetween = (a, b) =>
		sourceCode.getTokensBetween(a, b, {includeComments: true})
			.some(token => isCommentToken(token));

	return hasCommentBetween(parentheses[0], node) || hasCommentBetween(node, parentheses.at(-1));
};

function fixConcat(node, context, fixableArguments) {
	const {sourceCode} = context;
	const array = node.callee.object;
	const concatCallArguments = node.arguments;
	const arrayParenthesizedRange = getParenthesizedRange(array, context);
	const arrayIsArrayLiteral = isArrayLiteral(array);
	const arrayHasTrailingComma = arrayIsArrayLiteral && isArrayLiteralHasTrailingComma(array, sourceCode);

	const getArrayLiteralElementsText = (node, keepTrailingComma) => {
		if (
			!keepTrailingComma
			&& isArrayLiteralHasTrailingComma(node, sourceCode)
		) {
			const start = sourceCode.getRange(node)[0] + 1;
			const [end] = sourceCode.getRange(sourceCode.getLastToken(node, 1));
			return sourceCode.text.slice(start, end);
		}

		return sourceCode.getText(node, -1, -1);
	};

	const getFixedText = () => {
		const nonEmptyArguments = fixableArguments
			.filter(({node, isArrayLiteral}) => (!isArrayLiteral || !isEmptyArrayExpression(node)));
		const lastArgument = nonEmptyArguments.at(-1);

		let text = nonEmptyArguments
			.map(({node, isArrayLiteral, isSpreadable, testArgument}) => {
				if (isArrayLiteral) {
					if (isArrayLiteralOuterCommentsPreservable(node, context)) {
						return `...${getParenthesizedText(node, context)}`;
					}

					return getArrayLiteralElementsText(node, node === lastArgument.node);
				}

				let text = getParenthesizedText(node, context);

				if (testArgument) {
					return `...(Array.isArray(${text}) ? ${text} : [${text}])`;
				}

				if (isSpreadable) {
					text = `...${text}`;
				}

				return text || ' ';
			})
			.join(', ');

		if (!text) {
			return '';
		}

		if (arrayIsArrayLiteral) {
			if (!isEmptyArrayExpression(array)) {
				text = ` ${text}`;

				if (!arrayHasTrailingComma) {
					text = `,${text}`;
				}

				if (
					arrayHasTrailingComma
					&& (!lastArgument.isArrayLiteral || !isArrayLiteralHasTrailingComma(lastArgument.node, sourceCode))
				) {
					text = `${text},`;
				}
			}
		} else {
			text = `, ${text}`;
		}

		return text;
	};

	function removeArguments(fixer) {
		const [firstArgument] = concatCallArguments;
		const lastArgument = concatCallArguments[fixableArguments.length - 1];

		const [start] = getParenthesizedRange(firstArgument, context);
		let [, end] = sourceCode.getRange(sourceCode.getTokenAfter(lastArgument, isCommaToken));

		const textAfter = sourceCode.text.slice(end);
		const [leadingSpaces] = textAfter.match(/^\s*/);
		end += leadingSpaces.length;

		return fixer.removeRange([start, end]);
	}

	return function * (fixer) {
		// Fixed code always starts with `[`
		if (
			!arrayIsArrayLiteral
			&& needsSemicolon(sourceCode.getTokenBefore(node), context, '[')
		) {
			yield fixer.insertTextBefore(node, ';');
		}

		yield (
			concatCallArguments.length - fixableArguments.length === 0
				? removeMethodCall(fixer, node, context)
				: removeArguments(fixer)
		);

		const text = getFixedText();

		if (arrayIsArrayLiteral) {
			const closingBracketToken = sourceCode.getLastToken(array);
			yield fixer.insertTextBefore(closingBracketToken, text);
		} else {
			// The array is already accessing `.concat`, there should be no case where extra `()` are needed.
			yield fixer.insertTextBeforeRange(arrayParenthesizedRange, '[...');
			yield fixer.insertTextAfterRange(arrayParenthesizedRange, text);
			yield fixer.insertTextAfterRange(arrayParenthesizedRange, ']');
		}
	};
}

const getConcatArgumentSpreadable = (node, scope) => {
	if (node.type === 'SpreadElement') {
		return;
	}

	if (isArrayLiteral(node)) {
		return {node, isArrayLiteral: true};
	}

	const result = getStaticValue(node, scope);

	if (!result) {
		return;
	}

	const isSpreadable = Array.isArray(result.value);

	return {node, isSpreadable};
};

function getConcatFixableArguments(argumentsList, scope) {
	const fixableArguments = [];

	for (const node of argumentsList) {
		const result = getConcatArgumentSpreadable(node, scope);

		if (result) {
			fixableArguments.push(result);
		} else {
			break;
		}
	}

	return fixableArguments;
}

function fixArrayFrom(node, context) {
	const {sourceCode} = context;
	const [object] = node.arguments;

	function getObjectText() {
		if (isArrayLiteral(object)) {
			return sourceCode.getText(object);
		}

		const [start, end] = getParenthesizedRange(object, context);
		const text = sourceCode.text.slice(start, end);

		return `[...${text}]`;
	}

	return function * (fixer) {
		// Fixed code always starts with `[`
		if (needsSemicolon(sourceCode.getTokenBefore(node), context, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		const objectText = getObjectText();

		yield fixer.replaceText(node, objectText);
	};
}

function methodCallToSpread(node, context) {
	return function * (fixer) {
		const {sourceCode} = context;
		// Fixed code always starts with `[`
		if (needsSemicolon(sourceCode.getTokenBefore(node), context, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		yield fixer.insertTextBefore(node, '[...');
		yield fixer.insertTextAfter(node, ']');

		// The array is already accessing `.slice` or `.split`, there should be no case where extra `()` are needed.

		yield removeMethodCall(fixer, node, context);
	};
}

function isClassName(node) {
	if (node.type === 'MemberExpression') {
		node = node.property;
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	const {name} = node;

	return /^[A-Z]./.test(name) && name.toUpperCase() !== name;
}

function isNotArray(node, scope) {
	if (
		node.type === 'TemplateLiteral'
		|| node.type === 'Literal'
		|| node.type === 'BinaryExpression'
		|| isClassName(node)
		// `foo.join()`
		|| (isMethodNamed(node, 'join') && node.arguments.length <= 1)
	) {
		return true;
	}

	const staticValue = getStaticValue(node, scope);
	if (staticValue && !Array.isArray(staticValue.value)) {
		return true;
	}

	return false;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// Any inner comment outside preserved ranges means the autofix would relocate or drop comments.
	const hasCommentsOutsideRanges = (node, preservedRanges) => sourceCode.getCommentsInside(node).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return !preservedRanges.some(([start, end]) => commentStart >= start && commentEnd <= end);
	});

	const hasExtraComments = (node, preservedNodeOrRange) => {
		const preservedRange = Array.isArray(preservedNodeOrRange)
			? preservedNodeOrRange
			: getParenthesizedRange(preservedNodeOrRange, context);

		return hasCommentsOutsideRanges(node, [preservedRange]);
	};

	// Collect ranges whose comments are guaranteed to survive the concat-to-spread fix.
	const getConcatPreservedRanges = (node, fixedArgumentsCount) => {
		const fixedArguments = node.arguments.slice(0, fixedArgumentsCount);
		// Needed to decide whether a trailing comma comment can still stay in place.
		const lastNonEmptyFixedArgument = fixedArguments.findLast(argument =>
			!isArrayLiteral(argument)
			|| !isEmptyArrayExpression(argument),
		);
		const preservedRanges = [
			getParenthesizedRange(node.callee.object, context),
			...fixedArguments.flatMap(argument => {
				if (isArrayLiteral(argument)) {
					if (isEmptyArrayExpression(argument)) {
						return [];
					}

					if (isArrayLiteralOuterCommentsPreservable(argument, context)) {
						return [getParenthesizedRange(argument, context)];
					}

					const arrayRange = sourceCode.getRange(argument);

					if (
						isArrayLiteralHasTrailingComma(argument, sourceCode)
						&& argument !== lastNonEmptyFixedArgument
					) {
						const [trailingCommaStart] = sourceCode.getRange(sourceCode.getLastToken(argument, 1));

						// Preserve comments after the last element but before trailing comma,
						// since the comma itself disappears when this argument is flattened.
						return [[arrayRange[0] + 1, trailingCommaStart]];
					}

					if (hasArrayHoles(argument)) {
						// Hole positions must stay stable, so preserve the full literal range.
						return [arrayRange];
					}
				}

				return [getParenthesizedRange(argument, context)];
			}),
		];

		if (fixedArgumentsCount < node.arguments.length) {
			// Comments between `.concat(` and the first fixed argument can be moved to the
			// remaining arguments by the partial fix, so they are intentionally not preserved.
			const lastFixedArgument = fixedArguments.at(-1);
			const commaToken = sourceCode.getTokenAfter(lastFixedArgument, isCommaToken);
			const [, start] = sourceCode.getRange(commaToken);
			const [, end] = sourceCode.getRange(node);
			preservedRanges.push([start, end]);
		}

		return preservedRanges;
	};

	// `Array.from()`
	context.on('CallExpression', node => {
		if (
			isMethodCall(node, {
				object: 'Array',
				method: 'from',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			// Allow `Array.from({length})`
			&& node.arguments[0].type !== 'ObjectExpression'
		) {
			const [firstArgument] = node.arguments;
			const preservedRange = isArrayLiteral(firstArgument)
				? sourceCode.getRange(firstArgument)
				: getParenthesizedRange(firstArgument, context);

			return {
				node,
				messageId: ERROR_ARRAY_FROM,
				...(!hasExtraComments(node, preservedRange) && {fix: fixArrayFrom(node, context)}),
			};
		}
	});

	// `array.concat()`
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'concat',
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const {object} = node.callee;
		const scope = sourceCode.getScope(object);

		if (isNotArray(object, scope)) {
			return;
		}

		const problem = {
			node: node.callee.property,
			messageId: ERROR_ARRAY_CONCAT,
		};

		const fixableArguments = getConcatFixableArguments(node.arguments, scope);

		if (fixableArguments.length > 0 || node.arguments.length === 0) {
			if (!hasCommentsOutsideRanges(node, getConcatPreservedRanges(node, fixableArguments.length))) {
				problem.fix = fixConcat(node, context, fixableArguments);
			}

			return problem;
		}

		const [firstArgument, ...restArguments] = node.arguments;
		if (firstArgument.type === 'SpreadElement') {
			return problem;
		}

		const fixableArgumentsAfterFirstArgument = getConcatFixableArguments(restArguments, scope);
		const suggestions = [
			{
				messageId: SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE,
				isSpreadable: true,
			},
			{
				messageId: SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE,
				isSpreadable: false,
			},
		];

		if (!hasSideEffect(firstArgument, sourceCode)) {
			suggestions.push({
				messageId: SUGGESTION_CONCAT_TEST_ARGUMENT,
				testArgument: true,
			});
		}

		problem.suggest = suggestions.map(({messageId, isSpreadable, testArgument}) => ({
			messageId,
			fix: fixConcat(
				node,
				context,
				// When apply suggestion, we also merge fixable arguments after the first one
				[
					{
						node: firstArgument,
						isSpreadable,
						testArgument,
					},
					...fixableArgumentsAfterFirstArgument,
				],
			),
		}));

		if (
			fixableArgumentsAfterFirstArgument.length < restArguments.length
			&& restArguments.every(({type}) => type !== 'SpreadElement')
		) {
			problem.suggest.push({
				messageId: SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS,
				fix: fixConcat(
					node,
					context,
					node.arguments.map(node => getConcatArgumentSpreadable(node, scope) || {node, isSpreadable: true}),
				),
			});
		}

		return problem;
	});

	// `array.slice()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'slice',
				minimumArguments: 0,
				maximumArguments: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& !isArrayLiteral(node.callee.object)
			&& !hasOptionalChainElement(node.callee.object)
		)) {
			return;
		}

		if (isNodeMatches(node.callee.object, ignoredSliceCallee)) {
			return;
		}

		// Skip TypedArray/ArrayBuffer constructions - spreading them either fails
		// (ArrayBuffer has no iterator) or changes the type (TypedArray -> number[])
		if (isTypedArrayConstruction(node.callee.object)) {
			return;
		}

		const [firstArgument] = node.arguments;
		if (firstArgument && !isLiteral(firstArgument, 0)) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: ERROR_ARRAY_SLICE,
			...(!hasExtraComments(node, node.callee.object) && {fix: methodCallToSpread(node, context)}),
		};
	});

	// `array.toSpliced()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'toSpliced',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& node.callee.object.type !== 'ArrayExpression'
		)) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: ERROR_ARRAY_TO_SPLICED,
			...(!hasExtraComments(node, node.callee.object) && {fix: methodCallToSpread(node, context)}),
		};
	});

	// `string.split()`
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'split',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [separator] = node.arguments;
		if (!isLiteral(separator, '')) {
			return;
		}

		const string = node.callee.object;
		const staticValue = getStaticValue(string, sourceCode.getScope(string));
		let hasSameResult = false;
		if (staticValue) {
			const {value} = staticValue;

			if (typeof value !== 'string') {
				return;
			}

			// eslint-disable-next-line unicorn/prefer-spread
			const resultBySplit = value.split('');
			const resultBySpread = [...value];

			hasSameResult = resultBySplit.length === resultBySpread.length
				&& resultBySplit.every((character, index) => character === resultBySpread[index]);
		}

		const problem = {
			node: node.callee.property,
			messageId: ERROR_STRING_SPLIT,
		};

		if (hasSameResult && !hasExtraComments(node, node.callee.object)) {
			problem.fix = methodCallToSpread(node, context);
		} else {
			problem.suggest = [
				{
					messageId: SUGGESTION_USE_SPREAD,
					fix: methodCallToSpread(node, context),
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer the spread operator over `Array.from(…)`, `Array#concat(…)`, `Array#{slice,toSpliced}()` and `String#split(\'\')`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
