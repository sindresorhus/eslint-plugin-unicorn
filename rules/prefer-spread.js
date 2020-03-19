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

// https://github.com/eslint/espree/blob/6b7d0b8100537dcd5c84a7fb17bbe28edcabe05d/lib/token-translator.js#L20
const tokenTypesCantFollowOpenBracket = new Set([
	'String',
	'Null',
	'Boolean',
	'Numeric',
	'RegularExpression'
]);

const create = context => {
	const sourceCode = context.getSourceCode();
	const getSource = node => sourceCode.getText(node);

	const needsSemicolon = node => {
		const tokenBefore = sourceCode.getTokenBefore(node);

		if (!tokenBefore) {
			return false;
		}

		const {type, value} = tokenBefore;
		if (type === 'Punctuator') {
			if (value === ';') {
				return false;
			}

			if (value === ']' || value === ')') {
				return true;
			}
		}

		if (tokenTypesCantFollowOpenBracket.has(type)) {
			return true;
		}

		if (type === 'Template') {
			return value.endsWith('`');
		}

		const lastBlockNode = sourceCode.getNodeByRangeIndex(tokenBefore.range[0]);
		if (lastBlockNode && lastBlockNode.type === 'ObjectExpression') {
			return true;
		}

		if (type === 'Identifier') {
			// `for...of`
			if (value === 'of' && lastBlockNode && lastBlockNode.type === 'ForOfStatement') {
				return false;
			}

			// `await`
			if (value === 'await' && lastBlockNode && lastBlockNode.type === 'AwaitExpression') {
				return false;
			}

			return true;
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
