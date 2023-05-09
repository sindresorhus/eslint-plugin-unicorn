'use strict';
const {isParenthesized, hasSideEffect} = require('@eslint-community/eslint-utils');
const {methodCallSelector, notDomNodeSelector} = require('./selectors/index.js');
const needsSemicolon = require('./utils/needs-semicolon.js');
const isValueNotUsable = require('./utils/is-value-not-usable.js');
const {getParenthesizedText} = require('./utils/parentheses.js');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object.js');

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_MESSAGE_ID = 'suggestion';
const messages = {
	[ERROR_MESSAGE_ID]: 'Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.',
	[SUGGESTION_MESSAGE_ID]: 'Replace `parentNode.removeChild(childNode)` with `childNode{{dotOrQuestionDot}}remove()`.',
};

const selector = [
	methodCallSelector({
		method: 'removeChild',
		argumentsLength: 1,
		includeOptionalMember: true,
	}),
	notDomNodeSelector('callee.object'),
	notDomNodeSelector('arguments.0'),
].join('');

// TODO: Don't check node.type twice
const isMemberExpressionOptionalObject = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node
	&& (
		node.parent.optional ||
		(node.type === 'MemberExpression' && isMemberExpressionOptionalObject(node.object))
	);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		[selector](node) {
			const parentNode = node.callee.object;
			const childNode = node.arguments[0];

			const problem = {
				node,
				messageId: ERROR_MESSAGE_ID,
			};

			const isOptionalParentNode = isMemberExpressionOptionalObject(parentNode);

			const createFix = (optional = false) => fixer => {
				let childNodeText = getParenthesizedText(childNode, sourceCode);
				if (
					!isParenthesized(childNode, sourceCode)
					&& shouldAddParenthesesToMemberExpressionObject(childNode, sourceCode)
				) {
					childNodeText = `(${childNodeText})`;
				}

				if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, childNodeText)) {
					childNodeText = `;${childNodeText}`;
				}

				return fixer.replaceText(node, `${childNodeText}${optional ? '?' : ''}.remove()`);
			};

			if (!hasSideEffect(parentNode, sourceCode) && isValueNotUsable(node) && !isOptionalParentNode) {
				problem.fix = createFix();
			} else {
				problem.suggest = (
					isOptionalParentNode ? [true, false] : [false]
				).map(optional => ({
					messageId: SUGGESTION_MESSAGE_ID,
					data: {dotOrQuestionDot: optional ? '?.' : '.'},
					fix: createFix(optional)
				}));
			}
			return problem;
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
