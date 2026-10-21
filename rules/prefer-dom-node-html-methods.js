import {isMemberExpression} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getParenthesizedRange,
	getParenthesizedText,
	getMemberExpressionObjectText,
	getOutermostChainAndTypeScriptExpression,
	isInUnparenthesizedNewExpressionCallee,
	isLeftHandSide,
	isValueNotUsable,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID_READ = 'prefer-dom-node-html-methods/read';
const MESSAGE_ID_WRITE = 'prefer-dom-node-html-methods/write';
const MESSAGE_ID_WRITE_SUGGESTION = 'prefer-dom-node-html-methods/write-suggestion';
const messages = {
	[MESSAGE_ID_READ]: 'Prefer `.getHTML()` over `.innerHTML`.',
	[MESSAGE_ID_WRITE]: 'Prefer `.setHTML()` over assigning to `.innerHTML`.',
	[MESSAGE_ID_WRITE_SUGGESTION]: 'Switch to `.setHTML()`.',
};

const isInnerHTMLMemberExpression = node => isMemberExpression(node, {
	property: 'innerHTML',
	computed: false,
});

const isPlainInnerHTMLAssignment = node =>
	node.operator === '='
	&& isInnerHTMLMemberExpression(node.left);

const isCalleeOrTag = node => {
	const expression = getOutermostChainAndTypeScriptExpression(node);
	const {parent} = expression;

	return (
		(
			parent.type === 'CallExpression'
			|| parent.type === 'NewExpression'
		)
		&& parent.callee === expression
	)
	|| (
		parent.type === 'TaggedTemplateExpression'
		&& parent.tag === expression
	);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {checkGetHTML, checkSetHTML} = context.options[0];

	context.on('MemberExpression', memberExpression => {
		if (
			!checkGetHTML
			|| !isInnerHTMLMemberExpression(memberExpression)
			|| isLeftHandSide(memberExpression)
		) {
			return;
		}

		const problem = {
			node: memberExpression.property,
			messageId: MESSAGE_ID_READ,
		};

		if (!isCalleeOrTag(memberExpression)) {
			problem.fix = function * (fixer) {
				yield fixer.replaceText(memberExpression.property, 'getHTML');
				const needsParentheses = isInUnparenthesizedNewExpressionCallee(memberExpression, context);
				yield fixer.insertTextAfter(memberExpression, needsParentheses ? '())' : '()');
				if (needsParentheses) {
					yield fixer.insertTextBefore(memberExpression, '(');
				}
			};
		}

		return problem;
	});

	context.on('AssignmentExpression', assignmentExpression => {
		if (
			!checkSetHTML
			|| !isInnerHTMLMemberExpression(assignmentExpression.left)
		) {
			return;
		}

		const problem = {
			node: assignmentExpression.left.property,
			messageId: MESSAGE_ID_WRITE,
		};

		if (
			isPlainInnerHTMLAssignment(assignmentExpression)
			&& isValueNotUsable(assignmentExpression)
			&& !wouldRemoveComments(context, assignmentExpression, [
				getParenthesizedRange(assignmentExpression.left.object, context),
				getParenthesizedRange(assignmentExpression.right, context),
			])
		) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_WRITE_SUGGESTION,
					* fix(fixer) {
						const object = getMemberExpressionObjectText(assignmentExpression.left.object, context, assignmentExpression);
						const value = getParenthesizedText(assignmentExpression.right, context);
						yield fixer.replaceText(assignmentExpression, `${object}.setHTML(${value})`);
						yield fixSpaceAroundKeyword(fixer, assignmentExpression, context);
					},
				},
			];
		}

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
			description: 'Prefer `.getHTML()` and `.setHTML()` over `.innerHTML`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					checkGetHTML: {
						type: 'boolean',
						description: 'Whether to check reads from `.innerHTML`.',
					},
					checkSetHTML: {
						type: 'boolean',
						description: 'Whether to check assignments to `.innerHTML`.',
					},
				},
			},
		],
		defaultOptions: [{
			checkGetHTML: true,
			// TODO: Change to `true` once Safari supports `Element#setHTML()`.
			checkSetHTML: false,
		}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
