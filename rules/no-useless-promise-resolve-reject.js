'use strict';
const {methodCallSelector} = require('./selectors/index.js');

const RETURN_RESOLVE = 'return-resolve';
const RETURN_REJECT = 'return-reject';
const YIELD_RESOLVE = 'yield-resolve';
const YIELD_REJECT = 'yield-reject';
const messages = {
	[RETURN_RESOLVE]: 'Prefer `return value` over `return Promise.resolve(value)`.',
	[RETURN_REJECT]: 'Prefer `throw error` over `return Promise.reject(error)`.',
	[YIELD_RESOLVE]: 'Prefer `yield value` over `yield Promise.resolve(value)`.',
	[YIELD_REJECT]: 'Prefer `throw value` over `yield Promise.reject(value)`.',
};

const promiseResolveOrRejectSelector = methodCallSelector({
	object: 'Promise',
	methods: ['resolve', 'reject'],
});
const asyncArrowFunctionReturnSelector = `ArrowFunctionExpression[async=true] > ${promiseResolveOrRejectSelector}.body`;
const returnStatementSelector = `ReturnStatement > ${promiseResolveOrRejectSelector}.argument`;
const yieldExpressionSelector = `YieldExpression[delegate=false] > ${promiseResolveOrRejectSelector}.argument`;

const functionTypes = new Set([
	'ArrowFunctionExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);
const getParentFunction = node => {
	let {parent} = node;
	while (parent && !functionTypes.has(parent.type)) {
		parent = parent.parent;
	}

	return parent;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	/** @param {(isResolve: boolean, valueString: string, value) => import('eslint').Rule.ReportFixer} createFix */
	const createProblem = (node, createFix, resolveMessage = RETURN_RESOLVE, rejectMessage = RETURN_REJECT) => {
		const isResolve = node.callee.property.name === 'resolve';
		const value = node.arguments.length === 1 ? node.arguments[0] : undefined;

		let isInTryStatement = false;
		let {parent} = node;
		while (parent && !functionTypes.has(parent.type)) {
			if (parent.type === 'TryStatement') {
				isInTryStatement = true;
				break;
			}

			parent = parent.parent;
		}

		return {
			node: node.callee,
			messageId: isResolve ? resolveMessage : rejectMessage,
			fix: node.arguments.length <= 1
					&& (!value || value.type !== 'SpreadElement')
					&& (isResolve || !isInTryStatement)
				? createFix(isResolve, value ? sourceCode.getText(value) : 'undefined', value)
				: undefined,
		};
	};

	return {
		[asyncArrowFunctionReturnSelector](node) {
			return createProblem(
				node,
				(isResolve, valueString, value) => {
					let replacement;
					if (isResolve) {
						replacement = value
							// Turns `=> Promise.resolve(value)` into `=> value`
							? (value.type === 'ObjectExpression' || value.type === 'SequenceExpression'
								? `(${valueString})`
								: valueString)
							// Turns `=> Promise.resolve()` into `=> ({})`
							: '{}';
					} else {
						// Turns `=> value` into `=> { throw value }`
						replacement = `{ throw ${valueString}; }`;
					}

					return fixer => fixer.replaceText(node, replacement);
				},
			);
		},
		[returnStatementSelector](node) {
			const parentFunction = getParentFunction(node);
			if (!parentFunction || !parentFunction.async) {
				return;
			}

			return createProblem(
				node,
				(isResolve, valueString) => fixer => isResolve
					// Turns `return Promise.resolve(value)` into `return value`
					? fixer.replaceText(node, valueString)
					// Turns `return Promise.reject(value)` into `throw value`
					: fixer.replaceText(node.parent, `throw ${valueString};`),
			);
		},
		[yieldExpressionSelector](node) {
			const parentFunction = getParentFunction(node);
			if (!parentFunction || !parentFunction.async) {
				return;
			}

			return createProblem(
				node,
				(isResolve, valueString, value) => fixer => isResolve
					// Turns `yield Promise.resolve(value)` into `yield value`
					? fixer.replaceText(node, value && value.type === 'SequenceExpression' ? `(${valueString})` : valueString)
					// Turns `yield Promise.reject(value)` into `throw value`
					: fixer.replaceText(node.parent, `throw ${valueString}`),
				YIELD_RESOLVE,
				YIELD_REJECT,
			);
		},
	};
};

const schema = [];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow returning/yielding `Promise.resolve/reject()` in async functions',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
