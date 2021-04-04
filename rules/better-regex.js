'use strict';
const cleanRegexp = require('clean-regexp');
const {optimize} = require('regexp-tree');
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

const MESSAGE_ID = 'better-regex';
const messages = {
	[MESSAGE_ID]: '{{original}} can be optimized to {{optimized}}.'
};

const create = context => {
	const {sortCharacterClasses} = context.options[0] || {};

	const ignoreList = [];

	if (sortCharacterClasses === false) {
		ignoreList.push('charClassClassrangesMerge');
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
				optimized = optimize(original, undefined, {blacklist: ignoreList}).toString();
			} catch (error) {
				context.report({
					node,
					data: {
						original,
						error: error.message
					},
					message: 'Problem parsing {{original}}: {{error}}'
				});
				return;
			}

			if (original === optimized) {
				return;
			}

			context.report({
				node,
				messageId: MESSAGE_ID,
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
				context.report({
					node,
					messageId: MESSAGE_ID,
					data: {
						original: oldPattern,
						optimized: newPattern
					},
					fix: fixer => fixer.replaceText(
						patternNode,
						quoteString(newPattern)
					)
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
			description: 'Improve regexes by making them shorter, consistent, and safer.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
