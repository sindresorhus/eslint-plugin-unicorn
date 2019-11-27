'use strict';
const cleanRegexp = require('clean-regexp');
const {generate, optimize, parse} = require('regexp-tree');
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

const message = 'Use regex shorthands to improve readability.';

const create = context => {
	return {
		'Literal[regex]': node => {
			const {type, value} = context.getSourceCode().getFirstToken(node);

			if (type !== 'RegularExpression') {
				return;
			}

			let parsedSource;
			try {
				parsedSource = parse(value);
			} catch (error) {
				context.report({
					node,
					message: '{{original}} can\'t be parsed: {{message}}',
					data: {
						original: value,
						message: error.message
					}
				});

				return;
			}

			const originalRegex = generate(parsedSource).toString();
			const optimizedRegex = optimize(value).toString();

			if (originalRegex === optimizedRegex) {
				return;
			}

			context.report({
				node,
				message: '{{original}} can be optimized to {{optimized}}',
				data: {
					original: value,
					optimized: optimizedRegex
				},
				fix(fixer) {
					return fixer.replaceText(node, optimizedRegex);
				}
			});
		},
		'NewExpression[callee.name="RegExp"]': node => {
			const arguments_ = node.arguments;

			if (arguments_.length === 0 || arguments_[0].type !== 'Literal') {
				return;
			}

			const hasRegExp = arguments_[0].regex;

			if (hasRegExp) {
				return;
			}

			const oldPattern = arguments_[0].value;
			const flags = arguments_[1] && arguments_[1].type === 'Literal' ? arguments_[1].value : '';

			const newPattern = cleanRegexp(oldPattern, flags);

			if (oldPattern !== newPattern) {
				// Escape backslash
				const fixed = quoteString((newPattern || '').replace(/\\/g, '\\\\'));

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
