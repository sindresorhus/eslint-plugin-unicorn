'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

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

const isClosingBracketToken = token => token && token.value === ']' && token.type === 'Punctuator';

const create = context => {
	const sourceCode = context.getSourceCode();
	const getSource = node => sourceCode.getText(node);

	return {
		[selector](node) {
			context.report({
				node,
				message: 'Prefer the spread operator over `Array.from()`.',
				fix: fixer => {
					const [arrayLikeArgument, mapFn, thisArgument] = node.arguments.map(getSource);
					const tokenBefore = sourceCode.getTokenBefore(node);
					let replacement = `${isClosingBracketToken(tokenBefore) ? ';' : ''}[...${arrayLikeArgument}]`;

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
		fixable: 'code'
	}
};
