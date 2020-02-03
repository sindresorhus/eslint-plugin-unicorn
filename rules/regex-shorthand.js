'use strict';
const cleanRegexp = require('clean-regexp');
const {optimize} = require('regexp-tree');
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

const message = 'Use regex shorthands to improve readability.';

const create = context => {
	const {sortCharacterClasses} = context.options[0] || {};

	const blacklist = [];

	if (sortCharacterClasses === false) {
		blacklist.push('charClassClassrangesMerge');
	}

	return {
		'Literal[regex]': node => {
			const {raw: original, regex} = node;

			// Regular Expressions with `u` flag are not well handled by `regexp-tree`
			// https://github.com/DmitrySoshnikov/regexp-tree/issues/162
			if (regex.flags.includes('u')) {
				return;
			}

			let optimized = original;

			try {
				optimized = optimize(original, undefined, {blacklist}).toString();
			} catch (_) {}

			if (original === optimized) {
				return;
			}

			context.report({
				node,
				message: '{{original}} can be optimized to {{optimized}}',
				data: {
					original,
					optimized
				},
				fix: fixer => fixer.replaceText(node, optimized)
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

const schema = [
	{
		type: 'object',
		properties: {
			sortCharacterClasses: {
				type: 'boolean',
				default: true
			}
		}
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema
	}
};
