import {
	getComments,
	isEslintDisableOrEnableDirective,
	onRoot,
} from './utils/index.js';

const MESSAGE_ID = 'single-line-block-comment-style';
const MULTILINE = 'multiline';
const SINGLE_LINE = 'single-line';
const ESLINT_DIRECTIVE_PATTERN = /^\s*(?:eslint(?:-env)?|globals?|exported)\b/v;
const TOOL_DIRECTIVE_PATTERN = /^\s*(?:prettier-ignore(?:-(?:start|end))?|biome-ignore|(?:c8|istanbul|nyc|v8)\s+ignore)\b/v;
const TYPESCRIPT_DIRECTIVE_PATTERN = /^\s*\*?\s*@(?:ts-(?:check|nocheck|ignore|expect-error)|jsx(?:Frag|ImportSource|Runtime|Factory)?|(?:no)?flow|(?:jest|vitest)-environment)\b/v;

const messages = {
	[MESSAGE_ID]: 'Use a {{style}} block comment.',
};

const getLinePrefix = (sourceCode, start) => {
	const lineStart = Math.max(...['\n', '\r', '\u2028', '\u2029'].map(lineEnding => sourceCode.text.lastIndexOf(lineEnding, start - 1))) + 1;
	return sourceCode.text.slice(lineStart, start);
};

const getLineSuffix = (sourceCode, end) => {
	const lineEndings = ['\n', '\r', '\u2028', '\u2029'].map(lineEnding => sourceCode.text.indexOf(lineEnding, end)).filter(index => index !== -1);
	const lineEnd = Math.min(...lineEndings, sourceCode.text.length);
	return sourceCode.text.slice(end, lineEnd);
};

const isStandalone = (sourceCode, [start, end]) => (
	/^[^\S\n]*$/v.test(getLinePrefix(sourceCode, start))
	&& /^[^\S\n]*$/v.test(getLineSuffix(sourceCode, end))
);

const getLineEnding = (sourceCode, end, content) => {
	const contentLineEnding = content.match(/\r\n|[\n\r\u{2028}\u{2029}]/v)?.[0];

	if (contentLineEnding) {
		return contentLineEnding;
	}

	if (sourceCode.text.startsWith('\r\n', end)) {
		return '\r\n';
	}

	if (sourceCode.text[end] === '\r') {
		return '\r';
	}

	if (/^[\n\u{2028}\u{2029}]$/v.test(sourceCode.text[end])) {
		return sourceCode.text[end];
	}

	return sourceCode.text.match(/\r\n|[\n\r\u{2028}\u{2029}]/v)?.[0] ?? '\n';
};

const getOpening = text => text.startsWith('/**') ? '/**' : '/*';

const isDirective = (context, comment) => (
	isEslintDisableOrEnableDirective(context, comment)
	|| ESLINT_DIRECTIVE_PATTERN.test(comment.value)
	|| TOOL_DIRECTIVE_PATTERN.test(comment.value)
	|| TYPESCRIPT_DIRECTIVE_PATTERN.test(comment.value)
);

const getContentLines = content => content.split(/\r\n|[\n\r\u{2028}\u{2029}]/v);

const getSingleContentLine = (content, opening) => {
	const contentLines = getContentLines(content).filter(line => line.trim() !== '');

	if (
		contentLines.length !== 1
		|| (opening === '/**' && contentLines[0].trim() === '*')
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
	const opening = getOpening(text);
	const content = text.slice(opening.length, -2);
	const singleContentLine = getSingleContentLine(content, opening);

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
