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

function isObjectDefineProperty(node) {
	return (
		node
		&& node.type === 'CallExpression'
		&& node.callee.type === 'MemberExpression'
		&& !node.computed
		&& node.callee.object.name === 'Object'
		&& /definePropert(y|ies)/.test(node.callee.property.name)
	);
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
					(reference.identifier.parent.type === 'MemberExpression'
						&& reference.identifier.parent.property.name === 'defineProperty'
						&& /Identifier|Literal/.test(
							reference.identifier.parent.parent.arguments?.[1]?.type,
						)
						&& /Identifier|ObjectExpression/.test(
							reference.identifier.parent.parent.arguments?.[2]?.type,
						))
					|| (reference.identifier.parent.property?.name === 'defineProperties'
						&& /Identifier|ObjectExpression/.test(
							reference.identifier.parent.parent.arguments?.[1]?.type,
						)),
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

			if (!isObjectDefineProperty(firstCallExpression)) {
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

					yield fixer.replaceText(
						firstCallExpression.callee.property.name === 'defineProperty'
							? firstCallExpression.arguments[2]
							: firstCallExpression.arguments[1],
						`{${[firstCallExpression, secondCallExpression]
							.flatMap(callExpression => {
								if (callExpression.callee.property.name === 'defineProperty') {
									return `${
										callExpression.arguments[1].type === 'Identifier'
											? `[${callExpression.arguments[1].name}]`
											: `"${callExpression.arguments[1].value}"`
									}: ${sourceCode.getText(callExpression.arguments[2])}`;
								}

								if (callExpression.arguments[1].type === 'Identifier') {
									return callExpression.arguments[1].name;
								}

								if (callExpression.arguments[1].type === 'ObjectExpression') {
									return callExpression.arguments[1].properties.map(property =>
										sourceCode.getText(property),
									);
								}

								return [];
							})
							.join(',\n')}}`,
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
