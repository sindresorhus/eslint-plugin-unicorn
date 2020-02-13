'use strict';
const cleanRegexp = require('clean-regexp');
const {optimize} = require('regexp-tree');
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

const message = '{{original}} can be optimized to {{optimized}}';

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
				message,
				data: {
					original,
					optimized
				},
				fix: fixer => fixer.replaceText(node, optimized)
			});
		},
		'NewExpression[callee.type="Identifier"][callee.name="RegExp"][arguments.length>=1][arguments.0.type="Literal"]': node => {
			const [patternNode, flagsNode] = node.arguments;

			if (typeof patternNode.value !== 'string') {
				return;
			}

			const oldPattern = patternNode.value;
			const flags = flagsNode &&
				flagsNode.type === 'Literal' &&
				typeof flagsNode.value === 'string' ?
				flagsNode.value :
				'';

			const newPattern = cleanRegexp(oldPattern, flags);

			if (oldPattern !== newPattern) {
				// Escape backslash
				const fixed = quoteString(newPattern.replace(/\\/g, '\\\\'));

				context.report({
					node,
					message,
					data: {
						original: oldPattern,
						optimized: newPattern
					},
					fix: fixer => fixer.replaceText(patternNode, fixed)
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
