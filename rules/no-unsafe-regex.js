'use strict';
const safeRegex = require('safe-regex');
const {isNewExpression, isRegexLiteral} = require('./ast/index.js');

const MESSAGE_ID = 'no-unsafe-regex';
const messages = {
	[MESSAGE_ID]: 'Unsafe regular expression.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (!(
			isNewExpression(node.parent, {name: 'RegExp'})
			&& node.parent.arguments[0] === node
		)) {
			return;
		}

		const [, flagsNode] = node.parent.arguments;

		let pattern;
		let flags;
		if (isRegexLiteral(node)) {
			({pattern} = node.regex);
			flags = flagsNode?.type === 'Literal'
				? flagsNode.value
				: node.regex.flags;
		} else {
			pattern = node.value;
			flags = flagsNode?.type === 'Literal'
				? flagsNode.value
				: '';
		}

		if (!safeRegex(`/${pattern}/${flags}`)) {
			return {
				node,
				messageId: MESSAGE_ID,
			};
		}
	});

	context.on('Literal', node => {
		if (isRegexLiteral(node) && !safeRegex(node.value)) {
			return {
				node,
				messageId: MESSAGE_ID,
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unsafe regular expressions.',
		},
		messages,
	},
};
