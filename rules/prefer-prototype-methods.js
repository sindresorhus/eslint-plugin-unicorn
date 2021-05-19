'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {methodCallSelector} = require('./selectors');
const getPropertyName = require('./utils/get-property-name');

const messages = {
	'known-constructor-known-method': 'Prefer using `{{constructorName}}.prototype.{{methodName}}`.',
	'known-constructor-unknown-method': 'Prefer using method from `{{constructorName}}.prototype`.',
	'unknown-constructor-known-method': 'Prefer using `{{methodName}}` method from the constructor prototype.',
	'unknown-constructor-unknown-method': 'Prefer using method from the constructor prototype.'
};

const functionMethodsSelector = [
	methodCallSelector({
		names: ['apply', 'bind', 'call']
	}),
	' > ',
	'.callee',
	' > ',
	'.object'
].join('');

const reflectApplySelector = methodCallSelector({
	object: 'Reflect',
	name: 'apply',
	min: 1
});

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
function create(context) {
	function check(method) {
		const {type, object} = method;
		if (
			type !== 'MemberExpression' ||
			// Most likely it's a static method of a class
			(object.type === 'Identifier' && /^[A-Z]/.test(object.name)) ||
			(
				object.type === 'MemberExpression' &&
				!object.computed &&
				!object.optional &&
				object.property.type === 'Identifier' &&
				object.property.name === 'prototype'
			)
		) {
			return;
		}

		const constructorName = getConstructorName(object);
		const methodName = getPropertyName(method, context.getScope());
		const messageId = [
			constructorName ? 'known' : 'unknown',
			'constructor',
			methodName ? 'known' : 'unknown',
			'method'
		].join('-');

		const problem = {
			node: method,
			messageId,
			data: {constructorName, methodName: String(methodName)}
		};

		if (constructorName && isSafeToFix(object)) {
			problem.fix = fixer => fixer.replaceText(object, `${constructorName}.prototype`);
		}

		context.report(problem);
	}

	return {
		[reflectApplySelector](node) {
			check(node.arguments[0]);
		},
		[functionMethodsSelector]: check
	};
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer borrowing methods from the prototype instead of the instance.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema: [],
		messages
	}
};
