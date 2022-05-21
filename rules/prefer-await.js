'use strict';
const {methodCallSelector} = require('./selectors/index.js');
const {} = require('./fix/index.js');

const MESSAGE_ID= 'prefer-await';
const messages = {
	[MESSAGE_ID]: 'Do not use `Promise#{{method}}(…)`.',
};


const selector = methodCallSelector(['then', 'catch', 'finally']);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			const method = node.callee.property;

			return {
				node: method,
				messageId: MESSAGE_ID,
				data: {
					method: method.name,
				},
			};
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `await` operator over `Promise#{then,catch,finally}()`.',
		},
		messages,
	},
};
