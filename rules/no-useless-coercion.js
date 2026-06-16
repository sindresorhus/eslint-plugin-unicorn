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
	[MESSAGE_ID]: '`{{name}}()` is unnecessary because the value is already a {{type}}.',
};

// `name` -> {type label, predicate checking the argument is already that type}
const coercions = new Map([
	['Boolean', {type: 'boolean', isType: isBoolean}],
	['String', {type: 'string', isType: isString}],
	['BigInt', {type: 'bigint', isType: isBigInt}],
	['Number', {type: 'number', isType: (node, context) => isNumber(node, context.sourceCode.getScope(node))}],
]);

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

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

		return {
			node: callExpression,
			messageId: MESSAGE_ID,
			data: {name, type: coercion.type},
			/** @param {ESLint.Rule.RuleFixer} fixer */
			* fix(fixer, {abort}) {
				// Removing the call would drop comments inside it.
				if (sourceCode.getCommentsInside(callExpression).length > 0) {
					return abort();
				}

				yield replaceNodeWithExpression(fixer, callExpression, argument, context);
			},
		};
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
