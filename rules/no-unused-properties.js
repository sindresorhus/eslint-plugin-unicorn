'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const create = context => {
	function getPropertyDisplayName(property) {
		if (property.key.type === 'Identifier') {
			return property.key.name;
		}
		if (property.key.type === 'Literal') {
			return property.key.value;
		}
		return context.getSource(property.key);
	}

	function getDeclaratorOrPropertyValue(declaratorOrProperty) {
		return declaratorOrProperty.init || declaratorOrProperty.value;
	}

	function checkProperty(property, references, path) {
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
	}

	function isMemberExpressionCall(memberExpression) {
		return memberExpression.parent &&
			memberExpression.parent.type === 'CallExpression' &&
			memberExpression.parent.callee === memberExpression;
	}

	function isMemberExpressionAssignment(memberExpression) {
		return memberExpression.parent &&
			memberExpression.parent.type === 'AssignmentExpression';
	}

	function isMemberExpressionComputedBeyondPrediction(memberExpression) {
		return memberExpression.computed &&
			(memberExpression.property.type !== 'Literal');
	}

	function memeberExpressionPropertyMatchesObjectExprPropertyKey(property, key) {
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
	}

	function checkProperties(objectExpression, references, path = []) {
		objectExpression.properties.forEach(property => {
			const {key} = property;

			const nextPath = path.concat(key);

			const nextReferences = references
				.map(reference => {
					if (reference.init) {
						return null;
					}

					const {parent} = reference.identifier;

					if (parent.type !== 'MemberExpression') {
						return reference;
					}

					if (
						isMemberExpressionAssignment(parent) ||
						isMemberExpressionCall(parent) ||
						isMemberExpressionComputedBeyondPrediction(parent) ||
						memeberExpressionPropertyMatchesObjectExprPropertyKey(parent.property, key)
					) {
						return {
							identifier: parent
						};
					}

					return null;
				})
				.filter(Boolean);

			checkProperty(property, nextReferences, nextPath);
		});
	}

	function isLeafDeclaratorOrProperty(declaratorOrProperty) {
		const value = getDeclaratorOrPropertyValue(declaratorOrProperty);

		if (!value) {
			return true;
		}

		if (value.type !== 'ObjectExpression') {
			return true;
		}

		return false;
	}

	function checkObject(declaratorOrProperty, references, path) {
		if (isLeafDeclaratorOrProperty(declaratorOrProperty)) {
			return;
		}

		const value = getDeclaratorOrPropertyValue(declaratorOrProperty);

		checkProperties(value, references, path);
	}

	function isUnusedVariable(variable) {
		const hasReadRef = variable.references.some(ref => ref.isRead());
		return !hasReadRef;
	}

	function checkVariable(variable) {
		if (variable.defs.length !== 1) {
			return;
		}

		if (isUnusedVariable(variable)) {
			return;
		}

		const [definition] = variable.defs;

		checkObject(definition.node, variable.references);
	}

	function checkVariables(scope) {
		scope.variables.forEach(checkVariable);
	}

	function checkChildScopes(scope) {
		scope.childScopes.forEach(checkScope);
	}

	function checkScope(scope) {
		if (scope.type === 'global') {
			return checkChildScopes(scope);
		}

		checkVariables(scope);

		return checkChildScopes(scope);
	}

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
