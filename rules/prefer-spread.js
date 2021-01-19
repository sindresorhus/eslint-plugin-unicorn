'use strict';
const {getStaticValue, isCommaToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const needsSemicolon = require('./utils/needs-semicolon');
const getParentheses = require('./utils/get-parentheses');
const getCallExpressionArgumentsText = require('./utils/get-call-expression-arguments-text');

const ERROR_ARRAY_FROM = 'array-from';
const ERROR_ARRAY_CONCAT = 'array-concat';
const SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE = 'argument-is-spreadable';
const SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE = 'argument-is-not-spreadable';
const messages = {
	[ERROR_ARRAY_FROM]: 'Prefer the spread operator over `Array.from(…)`.',
	[ERROR_ARRAY_CONCAT]: 'Prefer the spread operator over `Array#concat(…)`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE]: 'Argument of `Array#concat(…)` is an `array`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE]: 'Argument of `Array#concat(…)` is not an `array`.'
};

const arrayFromCallSelector = [
	methodSelector({
		object: 'Array',
		name: 'from',
		min: 1,
		max: 3
	}),
	// Allow `Array.from({length})`
	'[arguments.0.type!="ObjectExpression"]'
].join('');

const arrayConcatCallSelector = [
	methodSelector({
		name: 'concat'
	}),
	`:not(${
		[
			'Literal',
			'TemplateLiteral'
		].map(type => `[callee.object.type="${type}"]`).join(', ')
	})`
].join('');

const isArrayLiteral = node => node.type === 'ArrayExpression';

function fixConcat(node, sourceCode, isSpreadable) {
	const array = node.callee.object;
	const [item] = node.arguments;

	const getRangeAfterArray = () => {
		const [, start] = getParenthesizedArrayRange();
		const [, end] = node.range;

		return [start, end];
	};

	const getParenthesizedArrayRange = () => {
		const [firstToken = array, lastToken = array] = getParentheses(array, sourceCode);

		const [start] = firstToken.range;
		const [, end] = lastToken.range;
		return [start, end];
	};

	const getFixedText = () => {
		if (isArrayLiteral(item)) {
			return sourceCode.getText(item, -1, -1);
		}

		const text = getCallExpressionArgumentsText(node, sourceCode);
		return isSpreadable ? `...${text}` : text;
	};

	return function * (fixer) {
		// Fixed code always starts with `[` or `(`
		if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		const rangeAfterArray = getRangeAfterArray();
		let text = getFixedText();

		if (isArrayLiteral(array)) {
			const [penultimateToken, closingBracketToken] = sourceCode.getLastTokens(array, 2);

			if (array.elements.length > 0) {
				text = ` ${text}`;

				if (!isCommaToken(penultimateToken)) {
					text = `,${text}`;
				}
			}

			yield fixer.insertTextBefore(closingBracketToken, text);
		} else {
			yield fixer.insertTextBefore(node, '[...');
			yield fixer.insertTextAfterRange(getParenthesizedArrayRange(), `, ${text}`);
			yield fixer.insertTextAfter(node, ']');
		}

		yield fixer.replaceTextRange(rangeAfterArray, '');
	};
}

const create = context => {
	const sourceCode = context.getSourceCode();
	const getSource = node => sourceCode.getText(node);

	return {
		[arrayFromCallSelector](node) {
			context.report({
				node,
				messageId: ERROR_ARRAY_FROM,
				fix: fixer => {
					const [arrayLikeArgument, mapFn, thisArgument] = node.arguments.map(node => getSource(node));
					let replacement = `${
						needsSemicolon(sourceCode.getTokenBefore(node), sourceCode) ? ';' : ''
					}[...${arrayLikeArgument}]`;

					if (mapFn) {
						const mapArguments = [mapFn, thisArgument].filter(Boolean);
						replacement += `.map(${mapArguments.join(', ')})`;
					}

					return fixer.replaceText(node, replacement);
				}
			});
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

			const [item] = node.arguments;
			if (node.arguments.length !== 1 || item.type === 'SpreadElement') {
				context.report(problem);
				return;
			}

			let isItemArray;
			if (isArrayLiteral(item)) {
				isItemArray = true;
			} else {
				const result = getStaticValue(item, scope);

				if (result) {
					isItemArray = Array.isArray(result.value);
				}
			}

			if (isItemArray === true) {
				problem.fix = fixConcat(node, sourceCode, /* isSpreadable */ true);
			} else if (isItemArray === false) {
				problem.fix = fixConcat(node, sourceCode, /* isSpreadable */ false);
			} else {
				problem.suggest = [
					{
						messageId: SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE,
						fix: fixConcat(node, sourceCode, /* isSpreadable */ true)
					},
					{
						messageId: SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE,
						fix: fixConcat(node, sourceCode, /* isSpreadable */ false)
					}
				];
			}

			context.report(problem);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
