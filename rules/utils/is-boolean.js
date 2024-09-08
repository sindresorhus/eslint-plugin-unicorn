'use strict';

/**
Determines whether a node is a Boolean Expression.

@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Expression} node
@param {number} [deep] - The current recursion depth. Users do not need to pass this parameter.
*/
function isBooleanExpression(context, node, deep = 0) {
	if (!node) {
		return false;
	}

	// Prevent infinite recursion
	// This value should not be too large, otherwise there may be performance issues
	if (deep > 3) {
		return false;
	}

	switch (node.type) {
		case 'Literal': {
			return typeof node.value === 'boolean';
		}

		case 'Identifier': {
			const scope = context.sourceCode.getScope(node);

			const variable = scope.variables.find(
				variable => variable.name === node.name,
			);

			if (!variable) {
				return false;
			}

			for (const definition of variable.defs) {
				switch (definition.type) {
					case 'Variable': {
						if (
							isBooleanExpression(context, definition.node.init, deep + 1)
							|| isBooleanTypeAnnotation(definition.node.id.typeAnnotation)
						) {
							return true;
						}

						continue;
					}

					default:
				}
			}

			return false;
		}

		case 'UnaryExpression': {
			return node.operator === '!';
		}

		case 'LogicalExpression': {
			return node.operator === '&&';
		}

		// Age => 18
		case 'BinaryExpression': {
			return [
				'>',
				'>=',
				'<',
				'<=',
				'==',
				'===',
				'!=',
				'!==',
				'in',
				'instanceof',
			].includes(node.operator);
		}

		// Const isAdult = age >= 18 ? true : false;
		case 'ConditionalExpression': {
			return (
				isBooleanExpression(context, node.consequent, deep + 1)
				&& isBooleanExpression(context, node.alternate, deep + 1)
			);
		}

		// Await true
		case 'AwaitExpression': {
			return isBooleanExpression(context, node.argument, deep + 1);
		}

		// Yield true
		case 'YieldExpression': {
			return isBooleanExpression(context, node.argument, deep + 1);
		}

		// New Boolean(true)
		case 'NewExpression': {
			return (
				node.callee.type === 'Identifier' && node.callee.name === 'Boolean'
			);
		}

		// Boolean('true')
		case 'CallExpression': {
			const {callee} = node;
			if (callee.type === 'Identifier') {
				// Var foo = Boolean()
				if (callee.name === 'Boolean') {
					return true;
				}

				const scope = context.sourceCode.getScope(node.callee);

				const variable = scope.variables.find(variable => variable.name === callee.name);

				if (!variable) {
					return false;
				}

				for (const definition of variable.defs) {
					switch (definition.type) {
						case 'Variable': {
							if (
								['FunctionExpression', 'ArrowFunctionExpression'].includes(definition.node.init?.type) && isBooleanReturnTypeFunction(definition.node.init)
							) {
								return true;
							}

							continue;
						}

						case 'FunctionName': {
							if (isBooleanReturnTypeFunction(definition.node)) {
								return true;
							}

							continue;
						}

						default:
					}
				}
			}

			return false;
		}

		// (0, true)
		case 'SequenceExpression': {
			return isBooleanExpression(context, node.expressions.at(-1), deep + 1);
		}

		// (foo = true)
		case 'AssignmentExpression': {
			return isBooleanExpression(context, node.right, deep + 1);
		}

		// @typescript-eslint/parser
		// var isAdult = getIsAdult() as boolean
		case 'TSAsExpression': {
			return isBooleanTypeAnnotation(node.typeAnnotation);
		}

		default: {
			return false;
		}
	}
}

/**
Determine whether it is a Boolean type annotation
*/
function isBooleanTypeAnnotation(annotation) {
	if (!annotation) {
		return false;
	}

	// @typescript-eslint/-parser
	if (
		annotation.type === 'TSBooleanKeyword'
		|| (annotation.type === 'TSTypeAnnotation' && annotation.typeAnnotation?.type === 'TSBooleanKeyword')
	) {
		return true;
	}

	// @babel/parser
	if (
		annotation?.type === 'TypeAnnotation'
		&& annotation.typeAnnotation?.type === 'BooleanTypeAnnotation'
	) {
		return true;
	}

	return false;
}

/**
Determine whether it is a Boolean return
*/
function isBooleanReturnTypeFunction(node) {
	return isBooleanTypeAnnotation(node.returnType);
}

module.exports = {
	isBooleanExpression,
	isBooleanTypeAnnotation,
	isBooleanReturnTypeFunction,
};
