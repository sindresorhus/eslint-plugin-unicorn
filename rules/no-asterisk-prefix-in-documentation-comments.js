import {
	getComments,
	onRoot,
} from './utils/index.js';

const MESSAGE_ID = 'no-asterisk-prefix-in-documentation-comments';
const LINE_ENDINGS = ['\n', '\r', '\u2028', '\u2029'];
const LINE_ENDING_PATTERN = /[\n\r\u{2028}\u{2029}]/v;
const messages = {
	[MESSAGE_ID]: 'Remove the asterisk prefix from this comment.',
};

const getCommentRange = (sourceCode, comment) => {
	// `@eslint/json` comment ranges count CRLF as one character, so derive raw source indices from locations.
	const {start, end} = sourceCode.getLoc(comment);
	return [sourceCode.getIndexFromLoc(start), sourceCode.getIndexFromLoc(end)];
};

const getLinePrefix = (sourceCode, start) => {
	const lineStart = Math.max(...LINE_ENDINGS.map(lineEnding => sourceCode.text.lastIndexOf(lineEnding, start - 1))) + 1;
	return sourceCode.text.slice(lineStart, start);
};

const getFixedCommentText = (text, linePrefix) => {
	const closingDelimiterPattern = new RegExp(`^${linePrefix}[ \t]+\\*/`, 'gmv');
	const linePrefixPattern = new RegExp(`^${linePrefix}[ \t]+\\*(?:[ \t])?`, 'gmv');

	return text
		.replace(closingDelimiterPattern, () => `${linePrefix}*/`)
		.replace(linePrefixPattern, () => linePrefix);
};

const getProblem = (context, comment) => {
	const {sourceCode} = context;
	const range = getCommentRange(sourceCode, comment);
	const text = sourceCode.text.slice(...range);
	const isJavaScriptComment = comment.type === 'Block';
	const isJavaScriptDocumentationComment = text.startsWith('/**') && text[3] !== '*';

	if (!text.startsWith('/*') || (isJavaScriptComment && !isJavaScriptDocumentationComment) || !LINE_ENDING_PATTERN.test(text)) {
		return;
	}

	const linePrefix = getLinePrefix(sourceCode, range[0]);

	if (!/^[\t ]*$/v.test(linePrefix)) {
		return;
	}

	const fixedText = getFixedCommentText(text, linePrefix);

	if (text === fixedText) {
		return;
	}

	return {
		node: comment,
		messageId: MESSAGE_ID,
		fix: fixer => fixer.replaceTextRange(range, fixedText),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	onRoot(context, function * () {
		for (const comment of getComments(context)) {
			const problem = getProblem(context, comment);

			if (problem) {
				yield problem;
			}
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
			description: 'Disallow asterisk prefixes in documentation, CSS, JSONC, and JSON5 comments.',
			recommended: true,
		},
		fixable: 'whitespace',
		schema: [],
		messages,
		languages: [
			'js/js',
			'css/css',
			'json/jsonc',
			'json/json5',
		],
	},
};

export default config;
