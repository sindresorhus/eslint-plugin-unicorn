import {
	isBoolean,
	isString,
	isNumber,
	isBigInt,
	isGlobalIdentifier,
} from './utils/index.js';
import {replaceNodeWithExpression} from './fix/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-useless-coercion';
const messages = {
	[MESSAGE_ID]: '{{description}} is unnecessary because the value is already a {{type}}.',
};

// `name` -> {type label, predicate checking the argument is already that type}
const coercions = new Map([
	['Boolean', {type: 'boolean', isType: isBoolean}],
	['String', {type: 'string', isType: isString}],
	['BigInt', {type: 'bigint', isType: isBigInt}],
	['Number', {type: 'number', isType: (node, context) => isNumber(node, context.sourceCode.getScope(node))}],
]);

const isEmptyStringLiteral = node => node.type === 'Literal' && node.value === '';

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// Build a problem that removes the coercion `node` in favor of its inner `expression`.
	const getProblem = (node, expression, description, type) => ({
		node,
		messageId: MESSAGE_ID,
		data: {description, type},
		/** @param {ESLint.Rule.RuleFixer} fixer */
		* fix(fixer, {abort}) {
			// Removing the coercion would drop comments inside it.
			if (sourceCode.getCommentsInside(node).length > 0) {
				return abort();
			}

			yield replaceNodeWithExpression(fixer, node, expression, context);
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
			|| !isNumber(node.argument, sourceCode.getScope(node.argument))
		) {
			return;
		}

		return getProblem(node, node.argument, '`+`', 'number');
	});

	// `value + ''` / `'' + value` on a value already a string. We intentionally do not special-case rare directive prologue creation.
	context.on('BinaryExpression', (/** @type {ESTree.BinaryExpression} */ node) => {
		if (node.operator !== '+') {
			return;
		}

		const {left, right} = node;
		let value;
		if (isEmptyStringLiteral(right) && isString(left, context)) {
			value = left;
		} else if (isEmptyStringLiteral(left) && isString(right, context)) {
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

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless type coercions of values that are already of the target type.',
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
