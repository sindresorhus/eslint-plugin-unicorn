'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const needsSemicolon = require('./utils/needs-semicolon');

const MESSAGE_ID = 'prefer-spread';
const messages = {
	[MESSAGE_ID]: 'Prefer the spread operator over `Array.from()`.'
};

const selector = [
	methodSelector({
		object: 'Array',
		name: 'from',
		min: 1,
		max: 3
	}),
	// Allow `Array.from({length})`
	'[arguments.0.type!="ObjectExpression"]'
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();
	const getSource = node => sourceCode.getText(node);

	return {
		[selector](node) {
			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer => {
					const [arrayLikeArgument, mapFn, thisArgument] = node.arguments.map(node => getSource(node));
					let replacement = `${
						needsSemicolon(sourceCode.getTokenBefore(node), sourceCode) ? ';' : ''
					}[...${arrayLikeArgument}]`;

					if (mapFn) {
						const mapArguments = [mapFn, thisArgument].filter(Boolean);
						replacement += `.map(${mapArguments.join(', ')})`;
					}

					return fixer.replaceText(node, replacement);
				}
			});
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
		fixable: 'code',
		messages
	}
};
