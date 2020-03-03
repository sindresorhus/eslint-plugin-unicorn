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

const create = context => {
	const sourceCode = context.getSourceCode();
	const getSource = node => sourceCode.getText(node);

	const needsSemicolon = node => {
		const tokenBefore = sourceCode.getTokenBefore(node);

		if (tokenBefore) {
			const {type, value} = tokenBefore;
			if (type === 'Punctuator') {
				if (value === ';') {
					return false;
				}

				if (value === ']' || value === ')') {
					return true;
				}
			}

			const lastBlockNode = sourceCode.getNodeByRangeIndex(tokenBefore.range[0]);
			if (lastBlockNode && lastBlockNode.type === 'ObjectExpression') {
				return true;
			}
		}

		return false;
	};

	return {
		[selector](node) {
			context.report({
				node,
				message: 'Prefer the spread operator over `Array.from()`.',
				fix: fixer => {
					const [arrayLikeArgument, mapFn, thisArgument] = node.arguments.map(getSource);
					let replacement = `${needsSemicolon(node) ? ';' : ''}[...${arrayLikeArgument}]`;

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
