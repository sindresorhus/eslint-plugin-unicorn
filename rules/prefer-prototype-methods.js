'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const getPropertyName = require('./utils/get-property-name');

const messages = {
	'known-constructor-known-method': 'Prefer use `{{constructorName}}.prototype.{{methodName}}`.',
	'known-constructor-unknown-method': 'Prefer use method from `{{constructorName}}.prototype`.',
	'unknown-constructor-known-method': 'Prefer use `{{methodName}}` method from the constructor prototype.',
	'unknown-constructor-unknown-method': 'Prefer use method from the constructor prototype.'
};

const selector = [
	methodSelector({
		names: ['apply', 'bind', 'call']
	}),
	' > ',
	'.callee',
	' > ',
	'MemberExpression.object',
	// Most likely it's a static method of a class
	':not([object.name=/^[A-Z]/])'
].join('');

function getConstructorName(node) {
	switch (node.type) {
		case 'ArrayExpression':
			return 'Array';
		case 'ObjectExpression':
			return 'Object';
			// No default
	}
}

function isSafeToFix(node) {
	switch (node.type) {
		case 'ArrayExpression':
			return node.elements.length === 0;
		case 'ObjectExpression':
			return node.properties.length === 0;
			// No default
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](method) {
			const scope = context.getScope();
			const {object} = method;
			if (
				object.type === 'MemberExpression' &&
				!object.computed &&
				!object.optional &&
				object.property.type === 'Identifier' &&
				object.property.name === 'prototype'
			) {
				return;
			}

			const constructorName = getConstructorName(object);
			const methodName = getPropertyName(method, scope);
			const messageId = [
				constructorName ? 'known' : 'unknown',
				'constructor',
				methodName ? 'known' : 'unknown',
				'method'
			].join('-');

			const problem = {
				node: method,
				messageId,
				data: {constructorName, methodName}
			};

			if (constructorName && isSafeToFix(object)) {
				problem.fix = fixer => fixer.replaceText(object, `${constructorName}.prototype`);
			}

			context.report(problem);
		}
	};
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer use methods from the prototype instead of methods from an instance.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
