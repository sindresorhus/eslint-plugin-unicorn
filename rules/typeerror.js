'use strict';

const isTypecheckingProvider = node => node.type === 'Identifier' && node.name === 'check';

const isTypecheckingOperator = operator => operator === 'typeof' || operator === 'instanceof';

const isTypecheckingIdentifier = node => {
	return node.type === 'Identifier' &&
	(node.name.match(/[Ii]s[A-Z0-9][\w_]*/) !== null ||
	node.name === 'kindOf');
};

const throwsErrorObject = node => {
	return (node.argument.type === 'NewExpression' &&
		node.argument.callee.type === 'Identifier' &&
		node.argument.callee.name === 'Error');
};

const isTypecheckingMemberExpression = node => {
	if (isTypecheckingIdentifier(node.property)) {
		return true;
	}
	if (node.object.type === 'MemberExpression') {
		return isTypecheckingMemberExpression(node.object);
	}
	return isTypecheckingProvider(node.object);
};

const isTypecheckingExpression = node => {
	console.log('expression:', node.type);
	switch (node.type) {
		case 'Identifier':
			return isTypecheckingIdentifier(node);
		case 'MemberExpression':
			return isTypecheckingMemberExpression(node);
		case 'CallExpression':
			return isTypecheckingExpression(node.callee);
		case 'UnaryExpression':
			return isTypecheckingOperator(node.operator);
		case 'BinaryExpression':
			return isTypecheckingOperator(node.operator) ||
				(isTypecheckingExpression(node.left) || isTypecheckingExpression(node.right));
		case 'LogicalExpression':
			return isTypecheckingExpression(node.left) && isTypecheckingExpression(node.right);
		default:
	}
	return false;
};

const isTypechecking = node => node.type === 'IfStatement' && isTypecheckingExpression(node.test);

const create = context => {
	return {
		ThrowStatement: node => {
			if (throwsErrorObject(node) &&
				isTypechecking(node.parent.parent)) {
				context.report({
					node,
					message: '`new Error()` is too unspecific for a typecheck, use `new TypeError()` instead.',
					fix: fixer => fixer.replaceText(node.argument.callee.name, 'TypeError')
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
