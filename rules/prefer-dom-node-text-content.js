'use strict';
const {memberExpressionSelector} = require('./selectors/index.js');

const ERROR = 'error';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Prefer `.textContent` over `.innerText`.',
	[SUGGESTION]: 'Switch to `.textContent`.',
};

const selector = `${memberExpressionSelector('innerText')} > .property`;

const create = () => {
	return {
		[selector](node) {
			return {
				node,
				messageId: ERROR,
				suggest: [
					{
						messageId: SUGGESTION,
						fix: fixer => fixer.replaceText(node, 'textContent'),
					},
				],
			};
		},
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.textContent` over `.innerText`.',
		},
		messages,
		hasSuggestions: true,
	},
};
