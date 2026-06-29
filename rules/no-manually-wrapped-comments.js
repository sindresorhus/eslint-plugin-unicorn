import {
	isEslintDisableOrEnableDirective,
	getComments,
	normalizeComment,
	onRoot,
} from './utils/index.js';

const MESSAGE_ID = 'no-manually-wrapped-comments';
const messages = {
	[MESSAGE_ID]: 'Avoid manually wrapping comments.',
};

// Trailing `:` marks a complete line (heading, label, list intro), not a wrapped sentence.
const sentenceEndPattern = /(?:[\p{Extended_Pictographic}!.:?]\p{Variation_Selector}?|\p{RGI_Emoji})$/v;
const directiveCommentPattern = /^(?:[#\/@]|eslint(?:$|\s|-)|globals?\b|exported\b|no default$|noinspection\b|(?:c8|istanbul|v8)\s+ignore\b|(?:biome|deno|dprint|oxlint|prettier)-|(?:cspell|spell-checker):)/v;
const annotationCommentPattern = /^[A-Z]{2,}(?:\([^\)]+\))?:/v;
const spdxCommentPattern = /^SPDX-/v;
const copyrightCommentPattern = /^(?:©|copyright\b)/iv;
// Editor modelines: vim (`vim:`, `vi:`) and Emacs (`-*- … -*-`).
const modelineCommentPattern = /^(?:vim?:|-\*-)/v;
const structuredCommentPattern = /^(?:language=\S+|(?:end)?region(?:$|\s)|<\/?editor-fold\b)/v;
const listCommentPattern = /^(?:[*+\-]\s|\d+(?:\.|\))\s)/v;
const separatorCommentPattern = /^[#*\-=_~]{3,}$/v;
const urlPattern = /\bhttps?:\/\/|www\./v;
const codeCharacters = ['`', '{', '}', '(', ')', '[', ']'];

const getCommentText = comment => comment.value.trim();

const endsWithSentencePunctuation = comment => sentenceEndPattern.test(getCommentText(comment));

const isIgnoredCommentText = text =>
	directiveCommentPattern.test(text)
	|| annotationCommentPattern.test(text)
	|| spdxCommentPattern.test(text)
	|| copyrightCommentPattern.test(text)
	|| modelineCommentPattern.test(text)
	|| structuredCommentPattern.test(text)
	|| listCommentPattern.test(text)
	|| separatorCommentPattern.test(text)
	|| urlPattern.test(text)
	|| codeCharacters.some(character => text.includes(character));

const getLinePrefix = (sourceCode, comment) => {
	const [start] = sourceCode.getRange(comment);
	const lineStart = sourceCode.text.lastIndexOf('\n', start - 1) + 1;
	return sourceCode.text.slice(lineStart, start);
};

const isStandaloneLineComment = (sourceCode, comment) => (
	comment.type === 'Line'
	&& getCommentText(comment).length > 0
	&& !isIgnoredCommentText(getCommentText(comment))
	&& getLinePrefix(sourceCode, comment).trim() === ''
);

const isConsecutiveComment = (sourceCode, firstComment, secondComment) => {
	const firstCommentLocation = sourceCode.getLoc(firstComment);
	const secondCommentLocation = sourceCode.getLoc(secondComment);

	return firstCommentLocation.end.line + 1 === secondCommentLocation.start.line
		&& firstCommentLocation.start.column === secondCommentLocation.start.column;
};

const isBlankLine = (sourceCode, line) => line < 1 || line > sourceCode.lines.length || sourceCode.lines[line - 1].trim() === '';

const getLineCommentText = lineText => {
	const trimmedLineText = lineText.trim();
	return trimmedLineText.startsWith('//') ? trimmedLineText.slice(2).trim() : undefined;
};

const isSeparatedBeforeCommentGroup = (sourceCode, comment) => {
	const {line} = sourceCode.getLoc(comment).start;

	if (isBlankLine(sourceCode, line - 1)) {
		return true;
	}

	const previousLineCommentText = getLineCommentText(sourceCode.lines[line - 2]);
	return previousLineCommentText !== undefined && sentenceEndPattern.test(previousLineCommentText);
};

const isSeparatedAfterCommentGroup = (sourceCode, comment) => {
	const {line} = sourceCode.getLoc(comment).end;

	return isBlankLine(sourceCode, line + 1)
		|| (
			getLineCommentText(sourceCode.lines[line]) !== undefined
			&& endsWithSentencePunctuation(comment)
		);
};

const isSeparatedCommentGroup = (sourceCode, comments) =>
	isSeparatedBeforeCommentGroup(sourceCode, comments[0])
	&& isSeparatedAfterCommentGroup(sourceCode, comments.at(-1));

const isWrappedCommentBoundary = (context, firstComment, secondComment) => {
	const {sourceCode} = context;

	return isStandaloneLineComment(sourceCode, firstComment)
		&& isStandaloneLineComment(sourceCode, secondComment)
		&& !isEslintDisableOrEnableDirective(context, firstComment)
		&& !isEslintDisableOrEnableDirective(context, secondComment)
		&& isConsecutiveComment(sourceCode, firstComment, secondComment)
		&& !endsWithSentencePunctuation(firstComment);
};

const fixCommentGroup = (context, comments) => fixer => {
	const {sourceCode} = context;
	const firstComment = comments[0];
	const lastComment = comments.at(-1);
	const text = comments.map(comment => getCommentText(comment)).join(' ');
	const range = [
		sourceCode.getRange(firstComment)[0],
		sourceCode.getRange(lastComment)[1],
	];

	return fixer.replaceTextRange(range, `// ${text}`);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	onRoot(context, function * () {
		const comments = getComments(context).map(comment => normalizeComment(comment, context));

		for (let index = 0; index < comments.length; index++) {
			const group = [comments[index]];

			while (
				index + group.length < comments.length
				&& isWrappedCommentBoundary(context, group.at(-1), comments[index + group.length])
			) {
				group.push(comments[index + group.length]);
			}

			if (group.length === 1) {
				continue;
			}

			index += group.length - 1;

			if (!isSeparatedCommentGroup(context.sourceCode, group)) {
				continue;
			}

			yield {
				node: group[0],
				messageId: MESSAGE_ID,
				fix: fixCommentGroup(context, group),
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Disallow manually wrapped comments.',
			// TODO: Enable in the recommended preset after more real-world use; currently opt-in because comment prose heuristics can be noisy.
			recommended: false,
		},
		fixable: 'whitespace',
		messages,
		languages: [
			'js/js',
			'json/jsonc',
			'json/json5',
		],
	},
};

export default config;
