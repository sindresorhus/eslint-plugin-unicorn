import {isMemberExpression, isMethodCall} from './ast/index.js';

const messages = {
	'error/charCodeAt': 'Prefer `String#codePointAt()` over `String#charCodeAt()`.',
	'error/fromCharCode': 'Prefer `String.fromCodePoint()` over `String.fromCharCode()`.',
	'suggestion/codePointAt': 'Use `String#codePointAt()`.',
	'suggestion/fromCodePoint': 'Use `String.fromCodePoint()`.',
};

const getProblem = (node, replacement) => ({
	node,
	messageId: `error/${node.name}`,
	suggest: [
		{
			messageId: `suggestion/${replacement}`,
			fix: fixer => fixer.replaceText(node, replacement),
		},
	],
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	CallExpression(node) {
		if (isMethodCall(node, {
			method: 'charCodeAt',
			optionalCall: false,
		})) {
			return getProblem(node.callee.property, 'codePointAt');
		}
	},
	MemberExpression(node) {
		if (isMemberExpression(node, {
			object: 'String',
			property: 'fromCharCode',
			optional: false,
		})) {
			return getProblem(node.property, 'fromCodePoint');
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#codePointAt(…)` over `String#charCodeAt(…)` and `String.fromCodePoint(…)` over `String.fromCharCode(…)`.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
