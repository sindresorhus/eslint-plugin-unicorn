'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const getDeclaratorOrPropertyValue = declaratorOrProperty => {
	return declaratorOrProperty.init || declaratorOrProperty.value;
};

const isMemberExpressionCall = memberExpression => {
	return memberExpression.parent &&
		memberExpression.parent.type === 'CallExpression' &&
		memberExpression.parent.callee === memberExpression;
};

const isMemberExpressionAssignment = memberExpression => {
	return memberExpression.parent &&
		memberExpression.parent.type === 'AssignmentExpression';
};

const isMemberExpressionComputedBeyondPrediction = memberExpression => {
	return memberExpression.computed &&
		(memberExpression.property.type !== 'Literal');
};

const propertyMatchesObjectExprPropertyKey = (property, key) => {
	if (property.type === key.type && property.name === key.name) {
		return true;
	}

	if (key.type === 'Literal') {
		return property.name === key.value;
	}

	if (property.type === 'Literal') {
		return key.name === property.value;
	}

	return false;
};

const objectPatternMatchesObjectExprPropertyKey = (pattern, key) => {
	return pattern.properties.some(property => {
		if (property.type === 'ExperimentalRestProperty') {
			return true;
		}

		return propertyMatchesObjectExprPropertyKey(property.key, key);
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
	const hasReadRef = variable.references.some(ref => ref.isRead());
	return !hasReadRef;
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
				message: 'Property `{{name}}` is defined but never used.',
				data: {
					name: getPropertyDisplayName(property)
				}
			});
			return;
		}

		checkObject(property, references, path);
	};

	const checkProperties = (objectExpression, references, path = []) => {
		objectExpression.properties.forEach(property => {
			const {key} = property;

			if (!key) {
				return;
			}

			const nextPath = path.concat(key);

			const nextReferences = references
				.map(reference => {
					if (reference.init) {
						return null;
					}

					const {parent} = reference.identifier;

					if (parent.type === 'MemberExpression') {
						if (
							isMemberExpressionAssignment(parent) ||
							isMemberExpressionCall(parent) ||
							isMemberExpressionComputedBeyondPrediction(parent) ||
							propertyMatchesObjectExprPropertyKey(parent.property, key)
						) {
							return {identifier: parent};
						}

						return null;
					}

					if (
						parent.type === 'VariableDeclarator' &&
						parent.id.type === 'ObjectPattern'
					) {
						if (objectPatternMatchesObjectExprPropertyKey(parent.id, key)) {
							return {identifier: parent};
						}

						return null;
					}

					if (
						parent.type === 'AssignmentExpression' &&
						parent.left.type === 'ObjectPattern'
					) {
						if (objectPatternMatchesObjectExprPropertyKey(parent.left, key)) {
							return {identifier: parent};
						}

						return null;
					}

					return reference;
				})
				.filter(Boolean);

			checkProperty(property, nextReferences, nextPath);
		});
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
		scope.variables.forEach(checkVariable);
	};

	const checkChildScopes = scope => {
		scope.childScopes.forEach(checkScope);
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
		docs: {
			url: getDocsUrl(__filename)
		}
	}
};
