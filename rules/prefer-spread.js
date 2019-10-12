'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
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
						const arrayLikeArgument = parseArgument(context, node.arguments[0]);
						const replacement = `[...${arrayLikeArgument}]`;

						if (node.arguments.length > 1) {
							const mapFn = parseArgument(context, node.arguments[1]);
							const thisArgument = node.arguments.length === 3 ? parseArgument(context, node.arguments[2]) : null;
							const thisArgumentReplacement = thisArgument ? `, ${thisArgument}` : '';

							return fixer.replaceText(node, `${replacement}.map(${mapFn}${thisArgumentReplacement})`);
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
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
