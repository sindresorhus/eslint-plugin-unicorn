'use strict';
const {matches, methodCallSelector} = require('./selectors/index.js');

const MESSAGE_ID_RESOLVE = 'resolve';
const MESSAGE_ID_REJECT = 'reject';
const messages = {
	[MESSAGE_ID_RESOLVE]: 'Prefer `{{type}} value` over `{{type}} Promise.resolve(error)`.',
	[MESSAGE_ID_REJECT]: 'Prefer `throw error` over `{{type}} Promise.reject(error)`.',
};

const selector = [
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
function getFunctionNode(node) {
	let isInTryStatement = false;
	let functionNode;
	for (; node; node = node.parent) {
		if (functionTypes.has(node.type)) {
			functionNode = node;
			break;
		}

		if (node.type === 'TryStatement') {
			isInTryStatement = true;
		}
	}

	return {
		functionNode,
		isInTryStatement,
	};
}

function createProblem(callExpression, fix) {
	const {callee, parent} = callExpression;
	const method = callee.property.name;
	const type = parent.type === 'YieldExpression' ? 'yield' : 'return';

	return {
		node: callee,
		messageId: method,
		data: {type},
		fix,
	};
}

function fix(callExpression, isInTryStatement, sourceCode) {
	if (callExpression.arguments.length > 1) {
		return;
	}

	const {callee, parent, arguments: [errorOrValue]} = callExpression;
	if (errorOrValue && errorOrValue.type === 'SpreadElement') {
		return;
	}

	const isReject = callee.property.name === 'reject';
	const isYieldExpression = parent.type === 'YieldExpression';
	if (
		isReject
		&& (
			isInTryStatement
			|| (isYieldExpression && parent.parent.type !== 'ExpressionStatement')
		)
	) {
		return;
	}

	return function (fixer) {
		const isArrowFunctionBody = parent.type === 'ArrowFunctionExpression';

		let text = errorOrValue ? sourceCode.getText(errorOrValue) : '';

		if (errorOrValue && errorOrValue.type === 'SequenceExpression') {
			text = `(${text})`;
		}

		if (isReject) {
			// `return Promise.reject()` -> `throw undefined`
			text = text || 'undefined';
			text = `throw ${text}`;
			if (!isYieldExpression) {
				text += ';';
			}

			// `=> Promise.reject(error)` -> `=> { throw error; }`
			if (isArrowFunctionBody) {
				text = `{ ${text} }`;
			}
		} else {
			// eslint-disable-next-line no-lonely-if
			if (isYieldExpression) {
				text = `yield${text ? ' ' : ''}${text}`;
			} else if (parent.type === 'ReturnStatement') {
				text = `return${text ? ' ' : ''}${text};`;
			} else {
				if (errorOrValue && errorOrValue.type === 'ObjectExpression') {
					text = `(${text})`;
				}

				// `=> Promise.resolve()` -> `=> {}`
				text = text || '{}';
			}
		}

		return fixer.replaceText(
			isArrowFunctionBody ? callExpression : parent,
			text,
		);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector](callExpression) {
			const {functionNode, isInTryStatement} = getFunctionNode(callExpression);
			if (!functionNode || !functionNode.async) {
				return;
			}

			return createProblem(
				callExpression,
				fix(callExpression, isInTryStatement, sourceCode),
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
