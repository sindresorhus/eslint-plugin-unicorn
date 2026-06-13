import {
	getParenthesizedText,
	isKnownNonArray,
	isParenthesized,
	isSameReference,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID_ERROR = 'prefer-single-array-predicate/error';
const MESSAGE_ID_SUGGESTION = 'prefer-single-array-predicate/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer a single `Array#{{method}}()` with a combined predicate.',
	[MESSAGE_ID_SUGGESTION]: 'Merge predicates into one `Array#{{method}}()` call.',
};

const methodByOperator = new Map([
	['||', 'some'],
	['&&', 'every'],
]);

const predicateBodyTypesRequiringParentheses = new Set([
	'AssignmentExpression',
	'ArrowFunctionExpression',
	'ConditionalExpression',
	'SequenceExpression',
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
	'YieldExpression',
]);

const needsParenthesesInPredicate = (node, operator) => {
	if (node.type === 'LogicalExpression') {
		if (node.operator === operator) {
			return false;
		}

		return !(operator === '||' && node.operator === '&&');
	}

	return predicateBodyTypesRequiringParentheses.has(node.type);
};

function getPredicateBodyText(node, operator, context) {
	if (isParenthesized(node, context)) {
		return getParenthesizedText(node, context);
	}

	const text = context.sourceCode.getText(node);

	return needsParenthesesInPredicate(node, operator) ? `(${text})` : text;
}

const getParameterText = (node, sourceCode) => {
	const text = sourceCode.getText(node);

	return node.typeAnnotation || node.optional ? `(${text})` : text;
};

function getCallbackInformation(node) {
	if (
		node.type !== 'ArrowFunctionExpression'
		|| node.async
		|| node.returnType
		|| node.typeParameters
		|| node.params.length !== 1
		|| node.params[0].type !== 'Identifier'
		|| node.body.type === 'BlockStatement'
	) {
		return;
	}

	return {
		parameter: node.params[0],
		body: node.body,
	};
}

function getPredicateCall(node, method, context) {
	if (!isMethodCall(node, {
		method,
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	if (node.typeArguments || node.typeParameters) {
		return;
	}

	const {object} = node.callee;
	if (isKnownNonArray(object, context)) {
		return;
	}

	const callback = getCallbackInformation(node.arguments[0]);
	if (!callback) {
		return;
	}

	return {
		node,
		object,
		callback: {
			...callback,
			parameterText: getParameterText(callback.parameter, context.sourceCode),
		},
	};
}

function getLogicalOperands(node, operator) {
	if (
		node.type !== 'LogicalExpression'
		|| node.operator !== operator
	) {
		return [node];
	}

	return [
		...getLogicalOperands(node.left, operator),
		...getLogicalOperands(node.right, operator),
	];
}

const isOutermostLogicalExpression = node =>
	node.parent.type !== 'LogicalExpression'
	|| node.parent.operator !== node.operator;

const areCompatiblePredicateCalls = (left, right) =>
	isSameReference(left.object, right.object)
	&& left.callback.parameterText === right.callback.parameterText;

function getMergedCallText(calls, operator, context) {
	const {sourceCode} = context;
	const [firstCall] = calls;
	const {callback} = firstCall;
	const predicateText = calls
		.map(({callback}) => getPredicateBodyText(callback.body, operator, context))
		.join(` ${operator} `);

	return `${sourceCode.getText(firstCall.node.callee)}(${callback.parameterText} => ${predicateText})`;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('LogicalExpression', logicalExpression => {
		if (!isOutermostLogicalExpression(logicalExpression)) {
			return;
		}

		const method = methodByOperator.get(logicalExpression.operator);
		if (!method) {
			return;
		}

		if (context.sourceCode.getCommentsInside(logicalExpression).length > 0) {
			return;
		}

		const calls = getLogicalOperands(logicalExpression, logicalExpression.operator)
			.map(node => getPredicateCall(node, method, context));

		if (
			calls.length < 2
			|| calls.includes(undefined)
			|| calls.some(call => !areCompatiblePredicateCalls(calls[0], call))
		) {
			return;
		}

		return {
			node: logicalExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {method},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {method},
					fix: fixer => fixer.replaceText(
						logicalExpression,
						getMergedCallText(calls, logicalExpression.operator, context),
					),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer a single `Array#some()` or `Array#every()` with a combined predicate.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
