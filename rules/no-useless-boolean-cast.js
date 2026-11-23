import {getStaticStringValue, isMethodCall} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getCommentSafeProblem,
	getConciseArrowBodyText,
	getEnclosingFunction,
	getFunctionReturnExpression,
	getJSDocumentReturnType,
	getParenthesizedRange,
	getParenthesizedText,
	hasJavaScriptTypeAnnotations,
	hasJSDocumentExpressionType,
	hasOptionalChainElement,
	isBoolean,
	isGlobalBooleanCall,
	isNullishType,
	isSameIdentifier,
	isTypeScriptFile,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';

const MESSAGE_ID = 'no-useless-boolean-cast';
const SUGGESTION_ID = 'remove-double-negation';
const messages = {
	[MESSAGE_ID]: '`{{cast}}` is unnecessary in `Array#{{method}}()` callbacks.',
	[SUGGESTION_ID]: 'Remove the double negation.',
};

const isNullishOrVoidType = type =>
	type.intrinsicName === 'void' || isNullishType(type);

// The cast preserves a boolean return for nullish operands. A type parameter can be nullish through its constraint.
function hasNullishOrVoidType(node, context) {
	return withTypeInformation(node, context, ({type, checker}) => {
		const constraint = checker.getBaseConstraintOfType(type) ?? type;
		const types = constraint.isUnion() ? constraint.types : [constraint];
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

const predicateMethods = new Set([
	'every',
	'filter',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'some',
]);

function getPredicateMethod(call) {
	if (!isMethodCall(call, {minimumArguments: 1, maximumArguments: 2})) {
		return;
	}

	const {computed, property} = call.callee;
	const method = !computed && property.type === 'Identifier' ? property.name : getStaticStringValue(property);
	if (predicateMethods.has(method)) {
		return method;
	}
}

function getBooleanCallArgument(call, callback, cast, context) {
	if (
		callback.returnType
		|| call.optional
		|| call.callee.optional
		|| call.callee.computed
		|| getFunctionReturnExpression(callback) !== cast
		|| !isGlobalBooleanCall(cast, context)
	) {
		return;
	}

	const [argument] = cast.arguments;
	if (callback.params[0]?.type === 'Identifier' && isSameIdentifier(callback.params[0], argument)) {
		return;
	}

	return argument;
}

const isNegation = node => node?.type === 'UnaryExpression' && node.operator === '!';

function hasBooleanResult(argument, context) {
	return isBoolean(argument, context)
		&& (withTypeInformation(argument, context, ({type, checker}) => checker.isTypeAssignableTo(type, checker.getBooleanType()))
			?? ['BinaryExpression', 'Literal', 'UnaryExpression'].includes(argument.type));
}

function getTypeCheckedEdit(callback, argument, context) {
	const {parserServices} = context.sourceCode;
	return withTypeInformation(callback.parent, context, ({checker}) => {
		const typeScriptCallback = parserServices.esTreeNodeToTSNodeMap.get(callback);
		const signatures = checker.getContextualType(typeScriptCallback)?.getCallSignatures();
		if (!signatures?.length) {
			return;
		}

		const argumentType = parserServices.getTypeAtLocation(argument);
		let edit = 'fix';
		for (const signature of signatures) {
			if (checker.getTypePredicateOfSignature(signature)) {
				// An inferred predicate requires the intrinsic boolean type, even when a different type is assignable to boolean.
				if (argumentType !== checker.getBooleanType()) {
					edit = 'suggest';
				}
			} else if (!checker.isTypeAssignableTo(argumentType, checker.getReturnTypeOfSignature(signature))) {
				return 'keep';
			}
		}

		return edit;
	});
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const needsTypeReview = isTypeScriptFile(context.physicalFilename)
		|| Boolean(sourceCode.parserServices?.esTreeNodeToTSNodeMap)
		|| hasJavaScriptTypeAnnotations(context);

	function getDoubleNegationEdit(callback, argument, method) {
		if (
			callback.returnType
			|| getJSDocumentReturnType(callback, context)
			|| hasJSDocumentExpressionType(callback, context)
		) {
			return hasBooleanResult(argument, context) ? 'fix' : 'keep';
		}

		// Without a signature, these methods accept any return value without narrowing.
		const edit = getTypeCheckedEdit(callback, argument, context) ?? (
			!needsTypeReview || method === 'some' || method === 'findLastIndex' || hasBooleanResult(argument, context)
				? 'fix'
				: 'suggest'
		);

		// Explicit type arguments select the predicate overload without an ordinary overload to fall back to.
		return edit === 'suggest' && callback.parent.typeArguments ? 'keep' : edit;
	}

	function getProblem(callback, cast) {
		const call = callback?.parent;
		const method = getPredicateMethod(call);
		if (
			!method
			|| callback.async
			|| callback.generator
			|| call.arguments[0] !== callback
		) {
			return;
		}

		const isDoubleNegation = isNegation(cast) && isNegation(cast.argument);
		const argument = isDoubleNegation ? cast.argument.argument : getBooleanCallArgument(call, callback, cast, context);
		if (!argument) {
			return;
		}

		// The cast normalizes a possibly-`undefined` value, so it is not useless. Detect this syntactically via optional chaining, and, when type information is available, via the resolved type.
		if (
			isOptionalChainResult(argument)
			|| hasNullishOrVoidType(argument, context)
		) {
			return;
		}

		const edit = isDoubleNegation ? getDoubleNegationEdit(callback, argument, method) : 'fix';
		if (edit === 'keep') {
			return;
		}

		const fix = function * (fixer) {
			let text;
			if (callback.body === cast) {
				text = getConciseArrowBodyText(argument, context);
			} else {
				text = isDoubleNegation ? getParenthesizedText(argument, context) : sourceCode.getText(argument);
			}

			yield fixer.replaceText(cast, text);
			if (isDoubleNegation) {
				yield fixSpaceAroundKeyword(fixer, cast, context);
			}
		};

		return getCommentSafeProblem(context, {
			node: cast,
			messageId: MESSAGE_ID,
			data: {cast: isDoubleNegation ? '!!' : 'Boolean()', method},
			...edit === 'fix' ? {fix} : {suggest: [{messageId: SUGGESTION_ID, fix}]},
		}, cast, isDoubleNegation ? [getParenthesizedRange(argument, context)] : []);
	}

	context.on('ArrowFunctionExpression', callback => getProblem(callback, callback.body));
	context.on('ReturnStatement', node => getProblem(getEnclosingFunction(node), node.argument));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary `Boolean()` and `!!` casts in array predicate callbacks.',
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
