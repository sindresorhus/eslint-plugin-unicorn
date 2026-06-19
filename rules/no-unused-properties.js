import {isTypeScriptExpressionWrapper, unwrapTypeScriptExpression} from './utils/index.js';
import getScopes from './utils/get-scopes.js';

const MESSAGE_ID = 'no-unused-properties';
const messages = {
	[MESSAGE_ID]: 'Property `{{name}}` is defined but never used.',
};

const getTypeAnnotation = node => node?.typeAnnotation?.typeAnnotation;

const getIdentifierTypeAnnotation = node => {
	if (
		node.type === 'VariableDeclarator'
		&& !node.init
	) {
		return;
	}

	return getTypeAnnotation(node.id);
};

const getPropertyContainer = node => {
	const value = unwrapTypeScriptExpression(node.init || node.value);
	if (value?.type === 'ObjectExpression') {
		return value;
	}

	const typeAnnotation = getTypeAnnotation(node) || getIdentifierTypeAnnotation(node);
	if (typeAnnotation?.type === 'TSTypeLiteral') {
		return typeAnnotation;
	}
};

const getProperties = value => {
	if (value.type === 'ObjectExpression') {
		return value.properties;
	}

	if (value.type === 'TSTypeLiteral') {
		return value.members.filter(member => member.type === 'TSPropertySignature');
	}

	return [];
};

const isMemberExpressionCall = memberExpression =>
	memberExpression.parent.type === 'CallExpression'
	&& memberExpression.parent.callee === memberExpression;

const isMemberExpressionAssignment = memberExpression =>
	memberExpression.parent.type === 'AssignmentExpression';

const isMemberExpressionComputedBeyondPrediction = memberExpression =>
	memberExpression.computed
	&& memberExpression.property.type !== 'Literal';

const getReferenceParent = referenceNode => {
	while (
		isTypeScriptExpressionWrapper(referenceNode.parent)
		&& referenceNode.parent.expression === referenceNode
	) {
		referenceNode = referenceNode.parent;
	}

	return referenceNode.parent;
};

// eslint-disable-next-line unicorn/name-replacements
const specialProtoPropertyKey = {
	type: 'Identifier',
	name: '__proto__',
};

const getPropertyKeyName = key => {
	if (key.type === 'Identifier' || key.type === 'JSXIdentifier') {
		return key.name;
	}

	if (key.type === 'Literal') {
		return key.value;
	}
};

const propertyKeysEqual = (keyA, keyB) => {
	const keyNameA = getPropertyKeyName(keyA);
	return keyNameA !== undefined && keyNameA === getPropertyKeyName(keyB);
};

const getDefinitionNode = definition =>
	definition.type === 'Parameter' && definition.name?.typeAnnotation
		? definition.name
		: definition.node;

const objectPatternMatchesObjectExpressionPropertyKey = (pattern, key) =>
	pattern.properties.some(property => {
		if (property.type === 'RestElement') {
			return true;
		}

		return propertyKeysEqual(property.key, key);
	});

const isUnusedVariable = variable => {
	const hasReadReference = variable.references.some(reference => reference.isRead());
	return !hasReadReference;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const getPropertyDisplayName = property => {
		if (property.key.type === 'Identifier') {
			return property.key.name;
		}

		if (property.key.type === 'Literal') {
			return property.key.value;
		}

		return sourceCode.getText(property.key);
	};

	const reportProperty = (property, references) => {
		if (references.length === 0) {
			context.report({
				node: property,
				messageId: MESSAGE_ID,
				data: {
					name: getPropertyDisplayName(property),
				},
			});
			return;
		}

		reportObject(property, references);
	};

	const reportProperties = (objectLike, references) => {
		for (const property of getProperties(objectLike)) {
			const {key} = property;

			if (!key) {
				continue;
			}

			if (propertyKeysEqual(key, specialProtoPropertyKey)) {
				continue;
			}

			const nextReferences = references
				.map(reference => {
					const parent = getReferenceParent(reference.identifier);

					if (reference.init) {
						if (
							parent.type === 'VariableDeclarator'
							&& parent.parent.type === 'VariableDeclaration'
							&& parent.parent.parent.type === 'ExportNamedDeclaration'
						) {
							return {identifier: parent};
						}

						return;
					}

					if (
						parent.type === 'MemberExpression'
						|| parent.type === 'JSXMemberExpression'
					) {
						if (
							isMemberExpressionAssignment(parent)
							|| isMemberExpressionCall(parent)
							|| isMemberExpressionComputedBeyondPrediction(parent)
							|| propertyKeysEqual(parent.property, key)
						) {
							return {identifier: parent};
						}

						return;
					}

					if (
						parent.type === 'VariableDeclarator'
						&& parent.id.type === 'ObjectPattern'
					) {
						if (objectPatternMatchesObjectExpressionPropertyKey(parent.id, key)) {
							return {identifier: parent};
						}

						return;
					}

					if (
						parent.type === 'AssignmentExpression'
						&& parent.left.type === 'ObjectPattern'
					) {
						if (objectPatternMatchesObjectExpressionPropertyKey(parent.left, key)) {
							return {identifier: parent};
						}

						return;
					}

					return reference;
				})
				.filter(Boolean);

			reportProperty(property, nextReferences);
		}
	};

	const reportObject = (node, references) => {
		const propertyContainer = getPropertyContainer(node);
		if (!propertyContainer) {
			return;
		}

		reportProperties(propertyContainer, references);
	};

	const reportVariable = variable => {
		if (variable.defs.length !== 1) {
			return;
		}

		if (isUnusedVariable(variable)) {
			return;
		}

		const [definition] = variable.defs;

		reportObject(getDefinitionNode(definition), variable.references);
	};

	const reportVariables = scope => {
		for (const variable of scope.variables) {
			reportVariable(variable);
		}
	};

	context.on('Program:exit', program => {
		const scopes = getScopes(sourceCode.getScope(program));
		for (const scope of scopes) {
			if (scope.type === 'global') {
				continue;
			}

			reportVariables(scope);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unused object properties.',
			recommended: false,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
