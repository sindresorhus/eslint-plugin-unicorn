'use strict';

const MESSAGE_ID_ERROR = 'prefer-change-array-by-copy/error';
const MESSAGE_ID_SUGGESTION = 'prefer-change-array-by-copy/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const mutableMethodsMap = {
	reverse: 'toReversed',
	sort: 'toSorted',
	splice: 'toSpliced',
};

const arrayTypes = new Set([
	'Array',
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
]);

/**
Check if the node is an array constructor.

@param {import('estree').Node} node
@returns {node is import('estree').NewExpression}
*/
const isArrayConstructor = node =>
	node?.type === 'NewExpression'
	&& arrayTypes.has(node.callee.name);

/**
Check if the given variable is an array-like variable.

@param {import('eslint').Scope.Scope} scope
@param {string} variable
@returns {boolean}
*/
function isArrayLikeVariable(scope, variable) {
	const variableScope = scope.variables.find(({name}) => name === variable);

	if (!variableScope) {
		return false;
	}

	for (const definition of variableScope.defs) {
		if (definition.type !== 'Variable') {
			continue;
		}

		if (definition.node.init?.type === 'ArrayExpression' || isArrayConstructor(definition.node.init)) {
			return true;
		}
	}
}

/**
Check if the node represents a mutable array method call.

@param {import('estree').CallExpression} node
@returns {boolean}
*/
const isMutableArrayMethodCall = node => {
	if (node.callee.type !== 'MemberExpression') {
		return false;
	}

	return (
		(node.callee.object.type === 'ArrayExpression' // [].sort()
			|| isArrayConstructor(node.callee.object) // New Array().sort()
			|| node.callee.object.type === 'Identifier') // Array.sort()
		&& node.callee.property.type === 'Identifier'
		&& Object.hasOwn(mutableMethodsMap, node.callee.property.name)
	);
};

/**
Generate the replacement code for the given method.

@param {import('eslint').SourceCode} sourceCode
@param {import('estree').Node} node
@param {string} replacementMethod
@returns {string}
*/
const getReplacementCode = (sourceCode, node, replacementMethod) => {
	const arguments_ = node.arguments.map(argument => sourceCode.getText(argument)).join(', ');
	return `${sourceCode.getText(node.callee.object)}.${replacementMethod}(${arguments_})`;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').CallExpression} node */
	CallExpression(node) {
		if (!isMutableArrayMethodCall(node)) {
			return;
		}

		const methodName = node.callee.property.name;
		const replacementMethod = mutableMethodsMap[methodName];

		if (methodName === 'reverse' && node.arguments.length > 0) {
			return;
		}

		if (methodName === 'sort' && node.arguments.length > 1) {
			return;
		}

		if (methodName === 'splice' && node.arguments.length > 2) {
			return;
		}

		context.report({
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {value: `Array#${methodName}()`, replacement: `Array#${replacementMethod}()`},
			suggest: [{
				messageId: MESSAGE_ID_SUGGESTION,
				data: {value: `Array#${methodName}()`, replacement: `Array#${replacementMethod}()`},
				fix: fixer => fixer.replaceText(node, getReplacementCode(context.sourceCode, node, replacementMethod)),
			}],
		});
	},

	/** @param {import('estree').AssignmentExpression} node */
	AssignmentExpression(node) {
		if (
			node.operator === '='
			&& node.left.type === 'MemberExpression'
			&& node.left.computed
			&& isArrayLikeVariable(
				context.sourceCode.getScope(node.left.object),
				node.left.object.name,
			)
		) {
			const {sourceCode} = context;
			const objectText = sourceCode.getText(node.left.object);
			const propertyText = sourceCode.getText(node.left.property);
			const rightText = sourceCode.getText(node.right);

			context.report({
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {value: 'Array#[index]', replacement: 'Array#with()'},
				suggest: [{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {value: 'Array#[index]', replacement: 'Array#with()'},
					fix: fixer => fixer.replaceText(node, `${objectText}.with(${propertyText}, ${rightText})`),
				}],
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
