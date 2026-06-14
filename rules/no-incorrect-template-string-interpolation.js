import {isTaggedTemplateLiteral} from './ast/index.js';

const MESSAGE_ID = 'no-incorrect-template-string-interpolation';
const MESSAGE_ID_SUGGESTION = 'no-incorrect-template-string-interpolation/suggestion';

const messages = {
	[MESSAGE_ID]: 'Use `{{correct}}` for template literal interpolation.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{incorrect}}` with `{{correct}}`.',
};

const identifier = String.raw`[$A-Z_a-z][\w$]*`;
const memberExpression = String.raw`${identifier}(?:\.${identifier})*`;

const missingDollar = new RegExp(String.raw`(?<![$\\])(?<!\{)\{(?<expression>${memberExpression})\}(?!\})`, 'gv');
const missingOpeningBrace = new RegExp(String.raw`(?<!\\)(?<!\{)\$(?<expression>${memberExpression})\}(?!\})`, 'gv');

const getMissingDollarReplacements = raw => Array.from(raw.matchAll(missingDollar), match => ({
	index: match.index,
	incorrect: match[0],
	correct: `$${match[0]}`,
}));

const getMissingOpeningBraceReplacements = raw => Array.from(raw.matchAll(missingOpeningBrace), match => ({
	index: match.index,
	incorrect: match[0],
	correct: `\${${match.groups.expression}}`,
}));

const getReplacements = raw => {
	const replacements = [
		...getMissingDollarReplacements(raw),
		...getMissingOpeningBraceReplacements(raw),
	];

	return replacements.toSorted((replacement, nextReplacement) => replacement.index - nextReplacement.index);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('TemplateElement', function * (node) {
		if (isTaggedTemplateLiteral(node.parent)) {
			return;
		}

		const rawStart = context.sourceCode.getRange(node)[0] + 1;

		for (const {index, incorrect, correct} of getReplacements(node.value.raw)) {
			const start = rawStart + index;
			const end = start + incorrect.length;

			yield {
				node,
				loc: {
					start: context.sourceCode.getLocFromIndex(start),
					end: context.sourceCode.getLocFromIndex(end),
				},
				messageId: MESSAGE_ID,
				data: {
					correct,
				},
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							incorrect,
							correct,
						},
						fix: fixer => fixer.replaceTextRange([start, end], correct),
					},
				],
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow incorrect template literal interpolation syntax.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
