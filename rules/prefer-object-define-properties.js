'use strict';
const isSameReference = require('./utils/is-same-reference.js');
const {removeArgument} = require('./fix/index.js');

const MESSAGE_ID = 'prefer-object-define-properties';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over multiple `{{value}}`.',
};

function getPreviousExpression(node, sourceCode) {
	const {parent} = node;
	const visitorKeys
		= sourceCode.visitorKeys[parent.type] || Object.keys(parent);

	for (const property of visitorKeys) {
		const value = parent[property];
		if (Array.isArray(value)) {
			const index = value.indexOf(node);

			if (index !== -1) {
				return value[index - 1];
			}
		}
	}
}

function isObjectDefinePropertyOrObjectDefineProperties(node) {
	if (node?.type !== 'CallExpression' || node.optional) {
		return false;
	}

	const { callee, arguments: callArguments} = node;
	if (
		callee.type !== 'MemberExpression'
		|| callArguments.some(({type}) => type === 'RestElement')
	) {
		return false;
	}

	const {computed, optional, object, property} = callee;
	if (
		computed
		|| optional
		|| object.type !== 'Identifier'
		|| object.name !== 'Object'
		|| property.type !== 'Identifier'
	) {
		return false;
	}


	if (property.name === 'defineProperty') {
		return callArguments.length === 3;
	}

	if (property.name === 'defineProperties') {
		return callArguments.length === 2;
	}

	return false;
}

function getDescriptorsText(callExpression, sourceCode) {
	const method = callExpression.callee.property.name;

	if (method === 'defineProperty') {
		let [, property, descriptor] = callExpression.arguments;
		let propertyText = sourceCode.getText(property);
		if (property.type !== 'Literal') {
			propertyText = `[${propertyText}]`;
		}
		return `${propertyText}: ${sourceCode.getText(descriptor)}`;
	}

	const [, descriptors] = callExpression.arguments;
	if (descriptors.type === 'ObjectExpression') {
		return descriptors.properties.map(property => sourceCode.getText(property)).join(',\n');
	}

	return `...(${sourceCode.getText(descriptors)})`;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	'Program:exit'() {
		const sourceCode = context.getSourceCode();
		const callExpressions = context
			.getScope()
			.variableScope.set.get('Object')
			.references.filter(
				reference =>
					isObjectDefinePropertyOrObjectDefineProperties(reference.identifier.parent.parent)
			)
			.map(reference => reference.identifier.parent.parent);

		for (const secondCallExpression of callExpressions) {
			if (secondCallExpression.parent.type !== 'ExpressionStatement') {
				continue;
			}

			const previousExpression = getPreviousExpression(
				secondCallExpression.parent,
				sourceCode,
			);

			if (!previousExpression) {
				continue;
			}

			const firstCallExpression = previousExpression.expression;

			if (!callExpressions.includes(firstCallExpression)) {
				continue;
			}

			const [object] = firstCallExpression.arguments;
			if (!object || !isSameReference(object, secondCallExpression.arguments[0])) {
				continue;
			}

			context.report({
				node: secondCallExpression,
				messageId: MESSAGE_ID,
				data: {
					replacement: 'Object.defineProperties',
					value: 'Object.defineProperty',
				},
				* fix(fixer) {
					if (firstCallExpression.callee.property.name === 'defineProperty') {
						yield fixer.replaceText(
							firstCallExpression.callee.property,
							'defineProperties',
						);

						yield removeArgument(
							fixer,
							firstCallExpression.arguments[1],
							sourceCode,
						);
					}

					const descriptors = [firstCallExpression, secondCallExpression]
						.map(callExpressions => getDescriptorsText(callExpressions, sourceCode))
						.join(',\n');

					yield fixer.replaceText(
						firstCallExpression.callee.property.name === 'defineProperty'
							? firstCallExpression.arguments[2]
							: firstCallExpression.arguments[1],
						`{${descriptors}}`,
					);

					yield fixer.remove(secondCallExpression);

					const token = sourceCode.getTokenAfter(secondCallExpression);
					if (token?.value === ';') {
						yield fixer.remove(token);
					}
				},
			});
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Prefer using `Object.defineProperties` over multiple `Object.defineProperty` calls.',
		},
		fixable: 'code',
		messages,
	},
};
