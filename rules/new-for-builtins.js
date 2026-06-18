import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import * as builtins from './utils/builtins.js';
import {hasOptionalChainElement} from './utils/index.js';
import {
	switchCallExpressionToNewExpression,
	switchNewExpressionToCallExpression,
	fixSpaceAroundKeyword,
} from './fix/index.js';

const MESSAGE_ID_ERROR_DATE = 'error-date';
const MESSAGE_ID_SUGGESTION_DATE = 'suggestion-date';

const messages = {
	enforce: 'Use `new {{name}}()` instead of `{{name}}()`.',
	disallow: 'Use `{{name}}()` instead of `new {{name}}()`.',
	disallowCallOrNew: '`{{name}}` is not a function or constructor.',
	[MESSAGE_ID_ERROR_DATE]: 'Use `String(new Date())` instead of `Date()`.',
	[MESSAGE_ID_SUGGESTION_DATE]: 'Switch to `String(new Date())`.',
};

const getName = reference => reference.path.join('.');
const hasOptionalChain = node => node.optional || hasOptionalChainElement(node.callee);

function enforceNewExpression(reference, context) {
	const {node} = reference;

	// An optional chain (`Array?.()` or `Intl?.DateTimeFormat()`) can't be rewritten to a `new` expression, which can't be optional.
	if (hasOptionalChain(node)) {
		return;
	}

	const name = getName(reference);

	if (name === 'Object') {
		const {parent} = node;
		if (
			parent.type === 'BinaryExpression'
			&& (parent.operator === '===' || parent.operator === '!==')
			&& (parent.left === node || parent.right === node)
		) {
			return;
		}
	} else if (name === 'Date') {
		// `Date()` returns a string representation of the current date and time, exactly as `new Date().toString()` does.
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#return_value
		function * fix(fixer) {
			yield fixer.replaceText(node, 'String(new Date())');
			yield fixSpaceAroundKeyword(fixer, node, context);
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR_DATE,
		};

		if (context.sourceCode.getCommentsInside(node).length === 0 && node.arguments.length === 0) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_DATE,
					fix,
				},
			];
		}

		return problem;
	}

	return {
		node,
		messageId: 'enforce',
		data: {name},
		fix: fixer => switchCallExpressionToNewExpression(node, context, fixer),
	};
}

function enforceCallExpression(reference, context) {
	const {node} = reference;
	const name = getName(reference);

	const problem = {
		node,
		messageId: 'disallow',
		data: {name},
	};

	if (name !== 'String' && name !== 'Boolean' && name !== 'Number') {
		problem.fix = fixer => switchNewExpressionToCallExpression(node, context, fixer);
	}

	return problem;
}

function disallowCallOrNewExpression(reference) {
	const {node} = reference;
	const name = getName(reference);

	return {
		node,
		messageId: 'disallowCallOrNew',
		data: {name},
	};
}

const newExpressionTracker = new GlobalReferenceTracker({
	objects: builtins.disallowNew,
	type: GlobalReferenceTracker.CONSTRUCT,
	handle: enforceCallExpression,
});
const callExpressionTracker = new GlobalReferenceTracker({
	objects: builtins.enforceNew,
	type: GlobalReferenceTracker.CALL,
	handle: enforceNewExpression,
});
const callExpressionDisallowTracker = new GlobalReferenceTracker({
	objects: builtins.disallowCallOrNew,
	type: GlobalReferenceTracker.CALL,
	handle: disallowCallOrNewExpression,
});
const newExpressionDisallowTracker = new GlobalReferenceTracker({
	objects: builtins.disallowCallOrNew,
	type: GlobalReferenceTracker.CONSTRUCT,
	handle: disallowCallOrNewExpression,
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	newExpressionTracker.listen({context});
	callExpressionTracker.listen({context});
	callExpressionDisallowTracker.listen({context});
	newExpressionDisallowTracker.listen({context});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce correct use of `new` for builtin constructors.',
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
