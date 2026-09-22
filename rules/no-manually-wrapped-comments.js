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
const directiveCommentPattern = /^(?:[#\/@]|eslint(?:$|\s|-)|globals?\b|exported\b|no default$|noinspection\b|yamllint(?:$|\s)|(?:c8|istanbul|v8)\s+ignore\b|(?:biome|deno|dprint|oxlint|prettier)-|(?:cspell|spell-checker):)/v;
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

const isProseText = text => text.length > 0 && !isIgnoredCommentText(text);

const isStandaloneLineComment = (sourceCode, comment) => (
	(comment.type === 'Line' || getLineCommentPrefix(sourceCode) === '#')
	&& isProseText(getCommentText(comment))
	&& getLinePrefix(sourceCode, comment).trim() === ''
);

const isStandaloneMultilineBlockComment = (sourceCode, comment) => {
	const {start, end} = sourceCode.getLoc(comment);
	return comment.type === 'Block'
		&& start.line !== end.line
		&& getLinePrefix(sourceCode, comment).trim() === '';
};

const isConsecutiveComment = (sourceCode, firstComment, secondComment) => {
	const firstCommentLocation = sourceCode.getLoc(firstComment);
	const secondCommentLocation = sourceCode.getLoc(secondComment);

	return firstCommentLocation.end.line + 1 === secondCommentLocation.start.line
		&& firstCommentLocation.start.column === secondCommentLocation.start.column;
};

const isBlankLine = (sourceCode, line) => line < 1 || line > sourceCode.lines.length || sourceCode.lines[line - 1].trim() === '';

const getLineCommentPrefix = sourceCode => sourceCode.parserServices?.isTOML || sourceCode.parserServices?.isYAML ? '#' : '//';

const getLineCommentText = (sourceCode, lineText) => {
	const trimmedLineText = lineText.trim();
	const prefix = getLineCommentPrefix(sourceCode);
	return trimmedLineText.startsWith(prefix) ? trimmedLineText.slice(prefix.length).trim() : undefined;
};

const isSeparatedBeforeCommentGroup = (sourceCode, comment) => {
	const {line} = sourceCode.getLoc(comment).start;

	if (isBlankLine(sourceCode, line - 1)) {
		return true;
	}

	const previousLineCommentText = getLineCommentText(sourceCode, sourceCode.lines[line - 2]);
	return previousLineCommentText !== undefined && sentenceEndPattern.test(previousLineCommentText);
};

const isSeparatedAfterCommentGroup = (sourceCode, comment) => {
	const {line} = sourceCode.getLoc(comment).end;

	return isBlankLine(sourceCode, line + 1)
		|| (
			getLineCommentText(sourceCode, sourceCode.lines[line]) !== undefined
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

/**
Split a block comment into its lines, without the surrounding whitespace and the optional leading `*` of each line.

@returns {Array<{text: string, start: number, end: number}>}
*/
const getBlockCommentLines = (sourceCode, comment) => {
	const lines = [];
	let offset = sourceCode.getRange(comment)[0] + '/*'.length;

	for (const line of comment.value.split('\n')) {
		let content = line.trimStart();
		if (content.startsWith('*')) {
			content = content.slice(1).trimStart();
		}

		const text = content.trimEnd();
		const start = offset + line.length - content.length;
		lines.push({text, start, end: start + text.length});
		offset += line.length + 1;
	}

	return lines;
};

// The start and end of a block comment separate its content from the surrounding code, like a blank line does.
const isBlankLineOrCommentEdge = line => line === undefined || line.text === '';

// License headers are standard texts that should stay verbatim, including their wrapping.
const isLicenseLine = ({text}) => copyrightCommentPattern.test(text) || spdxCommentPattern.test(text) || text.startsWith('@license');

function * getBlockCommentProblems(context, comment) {
	const {sourceCode} = context;
	const lines = getBlockCommentLines(sourceCode, comment);

	if (lines.some(line => isLicenseLine(line))) {
		return;
	}

	for (let index = 0; index < lines.length; index++) {
		if (!isProseText(lines[index].text)) {
			continue;
		}

		const group = [lines[index]];

		while (
			index + group.length < lines.length
			&& !sentenceEndPattern.test(group.at(-1).text)
			&& isProseText(lines[index + group.length].text)
		) {
			group.push(lines[index + group.length]);
		}

		if (group.length === 1) {
			continue;
		}

		const previousLine = lines[index - 1];
		const nextLine = lines[index + group.length];
		index += group.length - 1;

		// Mirrors `isSeparatedCommentGroup` for line comments.
		const isSeparatedBefore = isBlankLineOrCommentEdge(previousLine) || sentenceEndPattern.test(previousLine.text);
		const isSeparatedAfter = isBlankLineOrCommentEdge(nextLine) || sentenceEndPattern.test(group.at(-1).text);

		if (!isSeparatedBefore || !isSeparatedAfter) {
			continue;
		}

		const range = [group[0].start, group.at(-1).end];

		yield {
			loc: {
				start: sourceCode.getLocFromIndex(range[0]),
				end: sourceCode.getLocFromIndex(range[1]),
			},
			messageId: MESSAGE_ID,
			fix: fixer => fixer.replaceTextRange(range, group.map(line => line.text).join(' ')),
		};
	}
}

const fixCommentGroup = (context, comments) => fixer => {
	const {sourceCode} = context;
	const firstComment = comments[0];
	const lastComment = comments.at(-1);
	const text = comments.map(comment => getCommentText(comment)).join(' ');
	const range = [
		sourceCode.getRange(firstComment)[0],
		sourceCode.getRange(lastComment)[1],
	];

	return fixer.replaceTextRange(range, `${getLineCommentPrefix(sourceCode)} ${text}`);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	onRoot(context, function * () {
		const comments = getComments(context).map(comment => normalizeComment(comment, context));

		for (let index = 0; index < comments.length; index++) {
			if (isStandaloneMultilineBlockComment(context.sourceCode, comments[index])) {
				yield * getBlockCommentProblems(context, comments[index]);
				continue;
			}

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

/**
@type {import('eslint').Rule.RuleModule}
*/
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
			'css/css',
			'json/jsonc',
			'json/json5',
			'toml/toml',
			'yml/yaml',
		],
	},
};

export default config;
