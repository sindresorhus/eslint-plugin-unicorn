'use strict';
const {isParenthesized, getStaticValue, isCommaToken, hasSideEffect} = require('eslint-utils');
const {methodCallSelector} = require('./selectors/index.js');
const needsSemicolon = require('./utils/needs-semicolon.js');
const {getParenthesizedRange, getParenthesizedText} = require('./utils/parentheses.js');
const shouldAddParenthesesToSpreadElementArgument = require('./utils/should-add-parentheses-to-spread-element-argument.js');
const replaceNodeOrTokenAndSpacesBefore = require('./utils/replace-node-or-token-and-spaces-before.js');
const removeSpacesAfter = require('./utils/remove-spaces-after.js');
const isLiteralValue = require('./utils/is-literal-value.js');
const {isNodeMatches} = require('./utils/is-node-matches.js');

const ERROR_ARRAY_FROM = 'array-from';
const ERROR_ARRAY_CONCAT = 'array-concat';
const ERROR_ARRAY_SLICE = 'array-slice';
const SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE = 'argument-is-spreadable';
const SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE = 'argument-is-not-spreadable';
const SUGGESTION_CONCAT_TEST_ARGUMENT = 'test-argument';
const SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS = 'spread-all-arguments';
const messages = {
	[ERROR_ARRAY_FROM]: 'Prefer the spread operator over `Array.from(…)`.',
	[ERROR_ARRAY_CONCAT]: 'Prefer the spread operator over `Array#concat(…)`.',
	[ERROR_ARRAY_SLICE]: 'Prefer the spread operator over `Array#slice()`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE]: 'First argument is an `array`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE]: 'First argument is not an `array`.',
	[SUGGESTION_CONCAT_TEST_ARGUMENT]: 'Test first argument with `Array.isArray(…)`.',
	[SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS]: 'Spread all unknown arguments`.'
};

const arrayFromCallSelector = [
	methodCallSelector({
		object: 'Array',
		name: 'from',
		min: 1,
		max: 3
	}),
	// Allow `Array.from({length})`
	'[arguments.0.type!="ObjectExpression"]'
].join('');

const arrayConcatCallSelector = [
	methodCallSelector('concat'),
	`:not(${
		[
			...[
				'Literal',
				'TemplateLiteral'
			].map(type => `[callee.object.type="${type}"]`),
			// Most likely it's a static method of a class
			'[callee.object.name=/^[A-Z]/]'
		].join(', ')
	})`
].join('');

const arraySliceCallSelector = [
	methodCallSelector({
		name: 'slice',
		min: 0,
		max: 1
	}),
	'[callee.object.type!="ArrayExpression"]'
].join('');

const ignoredSliceCallee = [
	'arrayBuffer',
	'blob',
	'buffer',
	'file',
	'this'
];

const isArrayLiteral = node => node.type === 'ArrayExpression';
const isArrayLiteralHasTrailingComma = (node, sourceCode) => {
	if (node.elements.length === 0) {
		return false;
	}

	return isCommaToken(sourceCode.getLastToken(node, 1));
};

const getRangeAfterCalleeObject = (node, sourceCode) => {
	const {object} = node.callee;
	const parenthesizedRange = getParenthesizedRange(object, sourceCode);
	const [, start] = parenthesizedRange;
	const [, end] = node.range;

	return [start, end];
};

