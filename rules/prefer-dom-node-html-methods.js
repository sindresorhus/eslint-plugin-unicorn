import {isMemberExpression} from './ast/index.js';
import {getParenthesizedText, isLeftHandSide, isValueNotUsable} from './utils/index.js';

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

const hasComments = (node, sourceCode) =>
	sourceCode.getCommentsInside(node).length > 0;

const isForInOrOfLeft = node =>
	(
		node.parent.type === 'ForInStatement'
		|| node.parent.type === 'ForOfStatement'
	)
	&& node.parent.left === node;

const getParentExpression = node =>
	node.parent.type === 'ChainExpression'
		? node.parent
		: node;

const isCalleeOrTag = node => {
	const expression = getParentExpression(node);
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MemberExpression', memberExpression => {
		if (
			!isInnerHTMLMemberExpression(memberExpression)
			|| isLeftHandSide(memberExpression)
			|| isForInOrOfLeft(memberExpression)
		) {
			return;
		}

		const problem = {
			node: memberExpression.property,
			messageId: MESSAGE_ID_READ,
		};

		if (
			!hasComments(memberExpression, sourceCode)
			&& !isCalleeOrTag(memberExpression)
		) {
			problem.fix = function * (fixer) {
				yield fixer.replaceText(memberExpression.property, 'getHTML');
				yield fixer.insertTextAfter(memberExpression, '()');
			};
		}

		return problem;
	});

	context.on('AssignmentExpression', assignmentExpression => {
		if (!isInnerHTMLMemberExpression(assignmentExpression.left)) {
			return;
		}

		const problem = {
			node: assignmentExpression.left.property,
			messageId: MESSAGE_ID_WRITE,
		};

		if (
			isPlainInnerHTMLAssignment(assignmentExpression)
			&& isValueNotUsable(assignmentExpression)
			&& !hasComments(assignmentExpression, sourceCode)
		) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_WRITE_SUGGESTION,
					fix(fixer) {
						const object = getParenthesizedText(assignmentExpression.left.object, context);
						const value = sourceCode.getText(assignmentExpression.right);
						return fixer.replaceText(assignmentExpression, `${object}.setHTML(${value})`);
					},
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.getHTML()` and `.setHTML()` over `.innerHTML`.',
			// TODO: Enable in the `recommended` config once Safari supports `Element#setHTML()`.
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
