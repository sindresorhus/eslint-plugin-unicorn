'use strict';
const cleanRegexp = require('clean-regexp');
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

const message = 'Use regex shorthands to improve readability.';

const create = context => {
	return {
		'Literal[regex]': node => {
			const oldPattern = node.regex.pattern;
			const {flags} = node.regex;

			const newPattern = cleanRegexp(oldPattern, flags);

			// Handle regex literal inside RegExp constructor in the other handler
			if (node.parent.type === 'NewExpression' && node.parent.callee.name === 'RegExp') {
				return;
			}

			if (oldPattern !== newPattern) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(node, `/${newPattern}/${flags}`)
				});
			}
		},
		'NewExpression[callee.name="RegExp"]': node => {
			const arguments_ = node.arguments;

			if (arguments_.length === 0 || arguments_[0].type !== 'Literal') {
				return;
			}

			const hasRegExp = arguments_[0].regex;

			let oldPattern;
			let flags;
			if (hasRegExp) {
				oldPattern = arguments_[0].regex.pattern;
				flags = arguments_[1] && arguments_[1].type === 'Literal' ? arguments_[1].value : arguments_[0].regex.flags;
			} else {
				oldPattern = arguments_[0].value;
				flags = arguments_[1] && arguments_[1].type === 'Literal' ? arguments_[1].value : '';
			}

			const newPattern = cleanRegexp(oldPattern, flags);

			if (oldPattern !== newPattern) {
				let fixed;
				if (hasRegExp) {
					fixed = `/${newPattern}/`;
				} else {
					// Escape backslash
					fixed = (newPattern || '').replace(/\\/g, '\\\\');
					fixed = quoteString(fixed);
				}

				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(arguments_[0], fixed)
				});
			}
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
		fixable: 'code'
	}
};
