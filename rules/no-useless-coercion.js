import {findVariable} from '@eslint-community/eslint-utils';
import {getStaticStringValue, isDirectEvalCall, isFunction} from './ast/index.js';
import {
	isBoolean,
	isBooleanOperatorExpression,
	isBooleanTypeInformation,
	isBuiltinBooleanCallExpression,
	isBuiltinBooleanPropertyRead,
	isString,
	isNumber,
	isBigInt,
	isGlobalIdentifier,
	isTypeScriptFile,
	isUnassignedParameter,
	getEnclosingFunction,
	getFunctionReturnExpression,
	getConstVariableInitializer,
	getParenthesizedRange,
	getStaticValueForControlFlow,
	hasJSDocumentExpressionType,
	hasStrictNullChecks,
	containsNode,
	unwrapChainAndTypeScriptExpression,
	unwrapTypeScriptExpression,
	withTypeInformation,
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

function canUseBindingType(node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definitions = variable?.defs ?? [];
	if (definitions.length === 0) {
		return true;
	}

	// The checker can infer `boolean` for an alias of an unchecked read or narrow a live import.
	const [definition] = definitions;
	return definitions.length === 1 && (
		isUnassignedParameter(variable)
		|| (definition.type === 'Variable' && definition.parent.declare)
	);
}

function hasStablePropertyReceiver(node, context) {
	const receiver = unwrapTypeScriptExpression(node.object);
	return receiver.type === 'Identifier' && canUseBindingType(receiver, context);
}

function isBooleanPropertyRead(node, context) {
	return isBuiltinBooleanPropertyRead(node, context)
		|| typeof getStaticValueForControlFlow(node, context)?.value === 'boolean'
		|| (hasStablePropertyReceiver(node, context) && isBooleanTypeInformation(node, context));
}

function isAwaitingBoolean(node, context) {
	if (!hasStrictNullChecks(context.sourceCode.parserServices?.program)) {
		return false;
	}

	const {argument} = node;
	if (argument.type === 'Identifier') {
		// Trust only direct parameters whose values come from the caller.
		const variable = findVariable(context.sourceCode.getScope(argument), argument);
		if (!isUnassignedParameter(variable)) {
			return false;
		}
	} else if (argument.type !== 'MemberExpression' || !hasStablePropertyReceiver(argument, context)) {
		return false;
	}

	return isBooleanTypeInformation(node, context);
}

function isBooleanLogicalExpression(node, context) {
	if (!isBooleanDoubleNegationOperand(node.right, context)) {
		return false;
	}

	if (isBooleanDoubleNegationOperand(node.left, context)) {
		return true;
	}

	const left = unwrapChainAndTypeScriptExpression(node.left);
	return node.operator !== '&&'
		&& hasStrictNullChecks(context.sourceCode.parserServices?.program)
		&& (left.type === 'MemberExpression'
			? hasStablePropertyReceiver(left, context)
			: left === node.left && left.type === 'Identifier' && canUseBindingType(left, context))
		&& isBooleanTypeInformation(node, context);
}

function isBooleanBinding(node, context) {
	const initializer = getConstVariableInitializer(node, context);
	if (initializer) {
		return context.sourceCode.getRange(initializer)[1] <= context.sourceCode.getRange(node)[0]
			&& isBooleanDoubleNegationOperand(initializer, context);
	}

	return canUseBindingType(node, context) && isBoolean(node, context);
}

function isBooleanCall(node, context) {
	const {callee} = node;
	if (isFunction(callee) && callee.params.length === 0) {
		const expression = getFunctionReturnExpression(callee);
		return !callee.async && !callee.generator && expression !== undefined && isBooleanDoubleNegationOperand(expression, context);
	}

	// TypeScript's call type can reflect stale narrowing or hide a nullable return type.
	return context.sourceCode.parserServices?.program
		? isBuiltinBooleanCallExpression(node, context)
		: isBoolean(node, context);
}

function isBooleanDoubleNegationOperand(node, context) {
	node = unwrapTypeScriptExpression(node);

	// Branch selection relies on the module's lexical bindings.
	const operand = context.sourceCode.ast.sourceType === 'module' ? getStaticallySelectedOperand(node, context) : undefined;
	if (operand) {
		return isBooleanDoubleNegationOperand(operand, context);
	}

	switch (node.type) {
		case 'Identifier': {
			return isBooleanBinding(node, context);
		}

		case 'ConditionalExpression': {
			return isBooleanDoubleNegationOperand(node.consequent, context)
				&& isBooleanDoubleNegationOperand(node.alternate, context);
		}

		case 'LogicalExpression': {
			return isBooleanLogicalExpression(node, context);
		}

		case 'SequenceExpression': {
			return isBooleanDoubleNegationOperand(node.expressions.at(-1), context);
		}

		case 'AssignmentExpression': {
			return node.operator === '=' && isBooleanDoubleNegationOperand(node.right, context);
		}

		case 'ParenthesizedExpression': {
			return isBooleanDoubleNegationOperand(node.expression, context);
		}

		case 'AwaitExpression': {
			return isBooleanDoubleNegationOperand(node.argument, context) || isAwaitingBoolean(node, context);
		}

		case 'CallExpression': {
			return isBooleanCall(node, context);
		}

		case 'MemberExpression': {
			return isBooleanPropertyRead(node, context);
		}

		case 'Literal':
		case 'UnaryExpression':
		case 'BinaryExpression':
		case 'ChainExpression': {
			return isBoolean(node, context);
		}

		default: {
			return false;
		}
	}
}

function canAutofixDoubleNegation(node, negation, context) {
	const operand = negation.argument;
	if (
		negation !== node.argument
		|| hasJSDocumentExpressionType(operand, context)
		|| hasJSDocumentExpressionType(node, context)
	) {
		return false;
	}

	if (isBooleanOperatorExpression(operand)) {
		return true;
	}

	// Other expressions can be contextually typed after removing `!!`, even when their current type is `boolean`.
	if (operand.type !== 'Identifier' && operand.type !== 'MemberExpression') {
		return false;
	}

	// A bare read can introduce narrowing. An unannotated const initializer can also alias a discriminant property.
	const {parent} = node;
	const isVariableInitializer = parent.type === 'VariableDeclarator'
		&& (operand.type === 'Identifier' || (parent.id.type === 'Identifier' && Boolean(parent.id.typeAnnotation)));
	if (!isVariableInitializer && !['ArrayExpression', 'ReturnStatement', 'ArrowFunctionExpression'].includes(parent.type)) {
		return false;
	}

	const {parserServices} = context.sourceCode;
	return withTypeInformation(operand, context, ({type, checker, program}) => {
		const booleanType = checker.getBooleanType();
		// Without strict null checks, a `boolean` annotation also accepts `null` and `undefined`.
		if (!hasStrictNullChecks(program) || type !== booleanType || parserServices.getTypeAtLocation(node) !== booleanType) {
			return false;
		}

		if (operand.type === 'MemberExpression') {
			return true;
		}

		// A narrowed identifier can stay `boolean` in the checker after a write through another reference.
		const symbol = parserServices.getSymbolAtLocation(operand);
		return Boolean(symbol) && checker.getTypeOfSymbol(symbol) === booleanType;
	}) === true;
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const isTypeScript = isTypeScriptFile(context.physicalFilename) || Boolean(sourceCode.parserServices?.esTreeNodeToTSNodeMap);
	const hasDirectEval = containsNode(sourceCode.ast, context, isDirectEvalCall);

	// Build a problem that removes the coercion `node` in favor of its inner `expression`.
	const getProblem = (node, expression, {description, type, removeGrouping = false}) => ({
		node,
		messageId: MESSAGE_ID,
		data: {description, type},
		/**
		@param {ESLint.Rule.RuleFixer} fixer
		*/
		* fix(fixer, {abort}) {
			// Removing the coercion would drop comments outside the preserved expression.
			const preservedRange = removeGrouping ? sourceCode.getRange(expression) : getParenthesizedRange(expression, context);
			if (wouldRemoveComments(context, node, [preservedRange])) {
				return abort();
			}

			const replacement = removeGrouping
				? fixer.replaceText(node, sourceCode.getText(expression))
				: replaceNodeWithExpression(fixer, node, expression, context);
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

		return getProblem(callExpression, argument, {description: `\`${name}()\``, type: coercion.type});
	});

	// `+value` on a value already a number. `~~` and `-` change the value, so they are excluded.
	context.on('UnaryExpression', (/** @type {ESTree.UnaryExpression} */ node) => {
		if (
			node.operator !== '+'
			|| !isNumber(node.argument, context)
		) {
			return;
		}

		return getProblem(node, node.argument, {description: '`+`', type: 'number'});
	});

	// Removing `!!` can change the inferred type in TypeScript and in JavaScript checked by TypeScript.
	context.on('UnaryExpression', (/** @type {ESTree.UnaryExpression} */ node) => {
		if (hasDirectEval || node.operator !== '!') {
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

		const operand = negation.argument;
		// Parentheses around a return value can hide earlier narrowing when TypeScript infers a predicate.
		const removeGrouping = node.parent.type === 'ReturnStatement' && isBooleanOperatorExpression(operand);
		const canAutofix = canAutofixDoubleNegation(node, negation, context)
			&& (!removeGrouping || !wouldRemoveComments(context, node, [sourceCode.getRange(operand)]));
		const problem = getProblem(node, operand, {
			description: '`!!`',
			type: 'boolean',
			removeGrouping: canAutofix && removeGrouping,
		});
		if (canAutofix) {
			return problem;
		}

		const {fix, ...report} = problem;
		return {...report, suggest: [{messageId: SUGGESTION_ID, fix}]};
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

		return getProblem(node, value, {description: 'Concatenation with `\'\'`', type: 'string'});
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

		return getProblem(node, callee.object, {description: '`.toString()`', type: 'string'});
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
