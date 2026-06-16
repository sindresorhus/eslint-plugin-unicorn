import {getParenthesizedRange, getParenthesizedText} from './utils/index.js';

const MESSAGE_ID = 'prefer-type-literal-last';
const messages = {
	[MESSAGE_ID]: 'Move type literals to the end of this {{kind}}.',
};

const isTypeLiteral = node => node.type === 'TSTypeLiteral';

// `null`/`undefined` are conventionally kept at the very end as a nullish escape hatch, so they don't count as "another type".
const isNullishType = node => node.type === 'TSUndefinedKeyword' || node.type === 'TSNullKeyword';

const getFirstTypeLiteralBeforeOtherType = types => {
	let typeLiteral;

	for (const type of types) {
		if (isTypeLiteral(type)) {
			typeLiteral ??= type;
			continue;
		}

		if (isNullishType(type)) {
			continue;
		}

		if (typeLiteral) {
			return typeLiteral;
		}
	}
};

const isCommentInsideAnyType = (comment, types, context) => {
	const [commentStart, commentEnd] = context.sourceCode.getRange(comment);

	return types.some(type => {
		const [typeStart, typeEnd] = getParenthesizedRange(type, context);

		return commentStart >= typeStart && commentEnd <= typeEnd;
	});
};

const hasCommentBetween = (comments, start, end, sourceCode) =>
	comments.some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);

		return commentStart >= start && commentEnd <= end;
	});

const hasBoundaryComment = (node, context, comments) => {
	const {sourceCode} = context;
	const tokenBefore = sourceCode.getTokenBefore(node);
	const [firstType] = node.types;
	const lastType = node.types.at(-1);
	const [firstTypeStart] = getParenthesizedRange(firstType, context);
	const [, lastTypeEnd] = getParenthesizedRange(lastType, context);

	if (
		tokenBefore
		&& hasCommentBetween(comments, sourceCode.getRange(tokenBefore)[1], firstTypeStart, sourceCode)
	) {
		return true;
	}

	const tokenAfter = sourceCode.getTokenAfter(node);
	const end = tokenAfter ? sourceCode.getRange(tokenAfter)[0] : sourceCode.text.length;

	return hasCommentBetween(comments, lastTypeEnd, end, sourceCode);
};

const getKind = node => node.type === 'TSUnionType' ? 'union' : 'intersection';

/**
Create the rule.
@param {import('eslint').Rule.RuleContext} context - Rule context.
*/
const create = context => {
	const {sourceCode} = context;

	const getProblem = node => {
		const problemNode = getFirstTypeLiteralBeforeOtherType(node.types);

		if (!problemNode) {
			return;
		}

		return {
			node: problemNode,
			messageId: MESSAGE_ID,
			data: {
				kind: getKind(node),
			},
			* fix(fixer, {abort}) {
				if (node.type === 'TSIntersectionType') {
					return abort();
				}

				const comments = sourceCode.getCommentsInside(node);

				if (
					comments.some(comment => !isCommentInsideAnyType(comment, node.types, context))
					|| hasBoundaryComment(node, context, sourceCode.getAllComments())
				) {
					return abort();
				}

				const typeLiterals = node.types.filter(type => isTypeLiteral(type));
				const nullishTypes = node.types.filter(type => isNullishType(type));
				const otherTypes = node.types.filter(type => !isTypeLiteral(type) && !isNullishType(type));
				const replacement = [...otherTypes, ...typeLiterals, ...nullishTypes]
					.map(type => getParenthesizedText(type, context))
					.join(' | ');

				yield fixer.replaceText(node, replacement);
			},
		};
	};

	context.on('TSUnionType', getProblem);
	context.on('TSIntersectionType', getProblem);
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require type literals to be last in union and intersection types.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
