import {isRegExp} from 'node:util/types';
import {
	getComments,
	getLinePrefix,
	getLineStart,
	isEslintDisableOrEnableDirective,
	matchesAnyRegExp,
	onRoot,
} from './utils/index.js';

const MESSAGE_ID = 'single-line-block-comment-style';
const MERGE_SUGGESTION_ID = 'merge-adjacent-block-comments';
const MULTILINE = 'multiline';
const SINGLE_LINE = 'single-line';
const LINE_ENDINGS = new Set(['\n', '\r', '\u2028', '\u2029']);
const LINE_ENDING_PATTERN = /\r\n|[\n\r\u{2028}\u{2029}]/v;
// Unicode line separators can be tokens in CSS. Use only CR and LF as line boundaries for merging.
const ADJACENT_COMMENT_GAP = /^[\t ]*(?:\r\n|[\n\r])[\t ]*$/v;
const DIRECTIVE_PATTERNS = [
	/^\s*[#@]\s*source(?:Mapping)?URL=/v,
	/^\s*(?:eslint(?:-env)?|jshint|[jt]slint|jscs|globals?|exported|no default|noinspection)(?:\s|:|$)/v,
	/^\s*(?:\*\s*)?flowlint(?:-(?:line|next-line))?(?:\s|:|$)/v,
	/^\s*::?/v,
	/^\s*flow-include(?:\s|$)/v,
	/^\s*(?:c8|istanbul|nyc|v8)\s+ignore(?:\s|$)/v,
	/^\s*node:coverage\s+(?:ignore\s+next|disable|enable)(?:\s|$)/v,
	/^\s*(?:biome|deno|dprint|oxlint|prettier)-(?:ignore|lint-ignore|disable|enable)(?:-(?:line|next-line|start|end|file|all))?(?:\s|$)/v,
	/^\s*(?:cspell|spell-checker):/v,
];
const LANGUAGE_DIRECTIVE_PATTERNS = [
	/^\s*@(?:ts-(?:check|nocheck|ignore|expect-error)|jsx(?:Frag|ImportSource|Runtime|Factory)?|(?:no)?flow|(?:jest|vitest)-environment|noformat|noprettier)(?:\s|:|$)/v,
	/^\s*\$Flow(?:FixMe|ExpectedError)\[[^\]]+\](?:\s|:|$)/v,
];
const MINIFIER_DIRECTIVE_PATTERN = /^\s*[#@]__(?:INLINE|NOINLINE|PURE|KEY|MANGLE_PROP|NO_SIDE_EFFECTS)__\s*$/v;
const MERGE_SENSITIVE_PATTERNS = [
	/\bwebpack[A-Z][A-Za-z]*:/v,
	/^\*?\s*@/v,
	/^stylelint-(?:disable|enable)\b/v,
	/\bautoprefixer(?:\s+grid)?\s*:/iv,
	/^!?\s*rtl\s*:/v,
	/purgecss\s+(?:(?:start|end)\s+)?ignore/v,
	/@(?:license|copyright|preserve|cc_on)\b/iv,
	/\bSPDX-(?:License-Identifier|FileCopyrightText):/v,
	/[#@]__[A-Z_]+__/v,
];

const messages = {
	[MESSAGE_ID]: 'Use a {{style}} block comment.',
	[MERGE_SUGGESTION_ID]: 'Merge adjacent block comments.',
};

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

const getLineEndingBefore = (text, index) => {
	const lineEndingIndex = getLineStart(text, index) - 1;

	if (lineEndingIndex === -1) {
		return;
	}

	const start = text[lineEndingIndex] === '\n' && text[lineEndingIndex - 1] === '\r'
		? lineEndingIndex - 1
		: lineEndingIndex;

	return getLineEndingAt(text, start);
};

const getLineSuffix = (sourceCode, end) => sourceCode.text.slice(end, getLineEnd(sourceCode.text, end));

const isStandalone = (context, [start, end]) => (
	getLinePrefix(context, start).trim() === ''
	&& getLineSuffix(context.sourceCode, end).trim() === ''
);

const getLineEnding = (sourceCode, [start, end], content) =>
	content.match(LINE_ENDING_PATTERN)?.[0]
	?? getLineEndingAt(sourceCode.text, getLineEnd(sourceCode.text, end))
	?? getLineEndingBefore(sourceCode.text, start)
	?? getLineEndingAt(sourceCode.text, getLineEnd(sourceCode.text, 0))
	?? '\n';

const getOpeningDelimiter = text => text.startsWith('/**') && text[3] !== '*' ? '/**' : '/*';

const getCommentText = (comment, opening, context) => context.sourceCode.getText(comment).slice(2, -2)
	.split(LINE_ENDING_PATTERN)
	.map(line => line.replace(opening === '/**' ? /^\s*\*?\s*/v : /^\s*/v, ''))
	.join('\n');

const isDirectiveText = commentText =>
	DIRECTIVE_PATTERNS.some(pattern => pattern.test(commentText))
	|| LANGUAGE_DIRECTIVE_PATTERNS.some(pattern => pattern.test(commentText))
	|| MINIFIER_DIRECTIVE_PATTERN.test(commentText);

const isIgnoredComment = (context, comment, opening, ignorePatterns) => {
	if (isEslintDisableOrEnableDirective(context, comment)) {
		return true;
	}

	const commentText = getCommentText(comment, opening, context);
	return matchesAnyRegExp(commentText, ignorePatterns) || isDirectiveText(commentText);
};

const getIgnorePatterns = ignore => ignore.map(pattern => isRegExp(pattern)
	? new RegExp(pattern.source, pattern.flags)
	: new RegExp(pattern, 'u'));

const getContentLines = content => content.split(LINE_ENDING_PATTERN);

const getSingleContentLine = content => {
	const contentLines = getContentLines(content).filter(line => line.trim() !== '');

	if (contentLines.length !== 1) {
		return;
	}

	return contentLines[0].trim();
};

const hasAsteriskPrefix = (content, opening) =>
	opening === '/**' && getContentLines(content).some(line => /^\s*\*/v.test(line));

const isCanonicalMultiline = content => {
	const lines = getContentLines(content);
	return lines.length === 3 && lines[0].trim() === '' && lines[2].trim() === '';
};

const getProblem = (context, comment, style, ignorePatterns) => {
	if (!['Block', 'BlockComment', 'Comment'].includes(comment.type)) {
		return;
	}

	const {sourceCode} = context;
	const range = sourceCode.getRange(comment);

	if (!isStandalone(context, range)) {
		return;
	}

	const text = sourceCode.text.slice(...range);
	const opening = getOpeningDelimiter(text);
	if (!text.startsWith('/*') || !text.endsWith('*/') || text.startsWith('/*!') || isIgnoredComment(context, comment, opening, ignorePatterns)) {
		return;
	}

	const content = text.slice(opening.length, -2);
	if (hasAsteriskPrefix(content, opening)) {
		return;
	}

	const singleContentLine = getSingleContentLine(content);

	if (style === MULTILINE) {
		if (!singleContentLine || isCanonicalMultiline(content)) {
			return;
		}

		const linePrefix = getLinePrefix(context, range[0]);
		const lineEnding = getLineEnding(sourceCode, range, content);
		const fixedText = `${opening}${lineEnding}${linePrefix}${singleContentLine}${lineEnding}${linePrefix}*/`;

		return {
			node: comment,
			messageId: MESSAGE_ID,
			data: {style: MULTILINE},
			fix: fixer => fixer.replaceTextRange(range, fixedText),
		};
	}

	if (!singleContentLine || getContentLines(content).length === 1) {
		return;
	}

	return {
		node: comment,
		messageId: MESSAGE_ID,
		data: {style: SINGLE_LINE},
		fix: fixer => fixer.replaceTextRange(range, `${opening} ${singleContentLine} */`),
	};
};

const isMergeSensitiveText = text => MERGE_SENSITIVE_PATTERNS.some(pattern => pattern.test(text));

const isMergeLineBoundary = character => [undefined, '\n', '\r'].includes(character);

const getMergeCandidate = (context, problem) => {
	if (problem?.data.style !== MULTILINE) {
		return;
	}

	const {sourceCode} = context;
	const {text: sourceText} = sourceCode;
	const commentRange = sourceCode.getRange(problem.node);
	const [start, end] = commentRange;
	const commentText = sourceText.slice(start, end);
	if (commentText.startsWith('/**') || commentText.endsWith('**/') || LINE_ENDING_PATTERN.test(commentText) || commentText.includes('\f')) {
		return;
	}

	const content = commentText.slice(2, -2).trim();
	const lineStart = getLineStart(sourceText, start);
	if (
		isMergeSensitiveText(content)
		|| !isMergeLineBoundary(sourceText[lineStart - 1])
		|| !isMergeLineBoundary(sourceText[getLineEnd(sourceText, end)])
	) {
		return;
	}

	return {
		problem,
		commentRange,
		content,
		indentation: sourceText.slice(lineStart, start),
	};
};

const canMergeAdjacentComments = (previous, candidate, text) =>
	previous.indentation === candidate.indentation
	&& ADJACENT_COMMENT_GAP.test(text.slice(previous.commentRange[1], candidate.commentRange[0]));

function * getMergeGroupProblems(group, sourceCode, ignorePatterns) {
	if (group.length > 1) {
		const [first] = group;
		const lines = group.map(({content}) => content);
		const joinedContent = lines.join('\n');

		if (!isDirectiveText(joinedContent) && !isMergeSensitiveText(joinedContent) && !matchesAnyRegExp(joinedContent, ignorePatterns)) {
			const lineEnding = getLineEnding(sourceCode, first.commentRange, '');
			const separator = lineEnding + first.indentation;
			const replacement = `/*${separator}${lines.join(separator)}${separator}*/`;
			const range = [first.commentRange[0], group.at(-1).commentRange[1]];

			first.problem.suggest = [{
				messageId: MERGE_SUGGESTION_ID,
				fix: fixer => fixer.replaceTextRange(range, replacement),
			}];
		}
	}

	yield * group.map(({problem}) => problem);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const style = context.options[0];
	const ignorePatterns = getIgnorePatterns(context.options[1].ignore);
	const {sourceCode} = context;

	onRoot(context, function * () {
		let group = [];

		for (const comment of getComments(context)) {
			const problem = getProblem(context, comment, style, ignorePatterns);
			const candidate = getMergeCandidate(context, problem);
			const previous = group.at(-1);

			if (!candidate || (previous && !canMergeAdjacentComments(previous, candidate, sourceCode.text))) {
				yield * getMergeGroupProblems(group, sourceCode, ignorePatterns);
				group = [];
			}

			if (candidate) {
				group.push(candidate);
			} else if (problem) {
				yield problem;
			}
		}

		yield * getMergeGroupProblems(group, sourceCode, ignorePatterns);
	});
};

const schema = [
	{
		enum: [MULTILINE, SINGLE_LINE],
		description: 'The style for block comments with one line of content.',
	},
	{
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
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce a consistent style for single-line block comments.',
			recommended: true,
		},
		fixable: 'whitespace',
		hasSuggestions: true,
		schema,
		defaultOptions: [MULTILINE, {ignore: []}],
		messages,
		languages: [
			'js/js',
			'json/json',
			'json/jsonc',
			'json/json5',
			'css/css',
			'soml/soml',
		],
	},
};

export default config;
