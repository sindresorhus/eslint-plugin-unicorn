'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const getMethodName = memberExpression => memberExpression.property.name;

const ignoredParentTypes = [
	'ArrayExpression',
	'IfStatement',
	'MemberExpression',
	'Property',
	'ReturnStatement',
	'VariableDeclarator'
];

const ignoredGrandparentTypes = [
	'ExpressionStatement'
];

const create = context => {
	return {
		CallExpression(node) {
			const {
				callee,
				parent
			} = node;

			const {
				parent: grandparent
			} = (parent || {});

			if (callee.type === 'MemberExpression' && getMethodName(callee) === 'appendChild') {
				let fix = fixer => fixer.replaceText(callee.property, 'append');

				if (parent && ignoredParentTypes.includes(parent.type)) {
					fix = undefined;
				}

				if (grandparent && ignoredGrandparentTypes.includes(grandparent.type)) {
					fix = undefined;
				}

				context.report({
					node,
					message: 'Prefer `Node#append()` over `Node#appendChild()`.',
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
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
