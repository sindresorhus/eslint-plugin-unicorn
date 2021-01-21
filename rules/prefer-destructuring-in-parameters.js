'use strict';
const {upperFirst} = require('lodash');
const {findVariable, isNotOpeningParenToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const avoidCapture = require('./utils/avoid-capture');

const MESSAGE_ID = 'prefer-destructuring-in-parameters';
const messages = {
	[MESSAGE_ID]: '`{{member}}` should be destructed in parameter `{{parameter}}`.'
};

const indexVariableNamePrefixes = ['first', 'second'];

function getMemberExpressionProperty(node) {
	const {parent} = node;
	if (parent.type !== 'MemberExpression') {
		return;
	}

	const {computed, optional, object, property} = parent;

	if (optional || object !== node) {
		return;
	}

	if (computed) {
		if (property.type !== 'Literal') {
			return;
		}

		const index = property.value;
		if (
			typeof index !== 'number' ||
			!Number.isInteger(index) ||
			!(index >= 0 && index < indexVariableNamePrefixes.length)
		) {
			return;
		}

		return index;
	}

	if (property.type === 'Identifier') {
		return property.name;
	}
}

function fix({sourceCode, parameter, memberExpressions, isIndex}) {
	function * fixArrowFunctionParentheses(fixer) {
		const functionNode = parameter.parent;
		if (
			functionNode.type === 'ArrowFunctionExpression' &&
			functionNode.params.length === 1 &&
			isNotOpeningParenToken(sourceCode.getFirstToken(parameter))
		) {
			yield fixer.insertTextBefore(parameter, '(');
			yield fixer.insertTextAfter(parameter, ')');
		}
	}

	function fixParameter(fixer) {
		let text;
		if (isIndex) {
			const variables = [];
			for (const [index, {variable}] of memberExpressions.entries()) {
				variables[index] = variable;
			}

			text = `[${variables.join(', ')}]`;
		} else {
			const variables = [...memberExpressions.keys()];

			text = `{${variables.join(', ')}}`
		}

		return fixer.replaceText(parameter, text);
	}

	return function * (fixer) {
		yield * fixArrowFunctionParentheses(fixer);
		yield fixParameter(fixer);

		for (const {variable, expressions} of memberExpressions.values()) {
			for (const expression of expressions) {
				yield fixer.replaceText(expression, variable);
			}
		}
	};
}

const create = context => {
	const {ecmaVersion} = context.parserOptions;
	const sourceCode = context.getSourceCode();
	return {
		':function > Identifier.params'(parameter) {
			const scope = context.getScope();
			const {name} = parameter;
			const variable = findVariable(scope, parameter);
			const identifiers = variable.references.map(({identifier}) => identifier);

			const memberExpressions = new Map();
			let lastPropertyType;
			let firstExpression;
			for (const identifier of identifiers) {
				const property = getMemberExpressionProperty(identifier);
				const propertyType = typeof property;
				if (
					propertyType === 'undefined' ||
					(lastPropertyType && propertyType !== lastPropertyType)
				) {
					return;
				}

				const memberExpression = identifier.parent;

				if (memberExpressions.has(property)) {
					memberExpressions.get(property).expressions.push(memberExpression);
				} else {
					memberExpressions.set(property, {expressions: [memberExpression]});
				}

				lastPropertyType = propertyType;
				firstExpression = (
						firstExpression && firstExpression.node.range[0] < memberExpression.range[0]
					) ?
					firstExpression :
					{node: memberExpression, property};
			}

			if (memberExpressions.size === 0) {
				return;
			}

			const isIndex = lastPropertyType === 'number';
			const scopes = [
				variable.scope,
				...variable.references.map(({from}) => from)
			];
			for (const [property, data] of memberExpressions.entries()) {
				let variableName;
				if (isIndex) {
					const index = indexVariableNamePrefixes[property];
					variableName = avoidCapture(`${index}ElementOf${upperFirst(name)}`, scopes, ecmaVersion);
				} else {
					variableName = avoidCapture(property, scopes, ecmaVersion);
					if (variableName !== property) {
						return;
					}
				}

				data.variable = variableName;
			}

			const {node, property} = firstExpression;
			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {
					member: isIndex ? `${name}[${property}]` : `${name}.${property}`,
					parameter: name
				},
				fix: fix({
					sourceCode,
					parameter,
					memberExpressions,
					isIndex
				})
			});
		}
	}
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
