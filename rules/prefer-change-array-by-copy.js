'use strict';

const MESSAGE_ID_ERROR = 'prefer-change-array-by-copy/error';
const MESSAGE_ID_SUGGESTION = 'prefer-change-array-by-copy/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

/**
Check if the given node is a new array expression.

@param {import('estree').Node} node
@returns {node is import('estree').ArrayExpression}
*/
function isNewArrayExpression(node) {
	return (
		node.type === 'NewExpression'
		&& node.callee.type === 'Identifier'
		&& [
			'Array',
			// https://github.com/tc39/proposal-change-array-by-copy#change-array-by-copy
			'Int8Array',
			'Uint8Array',
			'Uint8ClampedArray',
			'Int16Array',
			'Uint16Array',
			'Int32Array',
			'Uint32Array',
			'Float32Array',
			'Float64Array',
			'BigInt64Array',
			'BigUint64Array',
		].includes(node.callee.name)
	);
}

/**
Check if the given variable is an array-like variable.

@param {import('eslint').Scope.Scope} scope
@param {string} variable
@returns {boolean}
*/
function isArrayLikeVariable(scope, variable) {
	// Check if the variable is an array-like variable
	const variableScope = scope.variables.find(({name}) => name === variable);

	if (!variableScope) {
		return false;
	}

	for (const definition of variableScope.defs) {
		if (
			definition.type === 'Variable'
			&& (definition.node.init.type === 'ArrayExpression'
				|| isNewArrayExpression(definition.node.init))
		) {
			return true;
		}
	}
}

/**
Check if the given node is a mutable array method call expression.

@param {import('estree').CallExpression} node
@returns {true}
*/
function isMutableArrayMethodCallExpression(node) {
	if (node.callee.type !== 'MemberExpression') {
		return false;
	}

	return (
		(node.callee.object.type === 'ArrayExpression' // [].sort()
			|| isNewArrayExpression(node.callee.object) // New Array().sort()
			|| node.callee.object.type === 'Identifier') // Array.sort()
		&& node.callee.property.type === 'Identifier'
		&& ['reverse', 'sort', 'splice'].includes(node.callee.property.name)
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').CallExpression} node */
	CallExpression(node) {
		const {sourceCode} = context;

		if (node.callee.type !== 'MemberExpression') {
			return;
		}

		if (!isMutableArrayMethodCallExpression(node)) {
			return;
		}

		const methodName = node.callee.property.name;

		// Determine the immutable method replacement and check conditions
		let replacementMethod;

		switch (methodName) {
			case 'reverse': {
				if (node.arguments.length === 0) {
					replacementMethod = 'toReversed';
				}

				break;
			}

			case 'sort': {
				if (node.arguments.length <= 1) {
					replacementMethod = 'toSorted';
				}

				break;
			}

			case 'splice': {
				if (node.arguments.length <= 2) {
					replacementMethod = 'toSpliced';
				}

				break;
			}

			default: {
				return;
			}
		}

		if (replacementMethod) {
			context.report({
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: `Array#${methodName}()`,
					replacement: `Array#${replacementMethod}()`,
				},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							value: `Array#${methodName}()`,
							replacement: `Array#${replacementMethod}()`,
						},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix(fixer) {
							const argumentCode = node.arguments
								.map(argument => sourceCode.getText(argument))
								.join(', ');

							const replacementCode = `${sourceCode.getText(node.callee.object)}.${replacementMethod}(${argumentCode})`;

							return fixer.replaceText(node, replacementCode);
						},
					},
				],
			});
		}
	},
	/** @param {import('estree').AssignmentExpression} node */
	AssignmentExpression(node) {
		// Check if the assignment is a subtraction operation on an array element
		if (
			node.operator === '='
			&& node.left.type === 'MemberExpression'
			&& isArrayLikeVariable(
				context.sourceCode.getScope(node.left.object),
				node.left.object.name,
			)
			&& node.left.computed
		) {
			// Array[1] = 'changed';

			context.report({
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: 'Array#[index]',
					replacement: 'Array#with()',
				},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							value: 'Array#[index]',
							replacement: 'Array#with()',
						},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix(fixer) {
							const {sourceCode} = context;
							const objectIdentifier = sourceCode.getText(node.left.object);
							return fixer.replaceText(
								node,
								`${objectIdentifier}.with(${sourceCode.getText(node.left.property)}, ${sourceCode.getText(node.right)})`,
							);
						},
					},
				],
			});
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer immutable array methods over modifying original arrays',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};
