import {
	getComments,
	onRoot,
} from './utils/index.js';

const MESSAGE_ID = 'no-asterisk-prefix-in-documentation-comments';
const messages = {
	[MESSAGE_ID]: 'Remove the asterisk prefix from this documentation comment.',
};

const getLinePrefix = (sourceCode, comment) => {
	const [start] = sourceCode.getRange(comment);
	const lineStart = sourceCode.text.lastIndexOf('\n', start - 1) + 1;
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
	if (comment.type !== 'Block') {
		return;
	}

	const {sourceCode} = context;
	const range = sourceCode.getRange(comment);
	const text = sourceCode.text.slice(...range);

	if (!text.startsWith('/**') || !/[\n\r]/v.test(text)) {
		return;
	}

	const linePrefix = getLinePrefix(sourceCode, comment);

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

/** @param {import('eslint').Rule.RuleContext} context */
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

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Disallow asterisk prefixes in documentation comments.',
			recommended: false,
		},
		fixable: 'whitespace',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
