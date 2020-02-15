'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueNotUsable = require('./utils/is-value-not-usable');
const methodSelector = require('./utils/method-selector');

const selector = methodSelector({
	name: 'removeChild',
	length: 1
});

const message = 'Prefer Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.';

// TODO: support more types of childNode
const getArgumentName = arguments_ => {
	const [identifier] = arguments_;

	if (identifier.type === 'ThisExpression') {
		return 'this';
	}

	if (identifier.type === 'Identifier' && identifier.name !== 'undefined') {
		return identifier.name;
	}
};

const create = context => {
	return {
		[selector](node) {
			const argumentName = getArgumentName(node.arguments);

			if (argumentName) {
				const fix = isValueNotUsable(node) ?
					fixer => fixer.replaceText(node, `${argumentName}.remove()`) :
					undefined;

				context.report({
					node,
					message,
					fix
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
