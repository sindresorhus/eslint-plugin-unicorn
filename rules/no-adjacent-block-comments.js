import {
	getComments,
	matchesAnyRegExp,
	onRoot,
} from './utils/index.js';
import isToolingDirective from './shared/comment-directive.js';
import {
	getBlockCommentLineEnding,
	getIgnorePatterns,
	getSingleContentLineBlockComment,
	ignoreOptionSchema,
} from './shared/single-content-line-block-comment.js';

const MESSAGE_ID = 'no-adjacent-block-comments';
const messages = {
	[MESSAGE_ID]: 'Merge adjacent block comments.',
};

// Unicode line separators can be tokens in CSS. Use only CR and LF as line boundaries for merging.
const ADJACENT_COMMENT_GAP = /^[\t ]*(?:\r\n|[\n\r])[\t ]*$/v;
const MERGE_SENSITIVE_PATTERNS = [
	// Rspack accepts quoted keys and spaces before the colon.
	/\b(?:webpack|rspack)[A-Z][A-Za-z]*["']?\s*:/v,
	/^@/v,
	/^(?:todo|fixme|xxx)\b/iv,
	/^stylelint-(?:disable|enable)\b/v,
	/\bautoprefixer(?:\s+grid)?\s*:/iv,
	/^!?\s*rtl\s*:/v,
	/purgecss\s+(?:(?:start|end)\s+)?ignore/v,
	/^(?:©|copyright\b)/iv,
	/@(?:license|copyright|preserve|cc_on)\b/iv,
	/\bSPDX-(?:License-Identifier|FileCopyrightText):/v,
	/[#@]__[A-Z_]+__/v,
];

const isMergeSensitiveText = text => MERGE_SENSITIVE_PATTERNS.some(pattern => pattern.test(text));

const isMergeLineBoundary = character => [undefined, '\n', '\r'].includes(character);

const getMergeCandidate = (context, comment, ignorePatterns) => {
	const block = getSingleContentLineBlockComment(context, comment);
	if (!block) {
		return;
	}

	const {text, contentLine, lineStart, lineEnd} = block;
	const sourceText = context.sourceCode.text;

	if (
		text.startsWith('/**')
		|| contentLine.startsWith('*')
		|| contentLine.endsWith('*')
		|| /[\f\u{2028}\u{2029}]/v.test(text)
		|| !isMergeLineBoundary(sourceText[lineStart - 1])
		|| !isMergeLineBoundary(sourceText[lineEnd])
		|| isMergeSensitiveText(contentLine)
		|| matchesAnyRegExp(contentLine, ignorePatterns)
	) {
		return;
	}

	return {...block, comment};
};

const canMergeAdjacentComments = (previous, candidate, text) =>
	previous.indentation === candidate.indentation
	&& ADJACENT_COMMENT_GAP.test(text.slice(previous.commentRange[1], candidate.commentRange[0]));

const getProblem = (group, sourceText, ignorePatterns) => {
	if (group.length < 2) {
		return;
	}

	const lines = group.map(({contentLine}) => contentLine);
	const joinedContent = lines.join('\n');
	if (isToolingDirective(joinedContent) || isMergeSensitiveText(joinedContent) || matchesAnyRegExp(joinedContent, ignorePatterns)) {
		return;
	}

	const [first] = group;
	const lineEnding = getBlockCommentLineEnding(sourceText, first);
	const separator = lineEnding + first.indentation;
	const replacement = `/*${separator}${lines.join(separator)}${separator}*/`;
	const range = [first.commentRange[0], group.at(-1).commentRange[1]];

	return {
		node: first.comment,
		messageId: MESSAGE_ID,
		fix: fixer => fixer.replaceTextRange(range, replacement),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const ignorePatterns = getIgnorePatterns(context.options[0].ignore);
	const sourceText = context.sourceCode.text;

	onRoot(context, function * () {
		let group = [];

		for (const comment of getComments(context)) {
			const candidate = getMergeCandidate(context, comment, ignorePatterns);
			const previous = group.at(-1);

			if (previous && (!candidate || !canMergeAdjacentComments(previous, candidate, sourceText))) {
				yield getProblem(group, sourceText, ignorePatterns);
				group = [];
			}

			if (candidate) {
				group.push(candidate);
			}
		}

		yield getProblem(group, sourceText, ignorePatterns);
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow adjacent plain block comments that can be merged.',
			recommended: true,
		},
		fixable: 'code',
		schema: [ignoreOptionSchema],
		defaultOptions: [{ignore: []}],
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
