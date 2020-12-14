'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const needsSemicolon = require('./utils/needs-semicolon');

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
					const {consequent} = inner;
					let consequentText = getText(consequent);
					// If the `if` statement has no block, and is not followed by a semicolon,
					// make sure that fixing the issue would not change semantics due to ASI.
					// Similar logic https://github.com/eslint/eslint/blob/2124e1b5dad30a905dc26bde9da472bf622d3f50/lib/rules/no-lonely-if.js#L61-L77
					if (
						consequent.type !== 'BlockStatement' &&
						outer.consequent.type === 'BlockStatement' &&
						!consequentText.endsWith(';')
					) {
						const lastToken = sourceCode.getLastToken(consequent);
						const nextToken = sourceCode.getTokenAfter(outer);
						if (needsSemicolon(lastToken, sourceCode, nextToken.value)) {
							consequentText += ';';
						}
					}

					yield fixer.replaceText(outer.consequent, consequentText);
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
