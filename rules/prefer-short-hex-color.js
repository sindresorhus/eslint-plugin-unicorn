import {ident, tokenize, tokenTypes} from '@eslint/css-tree';
import {toLocation} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-short-hex-color';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

const longHexColorPattern = /^(?:[\da-f]{6}|[\da-f]{8})$/iu;
const nonColorFunctionNames = new Set(['-moz-element', 'element', 'url']);

function getShortHexColor(value) {
	if (!longHexColorPattern.test(value)) {
		return;
	}

	let replacement = '#';
	for (let index = 0; index < value.length; index += 2) {
		if (value[index].toLowerCase() !== value[index + 1].toLowerCase()) {
			return;
		}

		replacement += value[index];
	}

	return replacement;
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', declaration => {
		const valueText = sourceCode.getText(declaration.value);
		const [valueStart] = sourceCode.getRange(declaration.value);
		const problems = [];
		const nonColorFunctionStack = [];

		tokenize(valueText, (type, start, end) => {
			if (type === tokenTypes.Function) {
				const functionName = ident.decode(valueText.slice(start, end - 1)).toLowerCase();
				nonColorFunctionStack.push(nonColorFunctionStack.at(-1) === true || nonColorFunctionNames.has(functionName));
				return;
			}

			if (type === tokenTypes.LeftParenthesis) {
				nonColorFunctionStack.push(nonColorFunctionStack.at(-1) === true);
				return;
			}

			if (type === tokenTypes.RightParenthesis) {
				nonColorFunctionStack.pop();
				return;
			}

			if (type !== tokenTypes.Hash || nonColorFunctionStack.at(-1) === true) {
				return;
			}

			const value = valueText.slice(start + 1, end);
			const replacement = getShortHexColor(value);
			if (!replacement) {
				return;
			}

			const range = [valueStart + start, valueStart + end];
			problems.push({
				node: declaration,
				loc: toLocation(range, context),
				messageId: MESSAGE_ID,
				data: {value: `#${value}`, replacement},
				fix: fixer => fixer.replaceTextRange(range, replacement),
			});
		});

		return problems;
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer short hexadecimal color notation.',
			recommended: false,
		},
		fixable: 'code',
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