function fixConcat(node, sourceCode, fixableArguments) {
	const array = node.callee.object;
	const concatCallArguments = node.arguments;
	const arrayParenthesizedRange = getParenthesizedRange(array, sourceCode);
	const arrayIsArrayLiteral = isArrayLiteral(array);
	const arrayHasTrailingComma = arrayIsArrayLiteral && isArrayLiteralHasTrailingComma(array, sourceCode);

	const getArrayLiteralElementsText = (node, keepTrailingComma) => {
		if (
			!keepTrailingComma &&
			isArrayLiteralHasTrailingComma(node, sourceCode)
		) {
			const start = node.range[0] + 1;
			const end = sourceCode.getLastToken(node, 1).range[0];
			return sourceCode.text.slice(start, end);
		}

		return sourceCode.getText(node, -1, -1);
	};

	const getFixedText = () => {
		const nonEmptyArguments = fixableArguments
			.filter(({node, isArrayLiteral}) => (!isArrayLiteral || node.elements.length > 0));
		const lastArgument = nonEmptyArguments[nonEmptyArguments.length - 1];

		let text = nonEmptyArguments
			.map(({node, isArrayLiteral, isSpreadable, testArgument}) => {
				if (isArrayLiteral) {
					return getArrayLiteralElementsText(node, node === lastArgument.node);
				}

				let text = getParenthesizedText(node, sourceCode);

				if (testArgument) {
					return `...(Array.isArray(${text}) ? ${text} : [${text}])`;
				}

				if (isSpreadable) {
					if (
						!isParenthesized(node, sourceCode) &&
						shouldAddParenthesesToSpreadElementArgument(node)
					) {
						text = `(${text})`;
					}

					text = `...${text}`;
				}

				return text || ' ';
			})
			.join(', ');

		if (!text) {
			return '';
		}

		if (arrayIsArrayLiteral) {
			if (array.elements.length > 0) {
				text = ` ${text}`;

				if (!arrayHasTrailingComma) {
					text = `,${text}`;
				}

				if (
					arrayHasTrailingComma &&
					(!lastArgument.isArrayLiteral || !isArrayLiteralHasTrailingComma(lastArgument.node, sourceCode))
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

		const [start] = getParenthesizedRange(firstArgument, sourceCode);
		let [, end] = sourceCode.getTokenAfter(lastArgument, isCommaToken).range;

		const textAfter = sourceCode.text.slice(end);
		const [leadingSpaces] = textAfter.match(/^\s*/);
		end += leadingSpaces.length;

		return fixer.replaceTextRange([start, end], '');
	}

	return function * (fixer) {
		// Fixed code always starts with `[`
		if (
			!arrayIsArrayLiteral &&
			needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, '[')
		) {
			yield fixer.insertTextBefore(node, ';');
		}

		yield (
			concatCallArguments.length - fixableArguments.length === 0 ?
				fixer.replaceTextRange(getRangeAfterCalleeObject(node, sourceCode), '') :
				removeArguments(fixer)
		);

		const text = getFixedText();

		if (arrayIsArrayLiteral) {
			const closingBracketToken = sourceCode.getLastToken(array);
			yield fixer.insertTextBefore(closingBracketToken, text);
		} else {
			// The array is already accessing `.concat`, there should not any case need add extra `()`
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

function fixArrayFrom(node, sourceCode) {
	const [object] = node.arguments;

	function getObjectText() {
		if (isArrayLiteral(object)) {
			return sourceCode.getText(object);
		}

		const [start, end] = getParenthesizedRange(object, sourceCode);
		let text = sourceCode.text.slice(start, end);

		if (
			!isParenthesized(object, sourceCode) &&
			shouldAddParenthesesToSpreadElementArgument(object)
		) {
			text = `(${text})`;
		}

		return `[...${text}]`;
	}

	function * removeObject(fixer) {
		yield * replaceNodeOrTokenAndSpacesBefore(object, '', fixer, sourceCode);
		const commaToken = sourceCode.getTokenAfter(object, isCommaToken);
		yield * replaceNodeOrTokenAndSpacesBefore(commaToken, '', fixer, sourceCode);
		yield removeSpacesAfter(commaToken, sourceCode, fixer);
	}

	return function * (fixer) {
		// Fixed code always starts with `[`
		if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		const objectText = getObjectText();

		if (node.arguments.length === 1) {
			yield fixer.replaceText(node, objectText);
			return;
		}

		// `Array.from(object, mapFunction, thisArgument)` -> `[...object].map(mapFunction, thisArgument)`
		yield fixer.replaceText(node.callee.object, objectText);
		yield fixer.replaceText(node.callee.property, 'map');
		yield * removeObject(fixer);
	};
}

function fixSlice(node, sourceCode) {
	return function * (fixer) {
		// Fixed code always starts with `[`
		if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		yield fixer.insertTextBefore(node, '[...');
		yield fixer.insertTextAfter(node, ']');

		// The array is already accessing `.slice`, there should not any case need add extra `()`

		yield fixer.replaceTextRange(getRangeAfterCalleeObject(node, sourceCode), '');
	};
}

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[arrayFromCallSelector](node) {
			return {
				node,
				messageId: ERROR_ARRAY_FROM,
				fix: fixArrayFrom(node, sourceCode)
			};
		},
		[arrayConcatCallSelector](node) {
			const scope = context.getScope();
			const staticResult = getStaticValue(node.callee.object, scope);

			if (staticResult && !Array.isArray(staticResult.value)) {
				return;
			}

			const problem = {
				node: node.callee.property,
				messageId: ERROR_ARRAY_CONCAT
			};

			const fixableArguments = getConcatFixableArguments(node.arguments, scope);

			if (fixableArguments.length > 0 || node.arguments.length === 0) {
				problem.fix = fixConcat(node, sourceCode, fixableArguments);
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
					isSpreadable: true
				},
				{
					messageId: SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE,
					isSpreadable: false
				}
			];

			if (!hasSideEffect(firstArgument, sourceCode)) {
				suggestions.push({
					messageId: SUGGESTION_CONCAT_TEST_ARGUMENT,
					testArgument: true
				});
			}

			problem.suggest = suggestions.map(({messageId, isSpreadable, testArgument}) => ({
				messageId,
				fix: fixConcat(
					node,
					sourceCode,
					// When apply suggestion, we also merge fixable arguments after the first one
					[
						{
							node: firstArgument,
							isSpreadable,
							testArgument
						},
						...fixableArgumentsAfterFirstArgument
					]
				)
			}));

			if (
				fixableArgumentsAfterFirstArgument.length < restArguments.length &&
				restArguments.every(({type}) => type !== 'SpreadElement')
			) {
				problem.suggest.push({
					messageId: SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS,
					fix: fixConcat(
						node,
						sourceCode,
						node.arguments.map(node => getConcatArgumentSpreadable(node, scope) || {node, isSpreadable: true})
					)
				});
			}

			return problem;
		},
		[arraySliceCallSelector](node) {
			if (isNodeMatches(node.callee.object, ignoredSliceCallee)) {
				return;
			}

			const [firstArgument] = node.arguments;
			if (firstArgument && !isLiteralValue(firstArgument, 0)) {
				return;
			}

			return {
				node: node.callee.property,
				messageId: ERROR_ARRAY_SLICE,
				fix: fixSlice(node, sourceCode)
			};
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer the spread operator over `Array.from(…)`, `Array#concat(…)` and `Array#slice()`.'
		},
		fixable: 'code',
		messages,
		hasSuggestions: true
	}
};
