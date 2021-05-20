'use strict';
const {isOpeningBraceToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const toLocation = require('./utils/to-location');
const {matches} = require('./selectors');

const MESSAGE_ID = 'empty-brace-spaces';
const messages = {
	[MESSAGE_ID]: 'Do not add spaces between braces.'
};

const selector = matches([
	'BlockStatement[body.length=0]',
	'ClassBody[body.length=0]',
	'ObjectExpression[properties.length=0]',
	// Experimental https://github.com/tc39/proposal-record-tuple
	'RecordExpression[properties.length=0]',
	// Experimental https://github.com/tc39/proposal-class-static-block
	'StaticBlock[body.length=0]'
]);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();
	return {
		[selector](node) {
			const text = sourceCode.getText(node);

			let startOffset = 1;
			let endOffset = -1;
			switch (node.type) {
				case 'RecordExpression': {
					startOffset = 2;
					if (text.startsWith('{|')) {
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

			if (!/^\s+$/.test(text.slice(startOffset, endOffset))) {
				return;
			}

			const start = node.range[0] + startOffset;
			const end = node.range[1] + endOffset;
			const range = [start, end];
			context.report({
				loc: toLocation(range, sourceCode),
				messageId: MESSAGE_ID,
				fix: fixer => fixer.removeRange(range)
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
