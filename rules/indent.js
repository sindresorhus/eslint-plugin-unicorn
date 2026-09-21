import {tokenize, tokenTypes} from '@eslint/css-tree';

const MESSAGE_ID = 'indent';
const messages = {
	[MESSAGE_ID]: 'Expected indentation of {{expected}} {{unit}}.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {indent, tabWidth} = context.options[0];
	const indentUnit = indent === 'tab' ? '\t' : ' '.repeat(indent);

	const getProblem = (start, end, expected) => {
		const actual = sourceCode.text.slice(start, end);
		// JSON5's parser does not count Unicode line separators as line breaks. Preserve them.
		if (actual === expected || /[\u2028\u2029]/.test(actual)) {
			return;
		}

		const unit = indent === 'tab' ? 'tab' : 'space';
		return {
			loc: {
				start: sourceCode.getLocFromIndex(start),
				end: sourceCode.getLocFromIndex(Math.max(start + 1, end)),
			},
			messageId: MESSAGE_ID,
			data: {
				expected: expected.length,
				unit: expected.length === 1 ? unit : `${unit}s`,
			},
			fix: fixer => fixer.replaceTextRange([start, end], expected),
		};
	};

	context.on('Document', function * (node) {
		let depth = 0;
		let lastLine = 0;

		for (const token of node.tokens) {
			const {start, end} = sourceCode.getLoc(token);
			const [tokenStart] = sourceCode.getRange(token);
			if (token.type === 'RBrace' || token.type === 'RBracket') {
				depth--;
			}

			if (start.line > lastLine) {
				const lineStart = tokenStart - start.column + 1;
				const expected = indentUnit.repeat(depth);
				yield getProblem(lineStart, tokenStart, expected);
			}

			if (token.type === 'LBrace' || token.type === 'LBracket') {
				depth++;
			}

			// Continuation lines belong to the token, including multiline comments and JSON5 strings.
			lastLine = end.line;
		}
	});

	context.on('StyleSheet', function * () {
		const whitespaceRanges = [];
		tokenize(sourceCode.text, (type, start, end) => {
			if (type === tokenTypes.WhiteSpace) {
				whitespaceRanges.push([start, end]);
			}
		});

		let whitespaceIndex = 0;
		for (const [index, line] of sourceCode.lines.entries()) {
			const actual = line.match(/^[\t ]*/)[0];
			if (actual.length === 0 || actual.length === line.length) {
				continue;
			}

			const start = sourceCode.getIndexFromLoc({line: index + 1, column: 1});
			const end = start + actual.length;
			while (whitespaceRanges[whitespaceIndex]?.[1] <= start) {
				whitespaceIndex++;
			}

			const whitespaceRange = whitespaceRanges[whitespaceIndex];
			// Only edit complete prefixes made of whitespace tokens, never string contents or escaped identifiers.
			if (!whitespaceRange || whitespaceRange[0] > start || whitespaceRange[1] < end) {
				continue;
			}

			let width = 0;
			for (const character of actual) {
				width += character === '\t' ? tabWidth - (width % tabWidth) : 1;
			}

			const unitWidth = indent === 'tab' ? tabWidth : indent;
			const expected = indentUnit.repeat(Math.ceil(width / unitWidth));
			yield getProblem(start, end, expected);
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce consistent indentation in JSON and CSS.',
			recommended: false,
		},
		fixable: 'whitespace',
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					indent: {
						oneOf: [
							{enum: ['tab'], description: 'Use tabs.'},
							{type: 'integer', minimum: 1, description: 'Number of spaces per indentation unit.'},
						],
						description: 'Use tabs or the specified number of spaces per indentation unit.',
					},
					tabWidth: {
						type: 'integer',
						minimum: 1,
						description: 'Tab stop width used when converting CSS indentation.',
					},
				},
			},
		],
		defaultOptions: [{indent: 'tab', tabWidth: 4}],
		messages,
		languages: [
			'css/css',
			'json/json',
			'json/jsonc',
			'json/json5',
		],
	},
};

export default config;
