import {hasSideEffect, findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from '../ast/index.js';
import {
	isSameIdentifier,
	isFunctionSelfUsedInside,
	isParenthesized,
	shouldSkipKnownNonArrayReceiver,
} from '../utils/index.js';

const booleanLiteralTypeNames = new Set(['false', 'true']);

const isSimpleCompare = (node, compareNode) =>
	node.type === 'BinaryExpression'
	&& node.operator === '==='
	&& (
		isSameIdentifier(node.left, compareNode)
		|| isSameIdentifier(node.right, compareNode)
	);
const isSimpleCompareCallbackFunction = node =>
	// Matches `foo.findIndex(bar => bar === baz)`
	(
		node.type === 'ArrowFunctionExpression'
		&& !node.async
		&& node.params.length === 1
		&& isSimpleCompare(node.body, node.params[0])
	)
	// Matches `foo.findIndex(bar => {return bar === baz})`
	// Matches `foo.findIndex(function (bar) {return bar === baz})`
	|| (
		(node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression')
		&& !node.async
		&& !node.generator
		&& node.params.length === 1
		&& node.body.type === 'BlockStatement'
		&& node.body.body.length === 1
		&& node.body.body[0].type === 'ReturnStatement'
		&& isSimpleCompare(node.body.body[0].argument, node.params[0])
	);
const isIdentifierNamed = ({type, name}, expectName) => type === 'Identifier' && name === expectName;

function getSingleReturnExpression(node) {
	if (
		node.type === 'ArrowFunctionExpression'
		&& !node.async
		&& node.params.length === 1
		&& node.body.type !== 'BlockStatement'
	) {
		return node.body;
	}

	if (
		(node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression')
		&& !node.async
		&& !node.generator
		&& node.params.length === 1
		&& node.body.type === 'BlockStatement'
		&& node.body.body.length === 1
		&& node.body.body[0].type === 'ReturnStatement'
	) {
		return node.body.body[0].argument;
	}
}

function getBooleanPredicateReference(callback, parameter) {
	const returnExpression = getSingleReturnExpression(callback);
	if (!returnExpression) {
		return;
	}

	if (isSameIdentifier(returnExpression, parameter)) {
		return returnExpression;
	}

	if (
		returnExpression.type === 'CallExpression'
		&& !returnExpression.optional
		&& isIdentifierNamed(returnExpression.callee, 'Boolean')
		&& returnExpression.arguments.length === 1
		&& isSameIdentifier(returnExpression.arguments[0], parameter)
	) {
		return returnExpression.arguments[0];
	}
}

function isBooleanLikeType(type) {
	if (type.intrinsicName === 'boolean' || type.intrinsicName === 'true') {
		return true;
	}

	if (!type.isUnion()) {
		return false;
	}

	const typeNames = type.types.map(type => type.intrinsicName);
	return typeNames.includes('true') && typeNames.every(typeName => booleanLiteralTypeNames.has(typeName));
}

function isArrayOrTupleType(type, parserServices) {
	if (type.isUnion()) {
		return false;
	}

	const checker = parserServices.program.getTypeChecker();
	return Boolean(type.getProperty('includes')) && (checker.isArrayType(type) || checker.isTupleType(type));
}

export default function simpleArraySearchRule({method, replacement, checkBooleanPredicate = false}) {
	// Add prefix to avoid conflicts in `prefer-includes` rule
	const MESSAGE_ID_PREFIX = `prefer-${replacement}-over-${method}/`;
	const ERROR = `${MESSAGE_ID_PREFIX}error`;
	const SUGGESTION = `${MESSAGE_ID_PREFIX}suggestion`;
	const ERROR_MESSAGES = {
		findIndex: 'Use `.indexOf()` instead of `.findIndex()` when looking for the index of an item.',
		findLastIndex: 'Use `.lastIndexOf()` instead of `.findLastIndex() when looking for the index of an item.`',
		some: `Use \`.${replacement}()\` instead of \`.${method}()\` when checking value existence.`,
	};

	const messages = {
		[ERROR]: ERROR_MESSAGES[method],
		[SUGGESTION]: `Replace \`.${method}()\` with \`.${replacement}()\`.`,
	};

	function listen(context) {
		const {sourceCode} = context;
		const {scopeManager} = sourceCode;

		context.on('CallExpression', callExpression => {
			if (
				!isMethodCall(callExpression, {
					method,
					argumentsLength: 1,
					optionalCall: false,
				})
				|| !isSimpleCompareCallbackFunction(callExpression.arguments[0])
				// Skip receivers that are provably not arrays
				|| shouldSkipKnownNonArrayReceiver(callExpression.callee.object, context)
			) {
				return;
			}

			const [callback] = callExpression.arguments;
			const binaryExpression = callback.body.type === 'BinaryExpression'
				? callback.body
				: callback.body.body[0].argument;
			const [parameter] = callback.params;
			const {left, right} = binaryExpression;
			const {name} = parameter;

			let searchValueNode;
			let parameterInBinaryExpression;
			if (isIdentifierNamed(left, name)) {
				searchValueNode = right;
				parameterInBinaryExpression = left;
			} else if (isIdentifierNamed(right, name)) {
				searchValueNode = left;
				parameterInBinaryExpression = right;
			} else {
				return;
			}

			const callbackScope = scopeManager.acquire(callback);
			if (
				// Can't use scopeManager in Vue.js template
				// https://github.com/vuejs/vue-eslint-parser/issues/263
				!callbackScope
				// `parameter` is used somewhere else
				|| findVariable(callbackScope, parameter).references.some(({identifier}) => identifier !== parameterInBinaryExpression)
				|| isFunctionSelfUsedInside(callback, callbackScope)
			) {
				return;
			}

			const methodNode = callExpression.callee.property;
			const problem = {
				node: methodNode,
				messageId: ERROR,
				suggest: [],
			};

			const fix = function * (fixer) {
				let text = sourceCode.getText(searchValueNode);
				if (isParenthesized(searchValueNode, context) && !isParenthesized(callback, context)) {
					text = `(${text})`;
				}

				yield fixer.replaceText(methodNode, replacement);
				yield fixer.replaceText(callback, text);
			};

			if (hasSideEffect(searchValueNode, sourceCode)) {
				problem.suggest.push({messageId: SUGGESTION, fix});
			} else {
				problem.fix = fix;
			}

			return problem;
		});

		if (!checkBooleanPredicate || !sourceCode.parserServices?.program) {
			return;
		}

		context.on('CallExpression', callExpression => {
			if (!isMethodCall(callExpression, {
				method,
				argumentsLength: 1,
				optionalCall: false,
			})) {
				return;
			}

			const [callback] = callExpression.arguments;
			if (
				!(callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')
				|| callback.params.length !== 1
				|| callback.params[0].type !== 'Identifier'
			) {
				return;
			}

			const [parameter] = callback.params;
			const {parserServices} = sourceCode;
			const parameterReference = getBooleanPredicateReference(callback, parameter);
			if (
				!parameterReference
				|| !isBooleanLikeType(parserServices.getTypeAtLocation(parameter))
				|| !isArrayOrTupleType(parserServices.getTypeAtLocation(callExpression.callee.object), parserServices)
			) {
				return;
			}

			const callbackScope = scopeManager.acquire(callback);
			if (
				!callbackScope
				|| findVariable(callbackScope, parameter).references.some(({identifier}) => identifier !== parameterReference)
				|| isFunctionSelfUsedInside(callback, callbackScope)
			) {
				return;
			}

			const methodNode = callExpression.callee.property;
			return {
				node: methodNode,
				messageId: ERROR,
				* fix(fixer, {abort}) {
					if (sourceCode.getCommentsInside(callback).length > 0) {
						abort();
					}

					yield fixer.replaceText(methodNode, replacement);
					yield fixer.replaceText(callback, 'true');
				},
			};
		});
	}

	return {messages, listen};
}
