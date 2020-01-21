'use strict';

const ignoredParentTypes = [
	'ArrayExpression',
	'AssignmentExpression',
	'IfStatement',
	'MemberExpression',
	'Property',
	'ReturnStatement',
	'VariableDeclarator'
];

const ignoredGrandparentTypes = [
	'ExpressionStatement'
];

module.exports = function (node) {
	const {parent} = node;
	const {
		parent: grandparent
	} = (parent || {});

	return (parent && ignoredParentTypes.includes(parent.type)) ||
		(grandparent && ignoredGrandparentTypes.includes(grandparent.type));
};
