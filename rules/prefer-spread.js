'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const selector = [
	methodSelector({
		object: 'Array',
		name: 'from',
		length: [1, 3]
	}),
	// Allow Array.from({length})
	'[arguments.0.type!="ObjectExpression"]'
].join('');

const create = context => {
	const getSource = node => context.getSourceCode().getText(node);

	return {
		[selector](node) {
			context.report({
				node,
				message: 'Prefer the spread operator over `Array.from()`.',
				fix: fixer => {
					const [arrayLikeArgument, mapFn, thisArgument] = node.arguments.map(getSource);
					let replacement = `[...${arrayLikeArgument}]`;

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
