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

const create = context => {
	const sourceCode = context.getSourceCode();
	const getText = node => sourceCode.getText(node);

	return {
		[selector](inner) {
			const {parent} = inner;
			const outer = parent.type === 'BlockStatement' ? parent.parent : parent;

			context.report({
				node: inner,
				messageId: MESSAGE_ID,
				* fix(fixer) {
					// Merge `test`
					yield fixer.replaceText(outer.test, `(${getText(outer.test)}) && (${getText(inner.test)})`);

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
