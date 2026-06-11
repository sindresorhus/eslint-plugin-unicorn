import {isFunction, isMethodCall} from './ast/index.js';
import {isSameIdentifier} from './utils/index.js';

const MESSAGE_ID = 'no-useless-boolean-cast';
const messages = {
	[MESSAGE_ID]: '`Boolean()` is unnecessary in `Array#{{method}}()` callbacks.',
};

const predicateMethods = [
	'every',
	'filter',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'some',
];

const needsParenthesesInConciseArrowBody = (node, text) =>
	node.type === 'SequenceExpression'
	|| text.trimStart().startsWith('{');

function getReturnedExpression(callback) {
	if (
		callback.async
		|| callback.generator
		|| callback.returnType
	) {
		return;
	}

	if (callback.type === 'ArrowFunctionExpression' && callback.body.type !== 'BlockStatement') {
		return callback.body;
	}

	if (
		callback.body.type === 'BlockStatement'
		&& callback.body.body.length === 1
		&& callback.body.body[0].type === 'ReturnStatement'
	) {
		return callback.body.body[0].argument;
	}
}

function isBooleanCall(node) {
	return node?.type === 'CallExpression'
		&& !node.optional
		&& node.callee.type === 'Identifier'
		&& node.callee.name === 'Boolean'
		&& node.arguments.length === 1
		&& node.arguments[0].type !== 'SpreadElement';
}

const isBooleanFirstParameterCallback = (callback, argument) =>
	callback.params[0]?.type === 'Identifier'
	&& isSameIdentifier(callback.params[0], argument);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			methods: predicateMethods,
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [callback] = node.arguments;
		if (!isFunction(callback)) {
			return;
		}

		const booleanCall = getReturnedExpression(callback);
		if (
			!isBooleanCall(booleanCall)
			|| sourceCode.getCommentsInside(booleanCall).length > 0
		) {
			return;
		}

		const [argument] = booleanCall.arguments;
		if (isBooleanFirstParameterCallback(callback, argument)) {
			return;
		}

		return {
			node: booleanCall,
			messageId: MESSAGE_ID,
			data: {method: node.callee.property.name},
			fix(fixer) {
				let replacement = sourceCode.getText(argument);

				if (
					callback.type === 'ArrowFunctionExpression'
					&& callback.body === booleanCall
					&& needsParenthesesInConciseArrowBody(argument, replacement)
				) {
					replacement = `(${replacement})`;
				}

				return fixer.replaceText(booleanCall, replacement);
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary `Boolean()` casts in array predicate callbacks.',
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
