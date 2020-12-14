'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-lonely-if';
const messages = {
	[MESSAGE_ID]: 'Unexpected `if` as the only statement in a `if` block without `else`.'
};

const ifStatementWithoutAlternate = 'IfStatement:not([alternate])';
const selector = `:matches(${
	[
		// `if (a) { if (b) {} }`
		[
			ifStatementWithoutAlternate,
			'>',
			'BlockStatement.consequent',
			'[body.length=1]',
			'>',
			`${ifStatementWithoutAlternate}.body`
		].join(''),

		// `if (a) if (b) {}`
		`${ifStatementWithoutAlternate} > ${ifStatementWithoutAlternate}.consequent`
	].join(', ')
})`;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
// Lower precedence than `&&`
const needParenthesis = node => (
	(node.type === 'LogicalExpression' && (node.operator === '||' || node.operator === '??')) ||
	node.type === 'ConditionalExpression' ||
	node.type === 'AssignmentExpression' ||
	node.type === 'YieldExpression' ||
	node.type === 'SequenceExpression'
);

const create = context => {
	const sourceCode = context.getSourceCode();
	const getText = node => sourceCode.getText(node);
	const getTestNodeText = node => needParenthesis(node) ? `(${getText(node)})` : getText(node);

	return {
		[selector](inner) {
			const {parent} = inner;
			const outer = parent.type === 'BlockStatement' ? parent.parent : parent;

			context.report({
				node: inner,
				messageId: MESSAGE_ID,
				* fix(fixer) {
					// Merge `test`
					yield fixer.replaceText(outer.test, `${getTestNodeText(outer.test)} && ${getTestNodeText(inner.test)}`);

					// Replace `consequent`
					yield fixer.replaceText(outer.consequent, getText(inner.consequent));
				}
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
