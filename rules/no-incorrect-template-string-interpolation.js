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

// `{foo}` at the start of an `import`/`export`/`const`/`let`/`var` line is a named specifier or destructuring pattern, not a missing-dollar mistake (common in code-generation templates). Requiring no `=` (or `;`/`{`/`}`) before it keeps object literals like `const x = {foo}` reported.
const isBindingDeclaration = (raw, index) => {
	const lineStart = raw.lastIndexOf('\n', index - 1) + 1;
	return /^\s*(?:import|export|const|let|var)\b[^;={}]*$/.test(raw.slice(lineStart, index));
};

// `{type}` and `$expr}` inside an embedded block comment (e.g. JSDoc `@param {string}`) are not template interpolation mistakes (common in code-generation templates). Only closed `/* … */` comments count, so a stray `/*` inside a string doesn't suppress a genuine match.
const getBlockCommentRanges = raw => raw.matchAll(/\/\*[\s\S]*?\*\//g)
	.map(match => [match.index, match.index + match[0].length])
	.toArray();

const isInsideRanges = (ranges, index) => ranges.some(([start, end]) => index >= start && index < end);

const getTemplateElementRawRange = (node, sourceCode) => {
	const [start, end] = sourceCode.getRange(node);

	return [
		start + 1,
		end - (node.tail ? 1 : 2),
	];
};

const getTemplateRawWithExpressionsMasked = (node, sourceCode) => {
	const [templateStart, templateEnd] = sourceCode.getRange(node);
	const rawStart = templateStart + 1;
	let raw = sourceCode.text.slice(rawStart, templateEnd - 1);

	for (const [index, quasi] of node.quasis.entries()) {
		const nextQuasi = node.quasis[index + 1];

		if (!nextQuasi) {
			break;
		}

		const [, quasiRawEnd] = getTemplateElementRawRange(quasi, sourceCode);
		const [nextQuasiRawStart] = getTemplateElementRawRange(nextQuasi, sourceCode);
		const maskStart = quasiRawEnd - rawStart;
		const maskEnd = nextQuasiRawStart - rawStart;

		raw = raw.slice(0, maskStart) + ' '.repeat(maskEnd - maskStart) + raw.slice(maskEnd);
	}

	return raw;
};

const getMissingDollarReplacements = raw => raw.matchAll(missingDollar)
	.filter(match => !isBindingDeclaration(raw, match.index))
	.map(match => ({
		index: match.index,
		incorrect: match[0],
		correct: `$${match[0]}`,
	}))
	.toArray();

const getMissingOpeningBraceReplacements = raw => raw.matchAll(missingOpeningBrace)
	.map(match => ({
		index: match.index,
		incorrect: match[0],
		correct: `\${${match.groups.expression}}`,
	}))
	.toArray();

const getReplacements = (raw, blockCommentRanges, rawOffset) => {
	const replacements = [
		...getMissingDollarReplacements(raw),
		...getMissingOpeningBraceReplacements(raw),
	];

	if (replacements.length === 0) {
		return replacements;
	}

	return replacements
		.filter(replacement => !isInsideRanges(blockCommentRanges, rawOffset + replacement.index))
		.toSorted((replacement, nextReplacement) => replacement.index - nextReplacement.index);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('TemplateLiteral', function * (node) {
		if (isTaggedTemplateLiteral(node)) {
			return;
		}

		const templateRawStart = context.sourceCode.getRange(node)[0] + 1;
		const blockCommentRanges = getBlockCommentRanges(getTemplateRawWithExpressionsMasked(node, context.sourceCode));

		for (const quasi of node.quasis) {
			const [rawStart, rawEnd] = getTemplateElementRawRange(quasi, context.sourceCode);
			const raw = context.sourceCode.text.slice(rawStart, rawEnd);
			const rawOffset = rawStart - templateRawStart;

			for (const {index, incorrect, correct} of getReplacements(raw, blockCommentRanges, rawOffset)) {
				const start = rawStart + index;
				const end = start + incorrect.length;

				yield {
					node: quasi,
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
			recommended: true,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
