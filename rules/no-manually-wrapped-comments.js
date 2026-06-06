import {isEslintDisableOrEnableDirective} from './utils/index.js';

const MESSAGE_ID = 'no-manually-wrapped-comments';
const messages = {
	[MESSAGE_ID]: 'Avoid manually wrapping comments.',
};

const sentenceEndPattern = /[.!?]$/v;
const directiveCommentPattern = /^(?:[\/#@]|eslint(?:$|\s|-)|globals?\b|exported\b|no default$|(?:c8|istanbul|v8)\s+ignore\b|(?:biome|oxlint|prettier)-)/v;

const getCommentText = comment => comment.value.trim();

const endsWithSentencePunctuation = comment => sentenceEndPattern.test(getCommentText(comment));

const getLinePrefix = (sourceCode, comment) => {
	const {line, column} = sourceCode.getLoc(comment).start;
	return sourceCode.lines[line - 1].slice(0, column);
};

const isStandaloneLineComment = (sourceCode, comment) => (
	comment.type === 'Line'
	&& getCommentText(comment).length > 0
	&& !directiveCommentPattern.test(getCommentText(comment))
	&& getLinePrefix(sourceCode, comment).trim() === ''
);

const isConsecutiveComment = (sourceCode, firstComment, secondComment) => {
	const firstCommentLocation = sourceCode.getLoc(firstComment);
	const secondCommentLocation = sourceCode.getLoc(secondComment);

	return firstCommentLocation.end.line + 1 === secondCommentLocation.start.line
		&& firstCommentLocation.start.column === secondCommentLocation.start.column;
};

const isWrappedCommentBoundary = (context, firstComment, secondComment) => {
	const {sourceCode} = context;

	return isStandaloneLineComment(sourceCode, firstComment)
		&& isStandaloneLineComment(sourceCode, secondComment)
		&& !isEslintDisableOrEnableDirective(context, firstComment)
		&& !isEslintDisableOrEnableDirective(context, secondComment)
		&& isConsecutiveComment(sourceCode, firstComment, secondComment)
		&& !endsWithSentencePunctuation(firstComment);
};

const fixCommentGroup = (context, comments) => fixer => {
	const {sourceCode} = context;
	const firstComment = comments[0];
	const lastComment = comments.at(-1);
	const text = comments.map(comment => getCommentText(comment)).join(' ');
	const range = [
		sourceCode.getRange(firstComment)[0],
		sourceCode.getRange(lastComment)[1],
	];

	return fixer.replaceTextRange(range, `// ${text}`);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Program', function * () {
		const comments = context.sourceCode.getAllComments();

		for (let index = 0; index < comments.length; index++) {
			const group = [comments[index]];

			while (
				index + group.length < comments.length
				&& isWrappedCommentBoundary(context, group.at(-1), comments[index + group.length])
			) {
				group.push(comments[index + group.length]);
			}

			if (group.length === 1) {
				continue;
			}

			index += group.length - 1;

			yield {
				node: group[0],
				messageId: MESSAGE_ID,
				fix: fixCommentGroup(context, group),
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Disallow manually wrapped comments.',
			recommended: 'unopinionated',
		},
		fixable: 'whitespace',
		messages,
	},
};

export default config;
