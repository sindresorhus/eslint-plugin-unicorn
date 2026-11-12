import {getStaticStringValue, isDirectEvalCall, isFunction} from './ast/index.js';
import {
	isBoolean,
	isBooleanTypeInformation,
	isString,
	isNumber,
	isBigInt,
	isGlobalIdentifier,
	isTypeScriptFile,
	getEnclosingFunction,
	getFunctionReturnExpression,
	getConstVariableInitializer,
	getParenthesizedRange,
	getStaticValueForControlFlow,
	hasStrictNullChecks,
	containsNode,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
} from './utils/index.js';
import {fixSpaceAroundKeyword, replaceNodeWithExpression} from './fix/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-useless-coercion';
const SUGGESTION_ID = 'remove-double-negation';
const messages = {
	[MESSAGE_ID]: '{{description}} is unnecessary because the value is already a {{type}}.',
	[SUGGESTION_ID]: 'Remove the double negation.',
};

// `name` -> {type label, predicate checking the argument is already that type}
const coercions = new Map([
	['Boolean', {type: 'boolean', isType: isBoolean}],
	['String', {type: 'string', isType: isString}],
	['BigInt', {type: 'bigint', isType: isBigInt}],
	['Number', {type: 'number', isType: isNumber}],
]);

function getStaticallySelectedOperand(node, context) {
	if (node.type === 'ConditionalExpression') {
		const test = getStaticValueForControlFlow(node.test, context);
		return test && (test.value ? node.consequent : node.alternate);
	}

	if (node.type !== 'LogicalExpression') {
		return;
	}

	const left = getStaticValueForControlFlow(node.left, context);
	if (!left) {
		return;
	}

	if (node.operator === '??') {
		return left.value === null || left.value === undefined ? node.right : node.left;
	}

	const selectsRight = node.operator === '&&' ? Boolean(left.value) : !left.value;
	return selectsRight ? node.right : node.left;
}

