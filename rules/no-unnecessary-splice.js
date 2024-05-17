'use strict';
const {} = require('./ast/index.js');
const {} = require('./fix/index.js');
const {} = require('./utils/index.js');


const NOOP='no-op';
const USE_SHIFT='use-shift';
const USE_UNSHIFT='use-unshift';
const USE_POP='use-pop';
const USE_PUSH='use-push';
const messages = {
	[NOOP]: 'This splice call is no-op (does not remove or add any items) and can be removed',
	[USE_SHIFT]: 'Use {{ array }}.shift() to remove first item',
	[USE_UNSHIFT]: 'Use {{ array }}.unshift(...items) to add items at the beginning',
	[USE_POP]: 'Use {{ array }}.pop() to remove last item',
	[USE_PUSH]: 'Use {{ array }}.push(...items) to add items at the end',
};

// This selector catches any `foo.splice()` or `foo['splice']()` call, but not `foo[splice]()`
const baseSelector = [
	'CallExpression[callee.type=MemberExpression][callee.property.type=Identifier][callee.property.name=splice][callee.computed=false]',
	'CallExpression[callee.type=MemberExpression][callee.property.type=Literal][callee.property.value=splice]',
].join(',');
 
/** @typedef {import('estree').Expression} Expression */
/** @typedef {import('estree').CallExpression} CallExpression */
/** @typedef {import('estree').MemberExpression} MemberExpression */
/** @typedef {import('estree').Identifier} Identifier */
/** @typedef {import('estree').Literal} Literal */

/** @typedef {CallExpression & { callee: MemberExpression }} SpliceCallExpression */

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	/**
	 * @param {Expression} node 
	 * @param {unknown} value
	 * @returns {node is Literal}
	 */
	function isLiteral(node, value) {
		return node.type === 'Literal' && node.value === value;
	}

	/**
	 * @param {Expression} node 
	 * @param {string} [name]
	 * @returns {node is Identifier}
	 */
	function isIdentifier(node, name) {
		return node.type === 'Identifier' && (name === undefined || node.name === name);
	}

	/** @param {SpliceCallExpression} callExpression */
	function isNoopCall(callExpression) {
		// `.splice(something, 0)` - can be removed as no-op
		return callExpression.arguments.length === 2
			&& isLiteral(callExpression.arguments[1], 0);
	}

	/** @param {SpliceCallExpression} callExpression */
	function isShiftLikeCall(callExpression) {
		// `.splice(0, 1)` - replace with `.shift()`
		return callExpression.arguments.length === 2
			&& isLiteral(callExpression.arguments[0], 0)
			&& isLiteral(callExpression.arguments[1], 1);
	}

	/** @param {SpliceCallExpression} callExpression */
	function isUnshiftLikeCall(callExpression) {
		// `.splice(0, 0, ...elements)` - replace with `.unshift(...elements)`
		return callExpression.arguments.length > 2
			&& isLiteral(callExpression.arguments[0], 0)
			&& isLiteral(callExpression.arguments[1], 0);
	}

	/** @param {MemberExpression} memberExpression */
	function isMemberExpressionPropertyLength(memberExpression) {
		return isIdentifier(memberExpression.property, 'length') && !memberExpression.computed // `array.length` but not `array[length]`
			|| isLiteral(memberExpression.property, 'length');// `array['length']`
	}

	/** @param {SpliceCallExpression} callExpression */
	function isPopLikeCall(callExpression) {
		// `array.splice(array.length - 1, 1)` - replace with `.pop()`
		return callExpression.arguments.length === 2
			&& callExpression.arguments[0].type === 'BinaryExpression'
			&& callExpression.arguments[0].operator === '-'
			&& callExpression.arguments[0].left.type === 'MemberExpression'
			&& isIdentifier(callExpression.arguments[0].left.object, callExpression.callee.object.name)
			&& isMemberExpressionPropertyLength(callExpression.arguments[0].left)
			&& isLiteral(callExpression.arguments[0].right, 1)
			&& isLiteral(callExpression.arguments[1], 1)
	}

	/** @param {SpliceCallExpression} callExpression */
	function isPushLikeCall(callExpression) {
		// `array.splice(array.length, 0, ...elements)` - replace with `.push(...elements)`
		return callExpression.arguments.length > 2
			&& callExpression.arguments[0].type === 'MemberExpression'
			&& isIdentifier(callExpression.arguments[0].object, callExpression.callee.object.name)
			&& isMemberExpressionPropertyLength(callExpression.arguments[0])
			&& isLiteral(callExpression.arguments[1], 0)
	}

	return {
		/** @param {SpliceCallExpression} callExpression */
		[baseSelector](callExpression) {
			if (!isIdentifier(callExpression.callee.object)) {
				// TODO: support at least MemberExpression and CallExpression
				return;
			}

			// if return value is used, fixer must add additional code, which is not always easy and can be tricky to cover all cases
			// so for now we just don't apply autofix in this case (we stil report the `.splice` call though)
			// TODO: support at least some cases
			const isReturnValueUsed = callExpression.parent.type !== 'ExpressionStatement';

			if (isNoopCall(callExpression)) {
				context.report({
					node: callExpression,
					messageId: NOOP,
					fix: isReturnValueUsed ? undefined : fixer => fixer.remove(callExpression)
				});
			} else if (isShiftLikeCall(callExpression)) {
				context.report({
					node: callExpression,
					messageId: USE_SHIFT,
					data: { array: callExpression.callee.object.name },
					fix: isReturnValueUsed ? undefined : fixer => [
						fixer.replaceText(callExpression.callee.property, 'shift'),
						fixer.removeRange([
							callExpression.arguments[0].start,
							callExpression.arguments[1].end,
						])
					]
				});
			} else if (isUnshiftLikeCall(callExpression)) {
				context.report({
					node: callExpression,
					messageId: USE_UNSHIFT,
					data: { array: callExpression.callee.object.name },
					fix: isReturnValueUsed ? undefined : fixer => [
						fixer.replaceText(callExpression.callee.property, 'unshift'),
						fixer.removeRange([
							callExpression.arguments[0].start,
							callExpression.arguments[2].start,
						])
					]
				});
			} else if (isPopLikeCall(callExpression)) {
				context.report({
					node: callExpression,
					messageId: USE_POP,
					data: { array: callExpression.callee.object.name },
					fix: isReturnValueUsed ? undefined : fixer => [
						fixer.replaceText(callExpression.callee.property, 'pop'),
						fixer.removeRange([
							callExpression.arguments[0].start,
							callExpression.arguments[1].end,
						])
					]
				});
			} else if (isPushLikeCall(callExpression)) {
				context.report({
					node: callExpression,
					messageId: USE_PUSH,
					data: { array: callExpression.callee.object.name },
					fix: isReturnValueUsed ? undefined : fixer => [
						fixer.replaceText(callExpression.callee.property, 'push'),
						fixer.removeRange([
							callExpression.arguments[0].start,
							callExpression.arguments[2].start,
						])
					]
				});
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Bans `array.splice()` calls where it\'s a no-op or can be replaced with `shift`/`unshift`/`pop`/`push` calls',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
