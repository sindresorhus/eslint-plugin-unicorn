import {isParenthesized, hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getParenthesizedRange,
	getParenthesizedText,
	isNodeValueNotDomNode,
	isSameReference,
	isValueNotUsable,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	wouldRemoveComments,
} from './utils/index.js';

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_MESSAGE_ID = 'suggestion';
const messages = {
	[ERROR_MESSAGE_ID]: 'Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.',
	[SUGGESTION_MESSAGE_ID]: 'Replace `parentNode.removeChild(childNode)` with `childNode{{dotOrQuestionDot}}remove()`.',
};

// TODO: Don't check node.type twice
const isMemberExpressionOptionalObject = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node
	&& (
		node.parent.optional
		|| (node.type === 'MemberExpression' && isMemberExpressionOptionalObject(node.object))
	);

const isParentNodeMemberExpression = node =>
	node.type === 'MemberExpression'
	&& !node.computed
	&& node.property.type === 'Identifier'
	&& node.property.name === 'parentNode';

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				method: 'removeChild',
				argumentsLength: 1,
				optionalCall: false,
			})
			|| isNodeValueNotDomNode(node.callee.object)
			|| isNodeValueNotDomNode(node.arguments[0])
		) {
			return;
		}

		const parentNode = node.callee.object;
		const childNode = node.arguments[0];

		// The call is replaced as a whole, a comment inside it would be dropped
		const hasComment = wouldRemoveComments(context, node);
		const problem = {
			node,
			messageId: ERROR_MESSAGE_ID,
		};

		const isOptionalParentNode = isMemberExpressionOptionalObject(parentNode);
		const isSameReferenceParentNode = isParentNodeMemberExpression(parentNode)
			&& isSameReference(parentNode.object, childNode);

		const createFix = (optional = false) => fixer => {
			let childNodeText = getParenthesizedText(childNode, context);
			if (
				!isParenthesized(childNode, sourceCode)
				&& shouldAddParenthesesToMemberExpressionObject(childNode, context)
			) {
				childNodeText = `(${childNodeText})`;
			}

			if (needsSemicolon(sourceCode.getTokenBefore(node), context, childNodeText)) {
				childNodeText = `;${childNodeText}`;
			}

			return fixer.replaceText(node, `${childNodeText}${optional ? '?' : ''}.remove()`);
		};

		// `node.parentNode.removeChild(node)` names the child twice, so the fix starts after the child and drops the `.parentNode.removeChild(…)` part, which is what keeps the child's own optional chain intact: `a?.b.parentNode.removeChild(a.b)` has to stay `a?.b.remove()`. The parent is not what gets removed here, so the range must not start after `parentNode`.
		const createSameReferenceFix = (optional = false) => {
			// The fix replaces everything from the end of the child to the end of the call, so a parenthesis around the callee or around `parentNode` would be left dangling
			if (
				isParenthesized(node.callee, sourceCode)
				|| isParenthesized(parentNode, sourceCode)
			) {
				return;
			}

			return fixer => {
				// The parentheses around the child are not part of its range, so the range starts after them to keep them before `.remove()`
				const [, receiverEnd] = getParenthesizedRange(parentNode.object, context);
				const [, callEnd] = sourceCode.getRange(node);

				return fixer.replaceTextRange([receiverEnd, callEnd], `${optional ? '?' : ''}.remove()`);
			};
		};

		if (!hasSideEffect(parentNode, sourceCode) && isValueNotUsable(node)) {
			if (isSameReferenceParentNode) {
				problem.fix = hasComment ? undefined : createSameReferenceFix(parentNode.optional);
				return problem;
			}

			if (!isOptionalParentNode) {
				problem.fix = hasComment ? undefined : createFix(false);
				return problem;
			}
		}

		if (hasComment) {
			return problem;
		}

		problem.suggest = (
			isOptionalParentNode ? [true, false] : [false]
		).map(optional => ({
			messageId: SUGGESTION_MESSAGE_ID,
			data: {dotOrQuestionDot: optional ? '?.' : '.'},
			fix: isSameReferenceParentNode
				? createSameReferenceFix(optional)
				: createFix(optional),
		})).filter(suggestion => suggestion.fix);

		return problem;
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
			description: 'Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
