import {
	getComments,
	matchesAnyRegExp,
	onRoot,
} from './utils/index.js';
import {
	getBlockCommentLineEnding,
	getIgnorePatterns,
	getSingleContentLineBlockComment,
	ignoreOptionSchema,
} from './shared/single-content-line-block-comment.js';

const MESSAGE_ID = 'single-line-block-comment-style';
const MULTILINE = 'multiline';
const SINGLE_LINE = 'single-line';

const messages = {
	[MESSAGE_ID]: 'Use a {{style}} block comment.',
};

const isCanonicalMultiline = lines => lines.length === 3 && lines[0] === '' && lines[2] === '';

const getProblem = (context, comment, style, ignorePatterns) => {
	const block = getSingleContentLineBlockComment(context, comment);
	if (!block || matchesAnyRegExp(block.normalizedText, ignorePatterns)) {
		return;
	}

	const {opening, contentLine, lines, indentation, commentRange} = block;

	if (style === MULTILINE) {
		if (isCanonicalMultiline(lines)) {
			return;
		}

		const lineEnding = getBlockCommentLineEnding(context.sourceCode.text, block);
		const fixedText = `${opening}${lineEnding}${indentation}${contentLine}${lineEnding}${indentation}*/`;

		return {
			node: comment,
			messageId: MESSAGE_ID,
			data: {style: MULTILINE},
			fix: fixer => fixer.replaceTextRange(commentRange, fixedText),
		};
	}

	if (lines.length === 1) {
		return;
	}

	return {
		node: comment,
		messageId: MESSAGE_ID,
		data: {style: SINGLE_LINE},
		fix: fixer => fixer.replaceTextRange(commentRange, `${opening} ${contentLine} */`),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const style = context.options[0];
	const ignorePatterns = getIgnorePatterns(context.options[1].ignore);

	onRoot(context, function * () {
		for (const comment of getComments(context)) {
			yield getProblem(context, comment, style, ignorePatterns);
		}
	});
};

const schema = [
	{
		enum: [MULTILINE, SINGLE_LINE],
		description: 'The style for block comments with one line of content.',
	},
	ignoreOptionSchema,
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
