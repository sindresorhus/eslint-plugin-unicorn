'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-lonely-if';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.'
};

const ifStatementWithoutAlternate = 'IfStatement[:not([alternate])]';
const selector = [
	ifStatementWithoutAlternate,
	'>',
	`:matches(${
		[
			// `if (a) { if (b) {} }`
			[
				'BlockStatement.consequent',
				'[body.length=1]',
				'>',
				`${ifStatementWithoutAlternate}.body`
			].join('')

			// `if (a) if (b) {}`
			`${ifStatementWithoutAlternate}.consequent`
		].join(', ')
	})`
].join('');

const create = context => {
	return {
		[selector](node) {
			console.log(node)

			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {
					value: 'unicorn',
					replacement: '🦄'
				},
				fix: fixer => fixer.replaceText(node, '\'🦄\'')
			});
		}
	}
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
