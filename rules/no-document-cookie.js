'use strict';
const traceGlobalObjects = require('./utils/trace-global-objects.js');

const MESSAGE_ID = 'no-document-cookie';
const messages = {
	[MESSAGE_ID]: 'Do not use `document.cookie` directly.',
};

const create = traceGlobalObjects({
	object: 'document.cookie',
	filter: ({node}) => node.parent.type === 'AssignmentExpression' && node.parent.left === node,
	handle: ({node}) => ({node, messageId: MESSAGE_ID}),
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Do not use `document.cookie` directly.',
		},
		messages,
	},
};
