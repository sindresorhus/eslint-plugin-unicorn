'use strict';
const {memberExpressionSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'prefer-dom-node-text-content';
const messages = {
	[MESSAGE_ID]: 'Prefer `.textContent` over `.innerText`.'
};

const selector = `${memberExpressionSelector('innerText')} > .property`;

const create = () => {
	return {
		[selector](node) {
			return {
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, 'textContent')
			};
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.textContent` over `.innerText`.'
		},
		fixable: 'code',
		messages
	}
};
