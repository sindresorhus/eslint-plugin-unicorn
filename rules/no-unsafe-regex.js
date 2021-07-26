'use strict';
const safeRegex = require('safe-regex');
const {newExpressionSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'no-unsafe-regex';
const messages = {
	[MESSAGE_ID]: 'Unsafe regular expression.',
};

const newRegExpSelector = [
	newExpressionSelector('RegExp'),
	'[arguments.0.type="Literal"]',
].join('');

const create = () => {
	return {
		'Literal[regex]': node => {
			// Handle regex literal inside RegExp constructor in the other handler
			if (
				node.parent.type === 'NewExpression' &&
				node.parent.callee.name === 'RegExp'
			) {
				return;
			}

			if (!safeRegex(node.value)) {
				return {
					node,
					messageId: MESSAGE_ID,
				};
			}
		},
		[newRegExpSelector]: node => {
			const arguments_ = node.arguments;
			const hasRegExp = arguments_[0].regex;

			let pattern;
			let flags;
			if (hasRegExp) {
				({pattern} = arguments_[0].regex);
				flags = arguments_[1] && arguments_[1].type === 'Literal' ? arguments_[1].value : arguments_[0].regex.flags;
			} else {
				pattern = arguments_[0].value;
				flags = arguments_[1] && arguments_[1].type === 'Literal' ? arguments_[1].value : '';
			}

			if (!safeRegex(`/${pattern}/${flags}`)) {
				return {
					node,
					messageId: MESSAGE_ID,
				};
			}
		},
	};
};

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
