import {isRegExp} from 'node:util/types';
import {
	getCommentRange,
	getLineStart,
	isEslintDisableOrEnableDirective,
} from '../utils/index.js';

const LINE_ENDINGS = new Set(['\n', '\r', '\u2028', '\u2029']);
const LINE_ENDING_PATTERN = /\r\n|[\n\r\u{2028}\u{2029}]/v;
const DIRECTIVE_PATTERNS = [
	/^\s*[#@]\s*source(?:Mapping)?URL=/v,
	/^\s*#(?:end)?region\b/v,
	/-\*-.*-\*-/v,
	/^\s*(?:vim?:|Vim:|ex:)/v,
	// A parser can miss an ESLint directive when it reports a shortened comment range.
	/^\s*eslint(?:-env|-enable|-disable(?:-(?:next-)?line)?)?(?:\s|:|$)/v,
	/^\s*(?:jshint|[jt]slint|jscs|globals?|exported|no default|noinspection)(?:\s|:|$)/v,
	/^\s*(?:\*\s*)?flowlint(?:-(?:line|next-line))?(?:\s|:|$)/v,
	/^\s*:/v,
	/^\s*flow-include(?:\s|$)/v,
	/^\s*(?:c8|istanbul|nyc|v8)\s+ignore(?:\s|$)/v,
	/^\s*node:coverage\s+(?:ignore\s+next|disable|enable)(?:\s|$)/v,
	/^\s*(?:biome|deno|dprint|oxlint|prettier)-(?:ignore|lint-ignore|disable|enable)(?:-(?:line|next-line|start|end|file|all))?(?:\s|$)/v,
	/^\s*(?:cspell|spell-checker):/v,
	// TypeScript accepts extra slashes and asterisks before these directives.
	/^\s*(?:[*\/]+\s*)?@ts-(?:ignore|expect-error)/v,
	/^\s*@(?:ts-(?:check|nocheck)|jsx(?:Frag|ImportSource|Runtime|Factory)?|(?:no)?flow|(?:jest|vitest)-environment|noformat|noprettier)(?:\s|:|$)/v,
	/^\s*\$Flow(?:FixMe|ExpectedError)\[[^\]]+\](?:\s|:|$)/v,
	/^\s*[#@]__(?:INLINE|NOINLINE|PURE|KEY|MANGLE_PROP|NO_SIDE_EFFECTS)__\s*$/v,
];

// Scan to the next line ending instead of searching for each kind, since a search for a rare one like `\u2028` scans to the end of the text on every call.
const getLineEnd = (text, index) => {
	let lineEnd = index;
	while (lineEnd < text.length && !LINE_ENDINGS.has(text[lineEnd])) {
		lineEnd++;
	}

	return lineEnd;
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
	text.match(LINE_ENDING_PATTERN)?.[0]
	?? getLineEndingAt(sourceText, lineEnd)
	?? getLineEndingBefore(sourceText, lineStart)
	?? '\n';

const getOpeningDelimiter = text => text.startsWith('/**') && text[3] !== '*' ? '/**' : '/*';

const isDirectiveText = text => DIRECTIVE_PATTERNS.some(pattern => pattern.test(text));

const getIgnorePatterns = ignore => ignore.map(pattern => isRegExp(pattern)
	? new RegExp(pattern.source, pattern.flags)
	: new RegExp(pattern, 'u'));

const getSingleContentLineBlockComment = (context, comment) => {
	if (!['Block', 'BlockComment', 'Comment'].includes(comment.type)) {
		return;
	}

	const sourceText = context.sourceCode.text;
	const commentRange = getCommentRange(context, comment);
	const [start, end] = commentRange;
	const lineStart = getLineStart(sourceText, start);
	const lineEnd = getLineEnd(sourceText, end);
	const indentation = sourceText.slice(lineStart, start);

	if (indentation.trim() !== '' || sourceText.slice(end, lineEnd).trim() !== '') {
		return;
	}

	const text = sourceText.slice(start, end);
	if (!text.startsWith('/*') || !text.endsWith('*/') || text.startsWith('/*!') || isEslintDisableOrEnableDirective(context, comment)) {
		return;
	}

	const opening = getOpeningDelimiter(text);
	const lines = text.slice(opening.length, -2).split(LINE_ENDING_PATTERN).map(line => line.trimStart());
	const contentLines = lines.filter(Boolean);
	if (contentLines.length !== 1) {
		return;
	}

	const contentLine = contentLines[0].trimEnd();
	if (opening === '/**' && contentLine.startsWith('*')) {
		return;
	}

	const normalizedText = lines.join('\n');
	if (isDirectiveText(normalizedText)) {
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
	isDirectiveText,
};
