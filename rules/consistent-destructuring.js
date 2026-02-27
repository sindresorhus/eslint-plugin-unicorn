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

const hasRestElement = pattern => {
	switch (pattern?.type) {
		case 'RestElement': {
			return true;
		}

		case 'AssignmentPattern': {
			return hasRestElement(pattern.left);
		}

		case 'ObjectPattern': {
			return pattern.properties.some(property =>
				hasRestElement(property.type === 'Property' ? property.value : property),
			);
		}

		case 'ArrayPattern': {
			return pattern.elements.some(element =>
				hasRestElement(element),
			);
		}

		default: {
			return false;
		}
	}
};

const isIdentifierProperty = property =>
	property.type === 'Property'
	&& property.key.type === 'Identifier';

const isMemberDestructuredInNestedPatternWithRest = (objectPattern, memberName) =>
	objectPattern.properties.some(property =>
		isIdentifierProperty(property)
		&& property.key.name === memberName
		&& property.value.type !== 'Identifier'
		&& hasRestElement(property.value),
	);

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

		const [referenceStart] = sourceCode.getRange(reference.identifier);
		if (referenceStart < declarationEnd) {
			return false;
		}

		// Be conservative: writes from other variable scopes may run before this read via calls/closures.
		if (reference.from.variableScope !== memberScope.variableScope) {
			return true;
		}

		return referenceStart <= memberStart;
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

		const member = sourceCode.getText(node.property);

		// If the member is already destructured via a nested pattern with rest,
		// don't suggest adding a separate top-level destructuring for the same member.
		const memberDestructuredInNestedPattern = isMemberDestructuredInNestedPatternWithRest(objectPattern, member);

		const destructuredProperties = objectPattern.properties.filter(property =>
			isIdentifierProperty(property)
			&& property.value.type === 'Identifier',
		);

		const lastProperty = objectPattern.properties.at(-1);
		const hasRest = lastProperty?.type === 'RestElement';
		const expression = sourceCode.getText(node);

		// Member might already be destructured
		const destructuredMember = destructuredProperties.find(property =>
			property.key.name === member,
		);

		if (!destructuredMember) {
			if (memberDestructuredInNestedPattern) {
				return;
			}

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
