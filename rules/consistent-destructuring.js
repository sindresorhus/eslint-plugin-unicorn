'use strict';
const avoidCapture = require('./utils/avoid-capture');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'consistentDestructuring';
const MESSAGE_ID_SUGGEST = 'consistentDestructuringSuggest';

const declaratorSelector = [
	'VariableDeclarator',
	'[id.type="ObjectPattern"]',
	'[init.type!="Literal"]'
].join('');

const isChildInParentScope = (child, parent) => {
	while (child) {
		if (child === parent) {
			return true;
		}

		child = child.upper;
	}

	return false;
};

const fixDestructuring = (fixer, objectPattern, member, newMember) => {
	// Check if member needs to be renamed
	const property = member === newMember ?
		`${member}` :
		`${member}: ${newMember}`;
	const {properties} = objectPattern;
	const lastProperty = properties[properties.length - 1];

	if (lastProperty) {
		return fixer.insertTextAfter(lastProperty, `, ${property}`);
	}

	return fixer.replaceText(objectPattern, `{${property}}`);
};

const create = context => {
	const {ecmaVersion} = context.parserOptions;
	const source = context.getSourceCode();
	const declarations = new Map();

	return {
		[declaratorSelector]: node => {
			declarations.set(source.getText(node.init), {
				scope: context.getScope(),
				variables: context.getDeclaredVariables(node),
				objectPattern: node.id
			});
		},
		MemberExpression: node => {
			const {parent, object, property} = node;

			// Ignore member function calls and delete expressions
			if (
				(parent.type === 'CallExpression' &&
				parent.callee === node) ||
				(parent.type === 'UnaryExpression' &&
				parent.operator === 'delete')
			) {
				return;
			}

			const declaration = declarations.get(source.getText(object));

			if (!declaration) {
				return;
			}

			const {scope, objectPattern} = declaration;
			const memberScope = context.getScope();

			// Property is destructured outside the current scope
			if (!isChildInParentScope(memberScope, scope)) {
				return;
			}

			const isNested = parent.type === 'MemberExpression';

			if (isNested) {
				context.report({
					node,
					messageId: MESSAGE_ID
				});

				return;
			}

			const destructurings = objectPattern.properties.filter(property =>
				property.key.type === 'Identifier' && property.value.type === 'Identifier'
			);
			const expression = source.getText(node);
			const member = source.getText(property);

			// Member might already be destructured
			const destructuredMember = destructurings.find(property =>
				property.key.name === member
			);
			const newMember = destructuredMember ?
				destructuredMember.value.name :
				avoidCapture(member, [memberScope], ecmaVersion);

			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {
					expression,
					property: newMember
				},
				suggest: [{
					messageId: MESSAGE_ID_SUGGEST,
					fix: destructuredMember ?
						fixer => [fixer.replaceText(node, newMember)] :
						fixer => [
							fixer.replaceText(node, newMember),
							fixDestructuring(fixer, objectPattern, member, newMember)
						]
				}]
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages: {
			[MESSAGE_ID]: 'Use destructured variables over properties.',
			[MESSAGE_ID_SUGGEST]: 'Replace `{{expression}}` with destructured property `{{property}}`.'
		}
	}
};
