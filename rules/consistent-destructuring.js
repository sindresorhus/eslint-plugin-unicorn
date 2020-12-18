'use strict';
const avoidCapture = require('./utils/avoid-capture');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'consistentDestructuring';
const MESSAGE_ID_SUGGEST = 'consistentDestructuringSuggest';

const declaratorSelector = [
	'VariableDeclarator',
	'[id.type="ObjectPattern"]',
	'[init]',
	'[init.type!="Literal"]'
].join('');

const memberSelector = [
	'MemberExpression',
	'[computed=false]',
	':not(',
	'AssignmentExpression > MemberExpression.left,',
	'CallExpression > MemberExpression.callee,',
	'NewExpression > MemberExpression.callee,',
	'UpdateExpression > MemberExpression.argument,',
	'UnaryExpression[operator="delete"] > MemberExpression.argument',
	')'
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

	return expression.type === 'Identifier' ||
		expression.type === 'ThisExpression';
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
			// Ignore any complex expressions (e.g. arrays, functions)
			if (!isSimpleExpression(node.init)) {
				return;
			}

			declarations.set(source.getText(node.init), {
				scope: context.getScope(),
				variables: context.getDeclaredVariables(node),
				objectPattern: node.id
			});
		},
		[memberSelector]: node => {
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

			const isNested = node.parent.type === 'MemberExpression';

			if (isNested) {
				context.report({
					node,
					messageId: MESSAGE_ID
				});

				return;
			}

			const destructurings = objectPattern.properties.filter(property =>
				property.type === 'Property' &&
				property.key.type === 'Identifier' &&
				property.value.type === 'Identifier'
			);
			const lastProperty = objectPattern.properties[objectPattern.properties.length - 1];
			const hasRest = lastProperty && lastProperty.type === 'RestElement';

			const expression = source.getText(node);
			const member = source.getText(node.property);

			// Member might already be destructured
			const destructuredMember = destructurings.find(property =>
				property.key.name === member
			);

			// Don't destructure additional members when rest is used
			if (hasRest && !destructuredMember) {
				return;
			}

			const newMember = destructuredMember ?
				destructuredMember.value.name :
				avoidCapture(member, [memberScope], ecmaVersion);

			context.report({
				node,
				messageId: MESSAGE_ID,
				suggest: [{
					messageId: MESSAGE_ID_SUGGEST,
					data: {
						expression,
						property: newMember
					},
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
