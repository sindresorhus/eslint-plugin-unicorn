'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-unused-properties';
const messages = {
	[MESSAGE_ID]: 'Property `{{name}}` is defined but never used.'
};

const getDeclaratorOrPropertyValue = declaratorOrProperty => {
	return declaratorOrProperty.init || declaratorOrProperty.value;
};

const isMemberExpressionCall = memberExpression => {
	return (
		memberExpression.parent &&
		memberExpression.parent.type === 'CallExpression' &&
		memberExpression.parent.callee === memberExpression
	);
};

const isMemberExpressionAssignment = memberExpression => {
	return (
		memberExpression.parent &&
		memberExpression.parent.type === 'AssignmentExpression'
	);
};

const isMemberExpressionComputedBeyondPrediction = memberExpression => {
	return (
		memberExpression.computed && memberExpression.property.type !== 'Literal'
	);
};

const specialProtoPropertyKey = {
	type: 'Identifier',
	name: '__proto__'
};

const propertyKeysEqual = (keyA, keyB) => {
	if (keyA.type === 'Identifier') {
		if (keyB.type === 'Identifier') {
			return keyA.name === keyB.name;
		}

		if (keyB.type === 'Literal') {
			return keyA.name === keyB.value;
		}
	}

	if (keyA.type === 'Literal') {
		if (keyB.type === 'Identifier') {
			return keyA.value === keyB.name;
		}

		if (keyB.type === 'Literal') {
			return keyA.value === keyB.value;
		}
	}

	return false;
};

const objectPatternMatchesObjectExprPropertyKey = (pattern, key) => {
	return pattern.properties.some(property => {
		if (property.type === 'ExperimentalRestProperty' || property.type === 'RestElement') {
			return true;
		}

		return propertyKeysEqual(property.key, key);
	});
};

const isLeafDeclaratorOrProperty = declaratorOrProperty => {
	const value = getDeclaratorOrPropertyValue(declaratorOrProperty);

	if (!value) {
		return true;
	}

	if (value.type !== 'ObjectExpression') {
		return true;
	}

	return false;
};

const isUnusedVariable = variable => {
	const hasReadReference = variable.references.some(reference => reference.isRead());
	return !hasReadReference;
};

const create = context => {
	const getPropertyDisplayName = property => {
		if (property.key.type === 'Identifier') {
			return property.key.name;
		}

		if (property.key.type === 'Literal') {
			return property.key.value;
		}

		return context.getSource(property.key);
	};

	const checkProperty = (property, references, path) => {
		if (references.length === 0) {
			context.report({
				node: property,
				messageId: MESSAGE_ID,
				data: {
					name: getPropertyDisplayName(property)
				}
			});
			return;
		}

		checkObject(property, references, path);
	};

	const checkProperties = (objectExpression, references, path = []) => {
		for (const property of objectExpression.properties) {
			const {key} = property;

			if (!key) {
				continue;
			}

			if (propertyKeysEqual(key, specialProtoPropertyKey)) {
				continue;
			}

			const nextPath = [...path, key];

			const nextReferences = references
				.map(reference => {
					const {parent} = reference.identifier;

					if (reference.init) {
						if (
							parent.type === 'VariableDeclarator' &&
							parent.parent.type === 'VariableDeclaration' &&
							parent.parent.parent.type === 'ExportNamedDeclaration'
						) {
							return {identifier: parent};
						}

						return;
					}

					if (parent.type === 'MemberExpression') {
						if (
							isMemberExpressionAssignment(parent) ||
							isMemberExpressionCall(parent) ||
							isMemberExpressionComputedBeyondPrediction(parent) ||
							propertyKeysEqual(parent.property, key)
						) {
							return {identifier: parent};
						}

						return;
					}

					if (
						parent.type === 'VariableDeclarator' &&
						parent.id.type === 'ObjectPattern'
					) {
						if (objectPatternMatchesObjectExprPropertyKey(parent.id, key)) {
							return {identifier: parent};
						}

						return;
					}

					if (
						parent.type === 'AssignmentExpression' &&
						parent.left.type === 'ObjectPattern'
					) {
						if (objectPatternMatchesObjectExprPropertyKey(parent.left, key)) {
							return {identifier: parent};
						}

						return;
					}

					return reference;
				})
				.filter(Boolean);

			checkProperty(property, nextReferences, nextPath);
		}
	};

	const checkObject = (declaratorOrProperty, references, path) => {
		if (isLeafDeclaratorOrProperty(declaratorOrProperty)) {
			return;
		}

		const value = getDeclaratorOrPropertyValue(declaratorOrProperty);

		checkProperties(value, references, path);
	};

	const checkVariable = variable => {
		if (variable.defs.length !== 1) {
			return;
		}

		if (isUnusedVariable(variable)) {
			return;
		}

		const [definition] = variable.defs;

		checkObject(definition.node, variable.references);
	};

	const checkVariables = scope => {
		for (const variable of scope.variables) {
			checkVariable(variable);
		}
	};

	const checkChildScopes = scope => {
		for (const childScope of scope.childScopes) {
			checkScope(childScope);
		}
	};

	const checkScope = scope => {
		if (scope.type === 'global') {
			return checkChildScopes(scope);
		}

		checkVariables(scope);

		return checkChildScopes(scope);
	};

	return {
		'Program:exit'() {
			checkScope(context.getScope());
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unused object properties.',
			url: getDocumentationUrl(__filename)
		},
		messages,
		schema: []
	}
};
