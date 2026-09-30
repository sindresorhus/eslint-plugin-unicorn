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

	return value.type === 'TSTypeLiteral' ? value.members.filter(member => member.type === 'TSPropertySignature') : [];
};

// An object literal with a method can be used through `this` in ways static analysis cannot see, so every one of its properties counts as used.
const hasMethod = objectLike =>
	objectLike.type === 'ObjectExpression'
	&& objectLike.properties.some(property =>
		property.type === 'Property'
		&& (
			property.method
			|| property.kind === 'get'
			|| property.kind === 'set'
			// A non-arrow function value can be called with any `this`, so it is as unpredictable as a method. An arrow keeps the `this` of where it was written, so it cannot read the object it sits in and is a predictable value.
			|| property.value.type === 'FunctionExpression'
		));

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

// A computed key is dynamic, `{[key]: value}` does not define a property named `key`
const isComputedProperty = ({computed, key}) => computed && key.type !== 'Literal';

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

		// `const {[name]: value} = object` can read any property, like a rest element
		return isComputedProperty(property) || propertyKeysEqual(property.key, key);
	});

const isUnusedVariable = variable => {
	const hasReadReference = variable.references.some(reference => reference.isRead());
	return !hasReadReference;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const getPropertyDisplayName = property => {
		if (property.key.type === 'Identifier') {
			return property.key.name;
		}

		return property.key.type === 'Literal' ? property.key.value : sourceCode.getText(property.key);
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
		if (hasMethod(objectLike)) {
			return;
		}

		for (const property of getProperties(objectLike)) {
			const {key} = property;

			if (!key || isComputedProperty(property) || propertyKeysEqual(key, specialProtoPropertyKey)) {
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
		if (variable.defs.length !== 1 || isUnusedVariable(variable)) {
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

/**
@type {import('eslint').Rule.RuleModule}
*/
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
