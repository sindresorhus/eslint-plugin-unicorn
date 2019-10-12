'use strict';
const getDocsUrl = require('./utils/get-docs-url');
const isObjectMethod = require('./utils/is-object-method');

const isArrayFrom = node => isObjectMethod(node, 'Array', 'from');
const isArrayLike = argument => argument && argument.type !== 'ObjectExpression';

const parseArgument = (context, argument) => {
	if (argument.type === 'Identifier') {
		return argument.name;
	}

	return context.getSourceCode().getText(argument);
};

const create = context => {
	return {
		CallExpression(node) {
			if (isArrayFrom(node) && isArrayLike(node.arguments[0])) {
				context.report({
					node,
					message: 'Prefer the spread operator over `Array.from()`.',
					fix: fixer => {
						const arrayLikeArg = parseArgument(context, node.arguments[0]);
						const replacement = `[...${arrayLikeArg}]`;

						if (node.arguments.length > 1) {
							const mapFn = parseArgument(context, node.arguments[1]);
							const thisArg = node.arguments.length === 3 ? parseArgument(context, node.arguments[2]) : null;
							const thisArgReplacement = thisArg ? `, ${thisArg}` : '';

							return fixer.replaceText(node, `${replacement}.map(${mapFn}${thisArgReplacement})`);
						}

						return fixer.replaceText(node, replacement);
					}
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