function isBooleanDoubleNegationOperand(node, context) {
	node = unwrapTypeScriptExpression(node);
	const initializer = getConstVariableInitializer(node, context);
	if (initializer) {
		return context.sourceCode.getRange(initializer)[1] <= context.sourceCode.getRange(node)[0]
			&& isBooleanDoubleNegationOperand(initializer, context);
	}

	if (node.type === 'CallExpression' && isFunction(node.callee) && node.callee.params.length === 0) {
		const {callee} = node;
		const expression = getFunctionReturnExpression(callee);
		return !callee.async && !callee.generator && expression !== undefined && isBooleanDoubleNegationOperand(expression, context);
	}

	if (isBoolean(node, context)) {
		return true;
	}

	// Branch selection relies on the module's lexical bindings.
	const operand = context.sourceCode.ast.sourceType === 'module' ? getStaticallySelectedOperand(node, context) : undefined;
	if (operand) {
		return isBooleanDoubleNegationOperand(operand, context);
	}

	if (!hasStrictNullChecks(context.sourceCode.parserServices?.program)) {
		return false;
	}

	// Check the value produced by `await`, `??`, or `||`, since it can be boolean even when an input is not.
	return (
		(node.type === 'AwaitExpression' && ['Identifier', 'MemberExpression', 'CallExpression', 'NewExpression'].includes(node.argument.type))
		|| (node.type === 'LogicalExpression' && node.operator !== '&&' && isBooleanDoubleNegationOperand(node.right, context))
	) && isBooleanTypeInformation(node, context);
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const isTypeScript = isTypeScriptFile(context.physicalFilename) || Boolean(sourceCode.parserServices?.esTreeNodeToTSNodeMap);
	const hasDynamicBindings = sourceCode.ast.sourceType !== 'module'
		&& containsNode(sourceCode.ast, context, node => node.type === 'WithStatement' || isDirectEvalCall(node));

	// Build a problem that removes the coercion `node` in favor of its inner `expression`.
	const getProblem = (node, expression, description, type) => ({
		node,
		messageId: MESSAGE_ID,
		data: {description, type},
		/**
		@param {ESLint.Rule.RuleFixer} fixer
		*/
		* fix(fixer, {abort}) {
			// Removing the coercion would drop comments outside the preserved expression.
			if (wouldRemoveComments(context, node, [getParenthesizedRange(expression, context)])) {
				return abort();
			}

			const replacement = replaceNodeWithExpression(fixer, node, expression, context);
			if (!replacement) {
				return abort();
			}

			yield replacement;
			yield fixSpaceAroundKeyword(fixer, node, context);
		},
	});

	// `Boolean(value)` / `String(value)` / `Number(value)` / `BigInt(value)`
	context.on('CallExpression', (/** @type {ESTree.CallExpression} */ callExpression) => {
		if (
			callExpression.optional
			|| callExpression.callee.type !== 'Identifier'
			|| callExpression.arguments.length !== 1
			|| callExpression.arguments[0].type === 'SpreadElement'
		) {
			return;
		}

		const {name} = callExpression.callee;
		const coercion = coercions.get(name);
		if (!coercion) {
			return;
		}

		if (!isGlobalIdentifier(callExpression.callee, context)) {
			return;
		}

		// `Boolean()` can suppress inferred type predicates in functions without return annotations.
		if (name === 'Boolean' && isTypeScript) {
			const functionNode = getEnclosingFunction(callExpression);
			if (functionNode && !functionNode.returnType) {
				return;
			}
		}

		const [argument] = callExpression.arguments;
		if (!coercion.isType(argument, context)) {
			return;
		}

		return getProblem(callExpression, argument, `\`${name}()\``, coercion.type);
	});

	// `+value` on a value already a number. `~~` and `-` change the value, so they are excluded.
	context.on('UnaryExpression', (/** @type {ESTree.UnaryExpression} */ node) => {
		if (
			node.operator !== '+'
			|| !isNumber(node.argument, context)
		) {
			return;
		}

		return getProblem(node, node.argument, '`+`', 'number');
	});

	// Removing `!!` can change the inferred type in TypeScript and in JavaScript checked by TypeScript.
	context.on('UnaryExpression', (/** @type {ESTree.UnaryExpression} */ node) => {
		if (hasDynamicBindings || node.operator !== '!') {
			return;
		}

		const negation = unwrapTypeScriptExpression(node.argument);
		if (
			negation.type !== 'UnaryExpression'
			|| negation.operator !== '!'
			|| !isBooleanDoubleNegationOperand(negation.argument, context)
		) {
			return;
		}

		const {fix, ...problem} = getProblem(node, negation.argument, '`!!`', 'boolean');
		return {...problem, suggest: [{messageId: SUGGESTION_ID, fix}]};
	});

	// `value + ''` / `'' + value` on a value already a string. We intentionally do not special-case rare directive prologue creation.
	context.on('BinaryExpression', (/** @type {ESTree.BinaryExpression} */ node) => {
		if (node.operator !== '+') {
			return;
		}

		const {left, right} = node;
		let value;
		if (getStaticStringValue(right) === '' && isString(left, context)) {
			value = left;
		} else if (getStaticStringValue(left) === '' && isString(right, context)) {
			value = right;
		} else {
			return;
		}

		return getProblem(node, value, 'Concatenation with `\'\'`', 'string');
	});

	// `value.toString()` on a value already a string.
	context.on('CallExpression', (/** @type {ESTree.CallExpression} */ node) => {
		const {callee} = node;
		if (
			node.optional
			|| node.arguments.length > 0
			|| callee.type !== 'MemberExpression'
			|| callee.optional
			|| callee.computed
			|| callee.property.type !== 'Identifier'
			|| callee.property.name !== 'toString'
			|| !isString(callee.object, context)
		) {
			return;
		}

		return getProblem(node, callee.object, '`.toString()`', 'string');
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless type coercions of values that are already of the target type.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
