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
		const references = context
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
			.map(reference => ({
				scope: reference.from.block,
				node: reference.identifier.parent.parent,
				arguments: reference.identifier.parent.parent.arguments,
			}));

		const groups = [];
		let currentGroup;

		for (const reference of references) {
			let newGroup = !currentGroup;

			if (reference.node.parent.type === 'ExpressionStatement') {
				if (!newGroup) {
					const previousExpression = getPreviousExpression(
						reference.node.parent,
						sourceCode,
					);
					newGroup = !isObjectDefineProperty(previousExpression?.expression)
					|| (isObjectDefineProperty(previousExpression?.expression)
					&& !(previousExpression.expression.arguments[0]
						&& isSameReference(
							previousExpression.expression.arguments[0],
							reference.arguments[0],
						)));
				}
			} else {
				newGroup = true;
			}

			if (newGroup) {
				currentGroup = {
					scope: reference.scope,
					references: [reference],
				};
				groups.push(currentGroup);
			} else {
				currentGroup.references.push(reference);
			}
		}

		for (const group of groups.filter(group => group.references.length > 1)) {
			context.report({
				node: group.references.at(-1).node,
				messageId: MESSAGE_ID,
				data: {
					replacement: 'Object.defineProperties',
					value: 'Object.defineProperty',
				},
				* fix(fixer) {
					if (
						group.references[0].node.callee.property.name === 'defineProperty'
					) {
						yield fixer.replaceText(
							group.references[0].node.callee.property,
							'defineProperties',
						);

						yield removeArgument(
							fixer,
							group.references[0].arguments[1],
							sourceCode,
						);
					}

					yield fixer.replaceText(
						group.references[0].node.callee.property.name === 'defineProperty'
							? group.references[0].arguments[2]
							: group.references[0].arguments[1],
						`{${group.references.slice(0, 2)
							.flatMap(reference => {
								if (reference.node.callee.property.name === 'defineProperty') {
									return `${
										reference.arguments[1].type === 'Identifier'
											? `[${reference.arguments[1].name}]`
											: `"${reference.arguments[1].value}"`
									}: ${sourceCode.getText(reference.arguments[2])}`;
								}

								if (reference.arguments[1].type === 'Identifier') {
									return reference.arguments[1].name;
								}

								if (reference.arguments[1].type === 'ObjectExpression') {
									return reference.arguments[1].properties.map(property =>
										sourceCode.getText(property),
									);
								}

								return [];
							})
							.join(',')}}`,
					);

					yield fixer.remove(group.references[1].node);

					const token = sourceCode.getTokenAfter(group.references[1].node);
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
