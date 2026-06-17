import {getParenthesizedRange, getParenthesizedText} from './utils/index.js';

const MESSAGE_ID = 'prefer-type-literal-last';
const messages = {
	[MESSAGE_ID]: 'Move type literals to the end of this union.',
};

const isTypeLiteral = node => node.type === 'TSTypeLiteral';

// `null`/`undefined` are conventionally kept at the very end as a nullish escape hatch, so they don't count as "another type".
const isNullishType = node => node.type === 'TSUndefinedKeyword' || node.type === 'TSNullKeyword';

// A union/intersection sibling is itself a composite type, not a compact named member, so moving a literal past it does nothing for readability.
const isCompositeType = node => node.type === 'TSUnionType' || node.type === 'TSIntersectionType';

const getFirstTypeLiteralBeforeOtherType = types => {
	let typeLiteral;

	for (const type of types) {
		if (isTypeLiteral(type)) {
			typeLiteral ??= type;
			continue;
		}

		if (isNullishType(type) || isCompositeType(type)) {
			continue;
		}

		if (typeLiteral) {
			return typeLiteral;
		}
	}
};

// A comment only stays meaningful if it travels with the type it sits inside. A comment anywhere else in the union (between members, or just before/after it) would end up describing a different member once we reorder, so we bail out of the autofix.
const hasUnsafeComment = (node, context) => {
	const {sourceCode} = context;
	const tokenBefore = sourceCode.getTokenBefore(node);
	const tokenAfter = sourceCode.getTokenAfter(node);
	const regionStart = tokenBefore ? sourceCode.getRange(tokenBefore)[1] : 0;
	const regionEnd = tokenAfter ? sourceCode.getRange(tokenAfter)[0] : sourceCode.text.length;
	const typeRanges = node.types.map(type => getParenthesizedRange(type, context));

	return sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);

		if (commentStart < regionStart || commentEnd > regionEnd) {
			return false;
		}

		return typeRanges.every(([typeStart, typeEnd]) => commentStart < typeStart || commentEnd > typeEnd);
	});
};

/**
Create the rule.
@param {import('eslint').Rule.RuleContext} context - Rule context.
*/
const create = context => {
	const getProblem = node => {
		const problemNode = getFirstTypeLiteralBeforeOtherType(node.types);

		if (!problemNode) {
			return;
		}

		return {
			node: problemNode,
			messageId: MESSAGE_ID,
			* fix(fixer, {abort}) {
				if (hasUnsafeComment(node, context)) {
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
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require type literals to be last in union types.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
