import {findVariable} from '@eslint-community/eslint-utils';
import {getAvailableVariableName, isLeftHandSide} from './utils/index.js';
import {isCallOrNewExpression} from './ast/index.js';

const MESSAGE_ID = 'consistentDestructuring';
const MESSAGE_ID_SUGGEST = 'consistentDestructuringSuggest';

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

const getRootIdentifier = expression => {
	while (expression?.type === 'MemberExpression') {
		expression = expression.object;
	}

	return expression?.type === 'Identifier' ? expression : undefined;
};

const isRootVariableReassigned = (declaration, memberExpressionNode, memberScope, sourceCode) => {
	if (!declaration.rootVariable) {
		return false;
	}

	const [, declarationEnd] = sourceCode.getRange(declaration.object);
	const [memberStart] = sourceCode.getRange(memberExpressionNode);

	return declaration.rootVariable.references.some(reference => {
		if (!reference.isWrite()) {
			return false;
		}

		if (reference.from.variableScope !== memberScope.variableScope) {
			return false;
		}

		const [referenceStart, referenceEnd] = sourceCode.getRange(reference.identifier);
		return referenceStart >= declarationEnd && referenceEnd <= memberStart;
	});
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const declarations = new Map();

	context.on('VariableDeclarator', node => {
		if (!(
			node.id.type === 'ObjectPattern'
			&& node.init
			&& node.init.type !== 'Literal'
			// Ignore any complex expressions (e.g. arrays, functions)
			&& isSimpleExpression(node.init)
		)) {
			return;
		}

		const rootIdentifier = getRootIdentifier(node.init);
		declarations.set(sourceCode.getText(node.init), {
			scope: sourceCode.getScope(node),
			object: node.init,
			rootIdentifierName: rootIdentifier?.name,
			rootVariable: rootIdentifier && findVariable(sourceCode.getScope(node), rootIdentifier),
			objectPattern: node.id,
		});
	});

	context.on('MemberExpression', node => {
		if (
			node.computed
			|| (
				isCallOrNewExpression(node.parent)
				&& node.parent.callee === node
			)
			|| isLeftHandSide(node)
		) {
			return;
		}

		const declaration = declarations.get(sourceCode.getText(node.object));

		if (!declaration) {
			return;
		}

		const memberScope = sourceCode.getScope(node);
		const memberRootIdentifier = getRootIdentifier(node.object);
		const memberRootVariable = memberRootIdentifier && findVariable(memberScope, memberRootIdentifier);
		if (
			declaration.rootIdentifierName
			&& memberRootIdentifier?.name === declaration.rootIdentifierName
			&& memberRootVariable !== declaration.rootVariable
		) {
			return;
		}

		if (isRootVariableReassigned(declaration, node, memberScope, sourceCode)) {
			return;
		}

		const {scope, objectPattern} = declaration;

		// Property is destructured outside the current scope
		if (!isChildInParentScope(memberScope, scope)) {
			return;
		}

		const destructurings = objectPattern.properties.filter(property =>
			property.type === 'Property'
			&& property.key.type === 'Identifier'
			&& property.value.type === 'Identifier',
		);
		const lastProperty = objectPattern.properties.at(-1);

		const hasRest = lastProperty && lastProperty.type === 'RestElement';

		const expression = sourceCode.getText(node);
		const member = sourceCode.getText(node.property);

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
			if (getAvailableVariableName(member, [memberScope]) !== member) {
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
					const lastProperty = properties.at(-1);

					yield fixer.replaceText(node, newMember);

					if (!destructuredMember) {
						yield lastProperty
							? fixer.insertTextAfter(lastProperty, `, ${newMember}`)
							: fixer.replaceText(objectPattern, `{${newMember}}`);
					}
				},
			}],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Use destructured variables over properties.',
			recommended: false,
		},
		hasSuggestions: true,
		messages: {
			[MESSAGE_ID]: 'Use destructured variables over properties.',
			[MESSAGE_ID_SUGGEST]: 'Replace `{{expression}}` with destructured property `{{property}}`.',
		},
	},
};

export default config;
