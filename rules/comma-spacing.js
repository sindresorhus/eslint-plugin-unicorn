/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_BEFORE = 'comma-spacing/before';
const MESSAGE_ID_AFTER = 'comma-spacing/after';
const messages = {
	[MESSAGE_ID_BEFORE]: 'Do not add whitespace before commas.',
	[MESSAGE_ID_AFTER]: 'Expected exactly one space after commas.',
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const getProblem = (comma, range, expected, messageId) => {
		const actual = sourceCode.text.slice(...range);
		// Preserve line breaks, including Unicode separators that JSON5's parser does not count as new lines.
		if (actual === expected || /[\n\r\u2028\u2029]/.test(actual)) {
			return;
		}

		return {
			loc: sourceCode.getLoc(comma),
			messageId,
			/**
			@param {ESLint.Rule.RuleFixer} fixer
			*/
			fix: fixer => fixer.replaceTextRange(range, expected),
		};
	};

	context.on('Document', function * (node) {
		const tokens = sourceCode.getTokens?.(node, {includeComments: true}) ?? node.tokens;
		for (const [index, token] of tokens.entries()) {
			if (token.type !== 'Comma' && !(token.type === 'Punctuator' && token.value === ',')) {
				continue;
			}

			const [start, end] = sourceCode.getRange(token);
			yield getProblem(token, [sourceCode.getRange(tokens[index - 1])[1], start], '', MESSAGE_ID_BEFORE);

			const nextToken = tokens[index + 1];
			if (nextToken.type === 'RBracket' || nextToken.type === 'RBrace' || (nextToken.type === 'Punctuator' && (nextToken.value === ']' || nextToken.value === '}'))) {
				continue;
			}

			yield getProblem(token, [end, sourceCode.getRange(nextToken)[0]], ' ', MESSAGE_ID_AFTER);
		}
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce consistent spacing before and after commas in JSON and SOML.',
			recommended: false,
		},
		fixable: 'whitespace',
		schema: [],
		messages,
		languages: [
			'json/json',
			'json/jsonc',
			'json/json5',
			'soml/soml',
		],
	},
};

export default config;
