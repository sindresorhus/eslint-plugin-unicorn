import {isFunction, isMethodCall} from './ast/index.js';
import {
	getCommentSafeProblem,
	getConciseArrowBodyText,
	getFunctionReturnExpression,
	hasOptionalChainElement,
	isGlobalBooleanCall,
	isNullishType,
	isSameIdentifier,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';

const MESSAGE_ID = 'no-useless-boolean-cast';
const messages = {
	[MESSAGE_ID]: '`Boolean()` is unnecessary in `Array#{{method}}()` callbacks.',
};

const isNullishOrVoidType = type =>
	type.intrinsicName === 'void' || isNullishType(type);

// When type information is available, the `Boolean()` cast is meaningful if the argument's type includes `null`/`undefined`/`void`, since removing it would widen the predicate's return type. Returns `false` when type information is unavailable, so it only ever keeps more casts than the syntactic check alone, never fewer.
function hasNullishOrVoidType(node, context) {
	return withTypeInformation(node, context, ({type}) => {
		const types = type.isUnion() ? type.types : [type];
		return types.some(type => isNullishOrVoidType(type));
	}) ?? false;
}

function isOptionalChainResult(node) {
	node = unwrapTypeScriptExpression(node);

	if (node?.type === 'ChainExpression') {
		return hasOptionalChainElement(node);
	}

	if (node?.type === 'LogicalExpression') {
		return node.operator === '&&'
			? isOptionalChainResult(node.left) || isOptionalChainResult(node.right)
			: isOptionalChainResult(node.right);
	}

	if (node?.type === 'ConditionalExpression') {
		return isOptionalChainResult(node.consequent) || isOptionalChainResult(node.alternate);
	}

	if (node?.type === 'SequenceExpression') {
		return isOptionalChainResult(node.expressions.at(-1));
	}

	return false;
}

const predicateMethods = [
	'every',
	'filter',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'some',
];

function getReturnedExpression(callback) {
	if (
		callback.async
		|| callback.generator
		|| callback.returnType
	) {
		return;
	}

	return getFunctionReturnExpression(callback);
}

const isBooleanFirstParameterCallback = (callback, argument) =>
	callback.params[0]?.type === 'Identifier'
	&& isSameIdentifier(callback.params[0], argument);

/**
@param {import('eslint').Rule.RuleContext} context
*/
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
		if (!isGlobalBooleanCall(booleanCall, context)) {
			return;
		}

		const [argument] = booleanCall.arguments;
		if (isBooleanFirstParameterCallback(callback, argument)) {
			return;
		}

		// `Boolean()` normalizes a possibly-`undefined` value, so it is not useless. Detect this syntactically via optional chaining, and, when type information is available, via the resolved type.
		if (
			isOptionalChainResult(argument)
			|| hasNullishOrVoidType(argument, context)
		) {
			return;
		}

		return getCommentSafeProblem(context, {
			node: booleanCall,
			messageId: MESSAGE_ID,
			data: {method: node.callee.property.name},
			fix: fixer => fixer.replaceText(
				booleanCall,
				callback.body === booleanCall
					? getConciseArrowBodyText(argument, context)
					: sourceCode.getText(argument),
			),
		});
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
