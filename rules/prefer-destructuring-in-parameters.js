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

function isNodeEffectThis(node) {
	const {parent} = node;

	/* istanbul ignore next: Not sure if this is needed */
	if (
		parent.type === 'ChainExpression' &&
		parent.expression === node
	) {
		return isNodeEffectThis(parent);
	}

	if (
		(parent.type === 'CallExpression' || parent.type === 'NewExpression') &&
		parent.callee === node
	) {
		return true;
	}

	return false;
}

function isModifyingNode(node) {
	const {parent} = node;

	if (
		parent.type === 'AssignmentExpression' &&
		parent.left === node
	) {
		return true;
	}

	if (
		parent.type === 'UpdateExpression' &&
		parent.argument === node
	) {
		return true;
	}

	if (
		parent.type === 'UnaryExpression' &&
		parent.operator === 'delete' &&
		parent.argument === node
	) {
		return true;
	}

	return false;
}

function getMemberExpression(node) {
	const memberExpression = node.parent;
	if (
		memberExpression.type !== 'MemberExpression' ||
		isNodeEffectThis(memberExpression) ||
		isModifyingNode(memberExpression)
	) {
		return;
	}

	const {computed, optional, object, property} = memberExpression;

	if (optional || object !== node) {
		return;
	}

	const data = {};
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

		data.type = 'index';
		data.index = index;
	} else {
		if (property.type !== 'Identifier') {
			return;
		}

		data.type = 'property';
		data.property = property.name;
	}

	data.node = memberExpression;
	return data;
}

function fix({sourceCode, functionNode, parameter, properties, type}) {
	function * fixArrowFunctionParentheses(fixer) {
		if (
			functionNode.type === 'ArrowFunctionExpression' &&
			functionNode.params.length === 1 &&
			!functionNode.typeParameters &&
			isNotOpeningParenToken(sourceCode.getFirstToken(functionNode))
		) {
			yield fixer.insertTextBefore(parameter, '(');
			yield fixer.insertTextAfter(parameter, ')');
		}
	}

	function fixParameter(fixer) {
		const variables = [];
		for (const [indexOrProperty, {variable}] of properties.entries()) {
			if (type === 'index') {
				variables[indexOrProperty] = variable;
			} else {
				variables.push(variable);
			}
		}

		const text = variables.join(', ');

		return fixer.replaceText(parameter, type === 'index' ? `[${text}]` : `{${text}}`);
	}

	return function * (fixer) {
		yield * fixArrowFunctionParentheses(fixer);
		yield fixParameter(fixer);

		for (const {variable, expressions} of properties.values()) {
			for (const {node} of expressions) {
				yield fixer.replaceText(node, variable);
			}
		}
	};
}

function hasDirectiveInFunction(functionNode) {
	const {body} = functionNode;
	if (body.type !== 'BlockStatement') {
		return false;
	}

	return body.body.some(({directive}) => directive === 'use strict');
}

const create = context => {
	const {ecmaVersion} = context.parserOptions;
	const sourceCode = context.getSourceCode();
	return {
		':function > Identifier.params'(parameter) {
			const {name, parent: functionNode} = parameter;

			// If "use strict" directive used, it should not reported
			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Strict_Non_Simple_Params
			if (hasDirectiveInFunction(functionNode)) {
				return;
			}

			const scope = context.getScope();
			const variable = findVariable(scope, parameter);
			const identifiers = variable.references.map(({identifier}) => identifier);

			const properties = new Map();
			let propertyType;
			let firstExpression;
			for (const identifier of identifiers) {
				const memberExpression = getMemberExpression(identifier);
				if (!memberExpression) {
					return;
				}

				const {node, type} = memberExpression;
				if (propertyType) {
					// Avoid case like `foo[0] === foo.length`
					if (type !== propertyType) {
						return;
					}
				} else {
					propertyType = type;
				}

				if (
					!firstExpression ||
					node.range[0] < firstExpression.node.range[0]
				) {
					firstExpression = memberExpression;
				}

				const indexOrProperty = memberExpression[type];
				if (properties.has(indexOrProperty)) {
					properties.get(indexOrProperty).expressions.push(memberExpression);
				} else {
					properties.set(indexOrProperty, {expressions: [memberExpression]});
				}
			}

			if (properties.size === 0) {
				return;
			}

			const scopes = [
				variable.scope,
				...variable.references.map(({from}) => from)
			];
			for (const [indexOrProperty, data] of properties.entries()) {
				let variableName;
				if (propertyType === 'index') {
					variableName = avoidCapture(
						`${indexVariableNamePrefixes[indexOrProperty]}ElementOf${upperFirst(name)}`,
						scopes,
						ecmaVersion
					);
				} else {
					variableName = avoidCapture(indexOrProperty, scopes, ecmaVersion);
					if (variableName !== indexOrProperty) {
						return;
					}
				}

				data.variable = variableName;
			}

			context.report({
				node: firstExpression.node,
				messageId: MESSAGE_ID,
				data: {
					member: `${name}${propertyType === 'index' ? `[${firstExpression.index}]` : `.${firstExpression.property}`}`,
					parameter: name
				},
				fix: fix({
					sourceCode,
					functionNode,
					parameter,
					properties,
					type: propertyType
				})
			});
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
		fixable: 'code',
		messages
	}
};
