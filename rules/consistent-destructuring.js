'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID = 'consistentDestructuring';

const fix = (fixer, source, objectPattern, memberExpression) => {
	const member = source.getText(memberExpression.property);
	const {properties} = objectPattern;
	const declarations = properties.map(property => source.getText(property));
	const fixings = [fixer.replaceText(memberExpression, member)];

	// Member is not already destructured
	if (!declarations.includes(member)) {
		const lastProperty = properties[properties.length - 1];

		if (lastProperty) {
			fixings.push(fixer.insertTextAfter(lastProperty, `, ${member}`));
		} else {
			fixings.push(fixer.replaceText(objectPattern, `{${member}}`));
		}
	}

	return fixings;
};

const isInParentScope = (child, parent) => {
	while (child) {
		if (child === parent) {
			return true;
		}

		child = child.upper;
	}

	return false;
};

const getVariablesInScope = scope => {
	const variables = new Set();

	while (scope) {
		for (const variable of scope.variables) {
			variables.add(variable.name);
		}

		scope = scope.upper;
	}

	return variables;
};

const create = context => {
	const source = context.getSourceCode();
	const declarations = new Map();

	return {
		'VariableDeclarator[id.type="ObjectPattern"][init.type!="Literal"]'(node) {
			declarations.set(source.getText(node.init), {
				scope: context.getScope(),
				variables: context.getDeclaredVariables(node),
				objectPattern: node.id
			});
		},
		MemberExpression(node) {
			const {parent, object, property} = node;

			// Ignore member function calls
			if (parent.type === 'CallExpression' && parent.callee === node) {
				return;
			}

			const declaration = declarations.get(source.getText(object));

			if (!declaration) {
				return;
			}

			const {scope, variables, objectPattern} = declaration;
			const memberScope = context.getScope();

			// Property is destructured outside the current scope
			if (!isInParentScope(memberScope, scope)) {
				return;
			}

			const memberVariables = getVariablesInScope(memberScope);
			const member = source.getText(property);

			// Exclude already destructured properties
			for (const variable of variables) {
				memberVariables.delete(variable.name);
			}

			const isDefined = memberVariables.has(member);
			const isNested = parent.type === 'MemberExpression';

			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: isDefined || isNested ? null : fixer => fix(fixer, source, objectPattern, node)
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code',
		messages: {
			[MESSAGE_ID]: 'Use destructured variables over properties.'
		}
	}
};
