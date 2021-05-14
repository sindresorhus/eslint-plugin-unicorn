'use strict';
const {isOpeningBraceToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'empty-brace-spaces';
const messages = {
	[MESSAGE_ID]: 'Do not add spaces between braces.'
};

const selector = `:matches(${
	[
		'BlockStatement[body.length=0]',
		'ClassBody[body.length=0]',
		'ObjectExpression[properties.length=0]',
		// Experimental https://github.com/tc39/proposal-record-tuple
		'RecordExpression[properties.length=0]',
		// Experimental https://github.com/tc39/proposal-class-static-block
		'StaticBlock[body.length=0]'
	].join(', ')
})`;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();
	return {
		[selector](node) {
			let startOffset = 1;
			let endOffset = -1;

			switch (node.type) {
				case 'RecordExpression': {
					startOffset = 2;
					const [start] = node.range;
					const firstTwoCharacters = sourceCode.text.slice(start, start + 2);
					if (firstTwoCharacters === '{|') {
						endOffset = -2;
					}

					break;
				}

				case 'StaticBlock': {
					const openingBraceToken = sourceCode.getFirstToken(node, isOpeningBraceToken);
					startOffset = openingBraceToken.range[1] - node.range[0];
					break;
				}
				// No default
			}

			const start = node.range[0] + startOffset;
			const end = node.range[1] + endOffset;

			if (!/^\s+$/.test(sourceCode.text.slice(start, end))) {
				return;
			}

			context.report({
				loc: {
					start: sourceCode.getLocFromIndex(start),
					end: sourceCode.getLocFromIndex(end)
				},
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceTextRange([start, end], '')
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce no spaces between braces.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'whitespace',
		schema: [],
		messages
	}
};
