import {fixSpaceAroundKeyword} from './fix/index.js';
import {arrayMethodsWithTypePredicates, getArrayPredicateMethod} from './shared/array-predicate-methods.js';
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
	hasTypeArguments,
	isArray,
	isBoolean,
	isGlobalBooleanCall,
	isKnownNonIndexedCollection,
	isNullishType,
	isSameIdentifier,
	isTypeScriptFile,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';

const MESSAGE_ID = 'no-useless-boolean-cast';
const SUGGESTION_ID = 'remove-boolean-cast';
const messages = {
	[MESSAGE_ID]: '`{{cast}}` is unnecessary in `Array#{{method}}()` callbacks.',
	[SUGGESTION_ID]: 'Remove the boolean cast.',
};

const isNullishOrVoidType = type =>
	type.intrinsicName === 'void' || isNullishType(type);

// The cast preserves a boolean return for nullish operands. A type parameter can be nullish through its constraint.
function hasNullishOrVoidType(node, context) {
	return withTypeInformation(node, context, ({type, checker}) => {
		const types = type.isUnion() ? type.types : [type];
		return types.some(type => {
			const constraint = checker.getBaseConstraintOfType(type) ?? type;
			const constraintTypes = constraint.isUnion() ? constraint.types : [constraint];
			return constraintTypes.some(type => isNullishOrVoidType(type));
		});
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

const isNegation = node => node?.type === 'UnaryExpression' && node.operator === '!';

function getCastArgument(callback, cast, context) {
	if (isNegation(cast) && isNegation(cast.argument)) {
		return cast.argument.argument;
	}

	// A type argument to `Boolean()` can supply a contextual type to the operand.
	if (!isGlobalBooleanCall(cast, context) || hasTypeArguments(cast)) {
		return;
	}

	const [argument] = cast.arguments;
	// Leave simple `value => Boolean(value)` wrappers to `prefer-native-coercion-functions`.
	if (
		callback.params[0]?.type === 'Identifier'
		&& isSameIdentifier(callback.params[0], argument)
		&& getFunctionReturnExpression(callback) === cast
	) {
		return;
	}

	return argument;
}

function hasBooleanResult(argument, context) {
	return isBoolean(argument, context)
		&& (withTypeInformation(argument, context, ({type, checker}) => checker.isTypeAssignableTo(type, checker.getBooleanType()))
			?? ['BinaryExpression', 'Literal', 'UnaryExpression'].includes(argument.type));
}

function getTypeCheckedEdit(callback, argument, canChangePredicate, context) {
	const {parserServices} = context.sourceCode;
	return withTypeInformation(callback.parent, context, ({checker}) => {
		const typeScriptCallback = parserServices.esTreeNodeToTSNodeMap.get(callback);
		const signatures = checker.getContextualType(typeScriptCallback)?.getCallSignatures();
		if (!signatures?.length) {
			return;
		}

		const argumentType = parserServices.getTypeAtLocation(argument);
		const booleanType = checker.getBooleanType();
		let edit = canChangePredicate && argumentType === booleanType ? 'suggest' : 'fix';
		for (const signature of signatures) {
			if (checker.getTypePredicateOfSignature(signature)) {
				// Predicate inference can depend on both the intrinsic boolean type and the control flow before the return.
				if (argumentType !== booleanType || !getFunctionReturnExpression(callback)) {
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

	function getCastEdit(callback, cast, argument, method) {
		if (
			hasJSDocumentExpressionType(callback, context)
			|| hasJSDocumentExpressionType(cast, context)
		) {
			return 'keep';
		}

		if (callback.returnType || getJSDocumentReturnType(callback, context)) {
			return hasBooleanResult(argument, context) ? 'fix' : 'keep';
		}

		const supportsTypePredicates = arrayMethodsWithTypePredicates.has(method);
		// Removing a `Boolean()` call or changing a return after earlier statements can change predicate inference.
		const canChangePredicate = supportsTypePredicates
			&& (cast.type === 'CallExpression' || !getFunctionReturnExpression(callback));
		const call = callback.parent;
		let edit = getTypeCheckedEdit(callback, argument, canChangePredicate, context);
		if (edit === undefined && needsTypeReview) {
			const booleanArgument = hasBooleanResult(argument, context);
			// Typed-array `find` and `findIndex` require boolean callbacks in TypeScript.
			if (!booleanArgument && (method === 'find' || method === 'findIndex') && !isArray(call.callee.object, context)) {
				return 'keep';
			}

			if (supportsTypePredicates && (canChangePredicate || !booleanArgument)) {
				edit = 'suggest';
			}
		}

		// Explicit type arguments select the predicate overload without an ordinary overload to fall back to.
		return edit === 'suggest' && hasTypeArguments(call) ? 'keep' : (edit ?? 'fix');
	}

	function getProblem(callback, cast) {
		const method = getArrayPredicateMethod(callback);
		if (!method || callback.async || callback.generator) {
			return;
		}

		const argument = getCastArgument(callback, cast, context);
		if (!argument || isKnownNonIndexedCollection(callback.parent.callee.object, context)) {
			return;
		}

		// The cast normalizes a possibly-`undefined` value, so it is not useless. Detect this syntactically via optional chaining, and, when type information is available, via the resolved type.
		if (
			isOptionalChainResult(argument)
			|| hasNullishOrVoidType(argument, context)
		) {
			return;
		}

		const edit = getCastEdit(callback, cast, argument, method);
		if (edit === 'keep') {
			return;
		}

		const fix = function * (fixer) {
			yield fixer.replaceText(
				cast,
				callback.body === cast
					? getConciseArrowBodyText(argument, context)
					: getParenthesizedText(argument, context),
			);
			yield fixSpaceAroundKeyword(fixer, cast, context);
		};

		return getCommentSafeProblem(context, {
			node: cast,
			messageId: MESSAGE_ID,
			data: {cast: cast.type === 'CallExpression' ? 'Boolean()' : '!!', method},
			...edit === 'fix' ? {fix} : {suggest: [{messageId: SUGGESTION_ID, fix}]},
		}, cast, [getParenthesizedRange(argument, context)]);
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
