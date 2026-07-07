import {getParenthesizedRange, shouldAddParenthesesToAwaitExpressionArgument} from './utils/index.js';
import {isFunction, isMethodCall} from './ast/index.js';

const MESSAGE_ID_RESOLVE = 'resolve';
const MESSAGE_ID_REJECT = 'reject';
const messages = {
	[MESSAGE_ID_RESOLVE]: 'Prefer `{{type}} value` over `{{type}} Promise.resolve(value)`.',
	[MESSAGE_ID_REJECT]: 'Prefer `throw error` over `{{type}} Promise.reject(error)`.',
};

function getFunctionNode(node) {
	let isInTryStatement = false;
	let functionNode;
	for (; node; node = node.parent) {
		if (isFunction(node)) {
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

function isPromiseCallback(node) {
	if (
		node.parent.type === 'CallExpression'
		&& node.parent.callee.type === 'MemberExpression'
		&& !node.parent.callee.computed
		&& node.parent.callee.property.type === 'Identifier'
	) {
		const {callee: {property}, arguments: arguments_} = node.parent;

		if (
			arguments_.length === 1
			&& [
				'then',
				'catch',
				'finally',
			].includes(property.name)
			&& arguments_[0] === node
		) {
			return true;
		}

		if (
			arguments_.length === 2
			&& property.name === 'then'
			&& (
				arguments_[0] === node
				|| (arguments_[0].type !== 'SpreadElement' && arguments_[1] === node)
			)
		) {
			return true;
		}
	}

	return false;
}

function getCallExpressionInfo(callExpression) {
	if (
		callExpression.parent.type === 'AwaitExpression'
		&& callExpression.parent.argument === callExpression
	) {
		return {
			expression: callExpression.parent,
			parent: callExpression.parent.parent,
			isAwaited: true,
		};
	}

	return {
		expression: callExpression,
		parent: callExpression.parent,
		isAwaited: false,
	};
}

function createProblem(callExpression, fix) {
	const {callee} = callExpression;
	const method = callee.property.name;
	const {parent} = getCallExpressionInfo(callExpression);
	const type = parent.type === 'YieldExpression' ? 'yield' : 'return';

	return {
		node: callee,
		messageId: method,
		data: {type},
		fix,
	};
}

function getArgumentText(node, context) {
	const text = node ? context.sourceCode.getText(node) : '';
	return node?.type === 'SequenceExpression' ? `(${text})` : text;
}

function getAwaitedResolveArgumentText(node, context) {
	const text = getArgumentText(node, context) || 'undefined';

	if (
		node
		&& node.type !== 'SequenceExpression'
		&& shouldAddParenthesesToAwaitExpressionArgument(node)
	) {
		return `(${text})`;
	}

	return text;
}

function fix(callExpression, isInTryStatement, context) {
	if (callExpression.arguments.length > 1) {
		return;
	}

	const {callee, arguments: callArguments} = callExpression;
	const {expression, parent, isAwaited} = getCallExpressionInfo(callExpression);
	const [errorOrValue] = callArguments;

	if (errorOrValue?.type === 'SpreadElement') {
		return;
	}

	if (context.sourceCode.getCommentsInside(callExpression).length > 0) {
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

		let text = getArgumentText(errorOrValue, context);

		if (isReject) {
			// `return Promise.reject()` -> `throw undefined`
			text ||= 'undefined';
			text = `throw ${text}`;

			if (isYieldExpression) {
				return fixer.replaceTextRange(
					getParenthesizedRange(parent, context),
					text,
				);
			}

			text += ';';

			// `=> Promise.reject(error)` -> `=> { throw error; }`
			if (isArrowFunctionBody) {
				text = `{ ${text} }`;
				return fixer.replaceTextRange(
					getParenthesizedRange(expression, context),
					text,
				);
			}
		} else {
			if (isAwaited) {
				return fixer.replaceTextRange(
					getParenthesizedRange(callExpression, context),
					getAwaitedResolveArgumentText(errorOrValue, context),
				);
			}

			if (isYieldExpression) {
				text = `yield${text ? ' ' : ''}${text}`;
			} else if (parent.type === 'ReturnStatement') {
				text = `return${text ? ' ' : ''}${text};`;
			} else {
				if (errorOrValue?.type === 'ObjectExpression') {
					text = `(${text})`;
				}

				// `=> Promise.resolve()` -> `=> {}`
				text ||= '{}';
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
	context.on('CallExpression', callExpression => {
		const {expression, parent} = getCallExpressionInfo(callExpression);

		if (!(
			isMethodCall(callExpression, {
				object: 'Promise',
				methods: ['resolve', 'reject'],
				optionalCall: false,
				optionalMember: false,
			})
			&& (
				(
					parent.type === 'ArrowFunctionExpression'
					&& parent.body === expression
				)
				|| (
					parent.type === 'ReturnStatement'
					&& parent.argument === expression
				)
				|| (
					parent.type === 'YieldExpression'
					&& !parent.delegate && parent.argument === expression
				)
			)
		)) {
			return;
		}

		const {functionNode, isInTryStatement} = getFunctionNode(callExpression);
		if (!functionNode || !(functionNode.async || isPromiseCallback(functionNode))) {
			return;
		}

		return createProblem(
			callExpression,
			fix(callExpression, isInTryStatement, context),
		);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow returning/yielding `Promise.resolve/reject()` in async functions or promise callbacks',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
