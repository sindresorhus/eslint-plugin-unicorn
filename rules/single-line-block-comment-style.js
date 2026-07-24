import {isRegExp} from 'node:util/types';
import {
	getComments,
	isEslintDisableOrEnableDirective,
	onRoot,
} from './utils/index.js';

const MESSAGE_ID = 'single-line-block-comment-style';
const MULTILINE = 'multiline';
const SINGLE_LINE = 'single-line';
const LINE_ENDINGS = ['\n', '\r', '\u2028', '\u2029'];
const LINE_ENDING_PATTERN = /\r\n|[\n\r\u{2028}\u{2029}]/v;
const DIRECTIVE_PATTERNS = [
	/^\s*(?:eslint(?:-env)?|jshint|[jt]slint|jscs|globals?|exported|no default|noinspection)(?:\s|:|$)/v,
	/^\s*(?:\*\s*)?flowlint(?:-(?:line|next-line))?(?:\s|:|$)/v,
	/^\s*::?/v,
	/^\s*flow-include(?:\s|$)/v,
	/^\s*(?:c8|istanbul|nyc|v8)\s+ignore(?:\s|$)/v,
	/^\s*(?:biome|deno|dprint|oxlint|prettier)-(?:ignore|lint-ignore|disable|enable)(?:-(?:line|next-line|start|end|file|all))?(?:\s|$)/v,
	/^\s*(?:cspell|spell-checker):/v,
];
const LANGUAGE_DIRECTIVE_PATTERNS = [
	/^\s*@(?:ts-(?:check|nocheck|ignore|expect-error)|jsx(?:Frag|ImportSource|Runtime|Factory)?|(?:no)?flow|(?:jest|vitest)-environment|noformat|noprettier)(?:\s|:|$)/v,
	/^\s*\$Flow(?:FixMe|ExpectedError)\[[^\]]+\](?:\s|:|$)/v,
];
const MINIFIER_DIRECTIVE_PATTERN = /^\s*[#@]__(?:INLINE|NOINLINE|PURE|KEY|MANGLE_PROP|NO_SIDE_EFFECTS)__\s*$/v;

const messages = {
	[MESSAGE_ID]: 'Use a {{style}} block comment.',
};

const getLineStart = (text, index) => Math.max(...LINE_ENDINGS.map(lineEnding => text.lastIndexOf(lineEnding, index - 1))) + 1;

const getLineEnd = (text, index) => Math.min(
	...LINE_ENDINGS.map(lineEnding => text.indexOf(lineEnding, index)).filter(index => index !== -1),
	text.length,
);

const getLineEndingAt = (text, index) => {
	if (text.startsWith('\r\n', index)) {
		return '\r\n';
	}

	return LINE_ENDINGS.includes(text[index]) ? text[index] : undefined;
};

const getLineEndingBefore = (text, index) => {
	const lineEndingIndex = Math.max(...LINE_ENDINGS.map(lineEnding => text.lastIndexOf(lineEnding, index - 1)));

	if (lineEndingIndex === -1) {
		return;
	}

	const start = text[lineEndingIndex] === '\n' && text[lineEndingIndex - 1] === '\r'
		? lineEndingIndex - 1
		: lineEndingIndex;

	return getLineEndingAt(text, start);
};

const getLinePrefix = (sourceCode, start) => sourceCode.text.slice(getLineStart(sourceCode.text, start), start);

const getLineSuffix = (sourceCode, end) => sourceCode.text.slice(end, getLineEnd(sourceCode.text, end));

const isStandalone = (sourceCode, [start, end]) => (
	getLinePrefix(sourceCode, start).trim() === ''
	&& getLineSuffix(sourceCode, end).trim() === ''
);

const getLineEnding = (sourceCode, [start, end], content) =>
	content.match(LINE_ENDING_PATTERN)?.[0]
	?? getLineEndingAt(sourceCode.text, getLineEnd(sourceCode.text, end))
	?? getLineEndingBefore(sourceCode.text, start)
	?? getLineEndingAt(sourceCode.text, getLineEnd(sourceCode.text, 0))
	?? '\n';

const getOpeningDelimiter = text => text.startsWith('/**') && text[3] !== '*' ? '/**' : '/*';

const getCommentText = (comment, opening) => comment.value
	.split(LINE_ENDING_PATTERN)
	.map(line => line.replace(opening === '/**' ? /^\s*\*?\s*/v : /^\s*/v, ''))
	.join('\n');

const isDirectiveText = commentText =>
	DIRECTIVE_PATTERNS.some(pattern => pattern.test(commentText))
	|| LANGUAGE_DIRECTIVE_PATTERNS.some(pattern => pattern.test(commentText))
	|| MINIFIER_DIRECTIVE_PATTERN.test(commentText);

const isIgnoredByPattern = (commentText, patterns) => patterns.some(pattern => {
	pattern.lastIndex = 0;
	const isMatch = pattern.test(commentText);
	pattern.lastIndex = 0;

	return isMatch;
});

const isIgnoredComment = (context, comment, opening, ignorePatterns) => {
	if (isEslintDisableOrEnableDirective(context, comment)) {
		return true;
	}

	const commentText = getCommentText(comment, opening);
	return isIgnoredByPattern(commentText, ignorePatterns) || isDirectiveText(commentText);
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
	if (comment.type !== 'Block') {
		return;
	}

	const {sourceCode} = context;
	const range = sourceCode.getRange(comment);

	if (!isStandalone(sourceCode, range)) {
		return;
	}

	const text = sourceCode.text.slice(...range);
	const opening = getOpeningDelimiter(text);
	if (text.startsWith('/*!') || isIgnoredComment(context, comment, opening, ignorePatterns)) {
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

		const linePrefix = getLinePrefix(sourceCode, range[0]);
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const style = context.options[0];
	const ignorePatterns = getIgnorePatterns(context.options[1]?.ignore ?? []);

	onRoot(context, function * () {
		for (const comment of getComments(context)) {
			const problem = getProblem(context, comment, style, ignorePatterns);

			if (problem) {
				yield problem;
			}
		}
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
				uniqueItems: true,
				description: 'Regular expressions to ignore.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce a consistent style for single-line block comments.',
			recommended: true,
		},
		fixable: 'whitespace',
		schema,
		defaultOptions: [MULTILINE, {ignore: []}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
