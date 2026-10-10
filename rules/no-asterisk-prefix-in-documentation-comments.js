import {
	getComments,
	getLinePrefix,
	onRoot,
	reindentText,
} from './utils/index.js';

const MESSAGE_ID = 'no-asterisk-prefix-in-documentation-comments';
const LINE_ENDING_PATTERN = /[\n\r\u{2028}\u{2029}]/v;
const messages = {
	[MESSAGE_ID]: 'Remove asterisk prefixes and shared indentation from this comment.',
};

const getCommentRange = (sourceCode, comment) => {
	// `@eslint/json` comment ranges count CRLF as one character, so derive raw source indices from locations.
	const {start, end} = sourceCode.getLoc(comment);
	return [sourceCode.getIndexFromLoc(start), sourceCode.getIndexFromLoc(end)];
};

const getFixedCommentText = (text, linePrefix) => {
	const closingDelimiterPattern = new RegExp(`^${linePrefix}[ \t]+\\*/`, 'gmv');
	const linePrefixPattern = new RegExp(`^${linePrefix}[ \t]+\\*(?:[ \t])?`, 'gmv');

	const fixedText = text
		.replace(closingDelimiterPattern, () => `${linePrefix}*/`)
		.replace(linePrefixPattern, () => linePrefix);
	let sharedIndentation;

	for (const line of fixedText.split(LINE_ENDING_PATTERN).slice(1)) {
		if (/^[\t ]*(?:\*\/)?$/v.test(line)) {
			continue;
		}

		const indentation = /^[\t ]*/v.exec(line)[0];
		sharedIndentation ??= indentation;

		while (!indentation.startsWith(sharedIndentation)) {
			sharedIndentation = sharedIndentation.slice(0, -1);
		}
	}

	if (sharedIndentation?.startsWith(linePrefix) && sharedIndentation.length > linePrefix.length) {
		return reindentText(fixedText, sharedIndentation, linePrefix);
	}

	return fixedText;
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

	const linePrefix = getLinePrefix(context, range[0]);

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
			description: 'Disallow asterisk prefixes and shared indentation in multiline comments.',
			recommended: true,
		},
		fixable: 'whitespace',
		schema: [],
		messages,
		languages: [
			'js/js',
			'css/css',
			'json/json',
			'json/jsonc',
			'json/json5',
		],
	},
};

export default config;
