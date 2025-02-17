import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isMemberExpression} from '../../rules/ast/index.js';
import {removeMemberExpressionProperty} from '../../rules/fix/index.js';

const messageId = path.basename(fileURLToPath(import.meta.url), '.js');

const properties = new Map([
	// Todo: forbid `.range`
	// ['range', 'sourceCode.getRange'],
	['loc', 'sourceCode.getLoc'],
]);

const propertyNames = [...properties.keys()];

const config = {
	create(context) {
		return {
			MemberExpression(memberExpression) {
				if (!isMemberExpression(memberExpression, {
					properties: propertyNames,
					optional: false,
					computed: false,
				})) {
					return;
				}

				const {name} = memberExpression.property;
				const replacementFunction = properties.get(name);

				context.report({
					node: memberExpression.property,
					messageId,
					data: {
						name,
						replacementFunction,
					},
					* fix(fixer) {
						const {sourceCode} = context;
						yield removeMemberExpressionProperty(fixer, memberExpression, sourceCode);
						yield fixer.insertTextBefore(memberExpression, `${replacementFunction}(`);
						yield fixer.insertTextAfter(memberExpression, ')');
					},
				});
			},
			ObjectPattern(objectPattern) {
				for (const property of objectPattern.properties) {
					if (!(
						property.type === 'Property'
						&& !property.computed
						&& property.key.type === 'Identifier'
						&& propertyNames.includes(property.key.name)
					)) {
						continue;
					}

					const {name} = property.key;
					const replacementFunction = properties.get(name);

					context.report({
						node: property.key,
						messageId,
						data: {
							name,
							replacementFunction,
						},
					});
				}
			},
		};
	},
	meta: {
		fixable: 'code',
		messages: {
			[messageId]: 'Use `{{replacementFunction}}(node)` instead of accessing `node.{{name}}`.',
		},
	},
};

export default config;
