'use strict';
const avoidCapture = require('./utils/avoid-capture.js');
const {not, notLeftHandSideSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'consistentDestructuring';
const MESSAGE_ID_SUGGEST = 'consistentDestructuringSuggest';

const declaratorSelector = [
	'VariableDeclarator',
	'[id.type="ObjectPattern"]',
	'[init]',
	'[init.type!="Literal"]',
].join('');

const memberSelector = [
	'MemberExpression',
	'[computed!=true]',
	notLeftHandSideSelector(),
	not([
		'CallExpression > .callee',
		'NewExpression> .callee',
	]),
].join('');

const isSimpleExpression = expression => {
	while (expression) {
		if (expression.computed) {
			return false;
		}

		if (expression.type !== 'MemberExpression') {
			break;
		}

		expression = expression.object;
	}

	return expression.type === 'Identifier'
		|| expression.type === 'ThisExpression';
};

const isChildInParentScope = (child, parent) => {
	while (child) {
		if (child === parent) {
			return true;
		}

		child = child.upper;
	}

	return false;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const source = context.getSourceCode();
	const declarations = new Map();

	return {
		[declaratorSelector](node) {
			// Ignore any complex expressions (e.g. arrays, functions)
			if (!isSimpleExpression(node.init)) {
				return;
			}

			declarations.set(source.getText(node.init), {
				scope: context.getScope(),
				variables: context.getDeclaredVariables(node),
				objectPattern: node.id,
			});
		},
		[memberSelector](node) {
			const declaration = declarations.get(source.getText(node.object));

			if (!declaration) {
				return;
			}

			const {scope, objectPattern} = declaration;
			const memberScope = context.getScope();

			// Property is destructured outside the current scope
			if (!isChildInParentScope(memberScope, scope)) {
				return;
			}

			const destructurings = objectPattern.properties.filter(property =>
				property.type === 'Property'
				&& property.key.type === 'Identifier'
				&& property.value.type === 'Identifier',
			);
			const lastProperty = objectPattern.properties[objectPattern.properties.length - 1];

			const hasRest = lastProperty && lastProperty.type === 'RestElement';

			const expression = source.getText(node);
			const member = source.getText(node.property);

			// Member might already be destructured
			const destructuredMember = destructurings.find(property =>
				property.key.name === member,
			);

			if (!destructuredMember) {
				// Don't destructure additional members when rest is used
				if (hasRest) {
					return;
				}

				// Destructured member collides with an existing identifier
				if (avoidCapture(member, [memberScope]) !== member) {
					return;
				}
			}

			// Don't try to fix nested member expressions
			if (node.parent.type === 'MemberExpression') {
				return {
					node,
					messageId: MESSAGE_ID,
				};
			}

			const newMember = destructuredMember ? destructuredMember.value.name : member;

			return {
				node,
				messageId: MESSAGE_ID,
				suggest: [{
					messageId: MESSAGE_ID_SUGGEST,
					data: {
						expression,
						property: newMember,
					},
					* fix(fixer) {
						const {properties} = objectPattern;
						const lastProperty = properties[properties.length - 1];

						yield fixer.replaceText(node, newMember);

						if (!destructuredMember) {
							yield lastProperty
								? fixer.insertTextAfter(lastProperty, `, ${newMember}`)
								: fixer.replaceText(objectPattern, `{${newMember}}`);
						}
					},
				}],
			};
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Use destructured variables over properties.',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages: {
			[MESSAGE_ID]: 'Use destructured variables over properties.',
			[MESSAGE_ID_SUGGEST]: 'Replace `{{expression}}` with destructured property `{{property}}`.',
		},
	},
};
