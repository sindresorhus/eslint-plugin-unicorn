import {isRegExp} from 'node:util/types';
import {getCommentRange, linebreakPattern} from '../utils/index.js';
import isToolingDirective from './comment-directive.js';

const LINE_ENDINGS = new Set(['\n', '\r', '\u2028', '\u2029']);

const isLineBoundary = character => character === undefined || LINE_ENDINGS.has(character);
const isInlineWhitespace = character => character?.trim() === '' && !LINE_ENDINGS.has(character);

// Stop at code so checking inline comments does not repeatedly scan across a long line.
const getStandaloneLineBounds = (text, [start, end]) => {
	let lineStart = start;
	while (isInlineWhitespace(text[lineStart - 1])) {
		lineStart--;
	}

	if (!isLineBoundary(text[lineStart - 1])) {
		return;
	}

	let lineEnd = end;
	while (isInlineWhitespace(text[lineEnd])) {
		lineEnd++;
	}

	if (!isLineBoundary(text[lineEnd])) {
		return;
	}

	return [lineStart, lineEnd];
};

const getLineEndingAt = (text, index) => {
	if (text.startsWith('\r\n', index)) {
		return '\r\n';
	}

	return LINE_ENDINGS.has(text[index]) ? text[index] : undefined;
};

const getLineEndingBefore = (text, lineStart) => {
	const lineEndingIndex = lineStart - 1;

	if (lineEndingIndex === -1) {
		return;
	}

	const start = text[lineEndingIndex] === '\n' && text[lineEndingIndex - 1] === '\r'
		? lineEndingIndex - 1
		: lineEndingIndex;

	return getLineEndingAt(text, start);
};

const getBlockCommentLineEnding = (sourceText, {text, lineStart, lineEnd}) =>
	text.match(linebreakPattern)?.[0]
	?? getLineEndingAt(sourceText, lineEnd)
	?? getLineEndingBefore(sourceText, lineStart)
	?? '\n';

const getOpeningDelimiter = text => text.startsWith('/**') && text[3] !== '*' ? '/**' : '/*';

const getIgnorePatterns = ignore => ignore.map(pattern => isRegExp(pattern)
	? new RegExp(pattern.source, pattern.flags)
	: new RegExp(pattern, 'u'));

const getSingleContentLineBlockComment = (context, comment) => {
	if (!['Block', 'BlockComment', 'Comment'].includes(comment.type)) {
		return;
	}

	const sourceText = context.sourceCode.text;
	const commentRange = getCommentRange(context, comment);
	const lineBounds = getStandaloneLineBounds(sourceText, commentRange);
	if (!lineBounds) {
		return;
	}

	const [lineStart, lineEnd] = lineBounds;
	const indentation = sourceText.slice(lineStart, commentRange[0]);
	const text = sourceText.slice(...commentRange);
	if (!text.startsWith('/*') || !text.endsWith('*/') || text.startsWith('/*!')) {
		return;
	}

	const opening = getOpeningDelimiter(text);
	const lines = text.slice(opening.length, -2).split(linebreakPattern).map(line => line.trimStart());
	const contentLines = lines.filter(Boolean);
	if (contentLines.length !== 1) {
		return;
	}

	const contentLine = contentLines[0].trimEnd();
	if (opening === '/**' && contentLine.startsWith('*')) {
		return;
	}

	const normalizedText = lines.join('\n');
	if (isToolingDirective(normalizedText)) {
		return;
	}

	return {
		commentRange, text, opening, contentLine, lines, normalizedText, indentation, lineStart, lineEnd,
	};
};

const ignoreOptionSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		ignore: {
			type: 'array',
			items: {
				type: ['string', 'object'],
				additionalProperties: true,
			},
			uniqueItems: true,
			description: 'Regular expressions to ignore.',
		},
	},
};

export {
	getBlockCommentLineEnding,
	getIgnorePatterns,
	getSingleContentLineBlockComment,
	ignoreOptionSchema,
};
