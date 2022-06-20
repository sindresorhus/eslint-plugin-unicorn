'use strict';
const hasSameRange = require('./utils/has-same-range.js');
const {removeArgument} = require('./fix/index.js');

const MESSAGE_ID = 'prefer-object-define-properties';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over multiple `{{value}}`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	'Program:exit'() {
		const references = context
			.getScope()
			.variableScope.set.get('Object')
			.references.filter(
				reference =>
					reference.identifier.parent.type === 'MemberExpression'
					&& reference.identifier.parent.property.name === 'defineProperty'
					&& reference.identifier.parent.parent.arguments?.[1]?.type === 'Literal'
					&& reference.identifier.parent.parent.arguments?.[2]?.type === 'ObjectExpression',
			)
			.map(reference => ({
				scope: reference.from.block,
				node: reference.identifier.parent.parent,
				arguments: reference.identifier.parent.parent.arguments,
			}));

		const groups = [];
		let currentGroup;
		for (const reference of references) {
			if (!currentGroup || !hasSameRange(currentGroup.scope, reference.scope)) {
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
				node: group.references[0].node,
				messageId: MESSAGE_ID,
				data: {
					replacement: 'Object.defineProperties',
					value: 'Object.defineProperty',
				},
				* fix(fixer) {
					const sourceCode = context.getSourceCode();

					yield fixer.replaceText(
						group.references[0].node.callee.property,
						'defineProperties',
					);

					yield removeArgument(
						fixer,
						group.references[0].arguments[1],
						sourceCode,
					);
					yield fixer.replaceText(
						group.references[0].arguments[2],
						`{${group.references
							.map(
								reference =>
									`"${reference.arguments[1].value}": ${sourceCode.getText(
										reference.arguments[2],
									)}`,
							)
							.join(',')}}`,
					);

					for (const reference of group.references.slice(1)) {
						yield fixer.remove(reference.node);

						const token = sourceCode.getTokenAfter(reference.node);
						if (token?.value === ';') {
							yield fixer.remove(token);
						}
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
