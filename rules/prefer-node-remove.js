'use strict';
const getDocsUrl = require('./utils/get-docs-url');

function isMemberExpression(node) {
	return node.type === 'MemberExpression';
}

function getMethodName(memberExpression) {
	return memberExpression.property.name;
}

function create(context) {
	return {
		CallExpression(node) {
			const {callee, arguments: [arg]} = node;
			if (
				isMemberExpression(callee) &&
				isMemberExpression(callee.object) &&
				getMethodName(callee.object) === 'parentNode' &&
				getMethodName(callee) === 'removeChild' &&
				arg.name === callee.object.object.name
			) {
				context.report({
					node,
					message: 'Prefer `remove` over `parentNode.removeChild`',
					fix: fixer => [
						fixer.insertTextBefore(callee.object.property, 'remove'),
						fixer.removeRange([
							callee.object.property.range[0],
							callee.property.range[1]
						]),
						fixer.remove(arg)
					]
				});
			}
		}
	};
}

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
