'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const defaults = [
	'lodash',
	'underscore',
	'util'
];

// This part handles the VariableDeclarator
const isObjectPattern = node => node.id.type === 'ObjectPattern';

const isImportingDirect = callExpression => {
	if (callExpression.callee.name === 'require') {
		if (defaults.includes(callExpression.arguments[0].value)) {
			return true;
		}

		return false;
	}

	return false;
};

const importDirectVariable = (context, node, callExpression) => {
	if (isObjectPattern(node)) {
		return true;
	}

	if (isImportingDirect(callExpression)) {
		context.report({
			node,
			message: 'Do not reference directly'
		});
	}
};

// This part handles the ImportSpecifiers
const isImportSpecifier = node => node.specifiers[0].type === 'ImportSpecifier';

const isImportRestricted = node => {
	if (defaults.includes(node.source.value)) {
		return true;
	}

	return false;
};

const importDirectDeclaration = (context, node) => {
	if (isImportSpecifier(node)) {
		return true;
	}

	if (isImportRestricted(node)) {
		context.report({
			node,
			message: 'Do not reference directly'
		});
	}
};

const create = context => {
	return {
		VariableDeclarator: node => importDirectVariable(context, node, node.init),
		ImportDeclaration: node => importDirectDeclaration(context, node)
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
