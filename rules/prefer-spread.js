'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const isArrayFrom = node => {
	const {callee} = node;
	return (
		callee.type === 'MemberExpression' &&
		callee.object.type === 'Identifier' &&
		callee.object.name === 'Array' &&
		callee.property.type === 'Identifier' &&
		callee.property.name === 'from'
	);
};

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
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
