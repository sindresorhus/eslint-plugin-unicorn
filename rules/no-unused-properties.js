'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-unused-properties';
const messages = {
	[MESSAGE_ID]: 'Property `{{name}}` is defined but never used.'
};

const getDeclaratorOrPropertyValue = ({init, value}) => {
	return init || value;
};

const isMemberExpressionCall = memberExpression => {
	return (
		memberExpression.parent &&
		memberExpression.parent.type === 'CallExpression' &&
		memberExpression.parent.callee === memberExpression
	);
};

const isMemberExpressionAssignment = ({parent}) => {
	return (
		parent &&
		parent.type === 'AssignmentExpression'
	);
};

const isMemberExpressionComputedBeyondPrediction = ({computed, property}) => {
	return (
		computed && property.type !== 'Literal'
	);
};

const specialProtoPropertyKey = {
	type: 'Identifier',
	name: '__proto__'
};

const propertyKeysEqual = ({type, name, value}, keyB) => {
	if (type === 'Identifier') {
		if (keyB.type === 'Identifier') {
			return name === keyB.name;
		}

		if (keyB.type === 'Literal') {
			return name === keyB.value;
		}
	}

	if (type === 'Literal') {
		if (keyB.type === 'Identifier') {
			return value === keyB.name;
		}

		if (keyB.type === 'Literal') {
			return value === keyB.value;
		}
	}

	return false;
};

const objectPatternMatchesObjectExprPropertyKey = ({properties}, key) => {
	return properties.some(property => {
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

const isUnusedVariable = ({references}) => {
	const hasReadReference = references.some(reference => reference.isRead());
	return !hasReadReference;
};

const create = context => {
	const getPropertyDisplayName = ({key}) => {
		if (key.type === 'Identifier') {
			return key.name;
		}

		if (key.type === 'Literal') {
			return key.value;
		}

		return context.getSource(key);
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

	const checkProperties = ({properties}, references, path = []) => {
		for (const property of properties) {
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

	const checkVariables = ({variables}) => {
		for (const variable of variables) {
			checkVariable(variable);
		}
	};

	const checkChildScopes = ({childScopes}) => {
		for (const childScope of childScopes) {
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
			url: getDocumentationUrl(__filename)
		},
		messages
	}
};
