'use strict';

const isMethodNamed = (node, name) => {
	return (
		node.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === name
	);
};

module.exports = isMethodNamed;
