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
const DIRECTIVE_PATTERN = /^\s*(?:eslint(?:-env)?|globals?|exported|no default\b|noinspection\b|(?:c8|istanbul|nyc|v8)\s+ignore\b|(?:biome|deno|dprint|oxlint|prettier)-|(?:cspell|spell-checker):)/v;
const TYPESCRIPT_DIRECTIVE_PATTERN = /^\s*@(?:ts-(?:check|nocheck|ignore|expect-error)|jsx(?:Frag|ImportSource|Runtime|Factory)?|(?:no)?flow|(?:jest|vitest)-environment)\b/v;

const messages = {
	[MESSAGE_ID]: 'Use a {{style}} block comment.',
};

const getLineStart = (text, index) => Math.max(...LINE_ENDINGS.map(lineEnding => text.lastIndexOf(lineEnding, index - 1))) + 1;

const getLineEnd = (text, index) => Math.min(
	...LINE_ENDINGS.map(lineEnding => text.indexOf(lineEnding, index)).filter(index => index !== -1),
	text.length,
);

const getLinePrefix = (sourceCode, start) => sourceCode.text.slice(getLineStart(sourceCode.text, start), start);

const getLineSuffix = (sourceCode, end) => sourceCode.text.slice(end, getLineEnd(sourceCode.text, end));

const isStandalone = (sourceCode, [start, end]) => (
	getLinePrefix(sourceCode, start).trim() === ''
	&& getLineSuffix(sourceCode, end).trim() === ''
);

const getLineEnding = (sourceCode, end, content) =>
	content.match(LINE_ENDING_PATTERN)?.[0]
	?? sourceCode.text.slice(end).match(LINE_ENDING_PATTERN)?.[0]
	?? sourceCode.text.match(LINE_ENDING_PATTERN)?.[0]
	?? '\n';

const getOpeningDelimiter = text => text.startsWith('/**') && text[3] !== '*' ? '/**' : '/*';

const getCommentText = comment => comment.value
	.split(LINE_ENDING_PATTERN)
	.map(line => line.replace(/^\s*\*?\s*/v, ''))
	.join('\n');

const isDirective = (context, comment) => {
	if (isEslintDisableOrEnableDirective(context, comment)) {
		return true;
	}

	const commentText = getCommentText(comment);
	return DIRECTIVE_PATTERN.test(commentText) || TYPESCRIPT_DIRECTIVE_PATTERN.test(commentText);
};

const getContentLines = content => content.split(LINE_ENDING_PATTERN);

const getSingleContentLine = content => {
	const contentLines = getContentLines(content).filter(line => line.trim() !== '');

	if (
		contentLines.length !== 1
		|| contentLines[0].trim() === '*'
	) {
		return;
	}

	return contentLines[0].trim();
};

const isMultiline = content => {
	const lines = getContentLines(content);
	return lines.length === 3 && lines[0].trim() === '' && lines[2].trim() === '';
};

const getProblem = (context, comment, style) => {
	if (comment.type !== 'Block' || isDirective(context, comment)) {
		return;
	}

	const {sourceCode} = context;
	const range = sourceCode.getRange(comment);

	if (!isStandalone(sourceCode, range)) {
		return;
	}

	const text = sourceCode.text.slice(...range);
	const opening = getOpeningDelimiter(text);
	const content = text.slice(opening.length, -2);
	const singleContentLine = getSingleContentLine(content);

	if (style === MULTILINE) {
		if (!singleContentLine || isMultiline(content)) {
			return;
		}

		const linePrefix = getLinePrefix(sourceCode, range[0]);
		const lineEnding = getLineEnding(sourceCode, range[1], content);
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
	const style = context.options[0] ?? MULTILINE;

	onRoot(context, function * () {
		for (const comment of getComments(context)) {
			const problem = getProblem(context, comment, style);

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
		defaultOptions: [MULTILINE],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
