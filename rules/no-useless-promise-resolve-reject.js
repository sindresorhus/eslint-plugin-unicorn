'use strict';
const {matches, methodCallSelector} = require('./selectors/index.js');

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

const SELECTOR = [
	methodCallSelector({
		object: 'Promise',
		methods: ['resolve', 'reject'],
	}),
	matches([
		'ArrowFunctionExpression[async=true] > .body',
		'ReturnStatement > .argument',
		'YieldExpression[delegate=false] > .argument',
	]),
].join('');

const functionTypes = new Set([
	'ArrowFunctionExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[SELECTOR](node) {
			const isYield = node.parent.type === 'YieldExpression';
			const isResolve = node.callee.property.name === 'resolve';
			const [value] = node.arguments;
			// Promise.resolve/reject() -> returning/throwing undefined
			const valueString = value ? sourceCode.getText(value) : 'undefined';
			let isInTryStatement = false;
			let fix;

			if (node.parent.type === 'ArrowFunctionExpression') {
				fix = fixer => {
					let replacement;
					if (isResolve) {
						replacement = value
							// Turns `=> Promise.resolve(value)` into `=> value`
							? (value.type === 'ObjectExpression' || value.type === 'SequenceExpression'
								? `(${valueString})`
								: valueString)
							// Turns `=> Promise.resolve()` into `=> {}`
							: '{}';
					} else {
						// Turns `=> Promise.reject(error)` into `=> { throw error; }`
						replacement = `{ throw ${valueString}; }`;
					}

					return fixer.replaceText(node, replacement);
				};
			} else {
				let parentFunction = node.parent.parent;
				while (parentFunction && !functionTypes.has(parentFunction.type)) {
					if (!isInTryStatement && parentFunction.type === 'TryStatement') {
						isInTryStatement = true;
					}

					parentFunction = parentFunction.parent;
				}

				if (!parentFunction || !parentFunction.async) {
					return;
				}

				if (isResolve) {
					fix = fixer => isYield || value
						? fixer.replaceText(node, isYield && value && value.type === 'SequenceExpression'
							// Turns `yield Promise.resolve((a, b))` into `yield (a, b)`
							? `(${valueString})`
							// Turns `return/yield Promise.resolve(value)` into `return/yield value`
							: valueString)
						// Turns `return Promise.resolve()` into `return`
						: fixer.remove(node);
				} else {
					// Turns `return/yield Promise.reject(error)` into `throw error`
					fix = fixer => fixer.replaceText(node.parent, `throw ${valueString}${isYield ? '' : ';'}`);
				}
			}

			return {
				node: node.callee,
				messageId: isResolve
					? (isYield ? YIELD_RESOLVE : RETURN_RESOLVE)
					: (isYield ? YIELD_REJECT : RETURN_REJECT),
				fix: node.arguments.length <= 1
						&& (!value || value.type !== 'SpreadElement')
						// Can't fix if the Promise.reject is inside a try block as a
						// catch block will catch the throw but not the Promise.reject
						&& (isResolve || !isInTryStatement)
					? fix
					: undefined,
			};
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
