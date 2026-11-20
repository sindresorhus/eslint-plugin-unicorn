import {getFunctionHeadLocation, getFunctionNameWithKind} from '@eslint-community/eslint-utils';
import {functionTypes} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getFunctionReturnExpression,
	getOutermostTypeScriptExpression,
	hasFunctionJSDocumentComment,
	hasJSDocumentExpressionType,
	hasTypeScriptTypeAssertion,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-native-coercion-functions';
const MESSAGE_ID_SUGGESTION = 'prefer-native-coercion-functions/suggestion';
const messages = {
	[MESSAGE_ID]: '{{functionNameWithKind}} is equivalent to `{{replacementFunction}}`. Use `{{replacementFunction}}` directly.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacementFunction}}`.',
};

const nativeCoercionFunctionNames = new Set(['String', 'Number', 'BigInt', 'Boolean', 'Symbol']);
const arrayMethodsWithBooleanCallback = new Set(['every', 'filter', 'find', 'findLast', 'findIndex', 'findLastIndex', 'some']);

const isNativeCoercionFunctionCall = (node, firstArgumentName) =>
	node?.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'Identifier'
	&& nativeCoercionFunctionNames.has(node.callee.name)
	&& node.arguments[0]?.type === 'Identifier'
	&& node.arguments[0].name === firstArgumentName;

// `v => v` or `function (v) {return v;}`, with TypeScript expression wrappers around the value removed
const isIdentityFunction = node => {
	const returnedExpression = unwrapTypeScriptExpression(getFunctionReturnExpression(node));
	return returnedExpression?.type === 'Identifier'
		&& returnedExpression.name === node.params[0].name;
};

const isArrayIdentityCallback = node =>
	isIdentityFunction(node)
	&& node.parent.type === 'CallExpression'
	&& !node.parent.optional
	&& node.parent.arguments[0] === node
	&& node.parent.callee.type === 'MemberExpression'
	&& !node.parent.callee.computed
	&& !node.parent.callee.optional
	&& node.parent.callee.property.type === 'Identifier'
	&& arrayMethodsWithBooleanCallback.has(node.parent.callee.property.name);

const isTypeScriptTypePredicateFunction = node =>
	node.returnType?.type === 'TSTypeAnnotation'
	&& node.returnType.typeAnnotation.type === 'TSTypePredicate';

function getArrayCallbackProblem(node) {
	if (!isArrayIdentityCallback(node)) {
		return;
	}

	return {
		replacementFunction: 'Boolean',
		fix: fixer => fixer.replaceText(node, 'Boolean'),
	};
}

// The tokens that would continue the expression the replacement ends with. A regular expression is matched on its type, since its `value` is the whole literal.
const expressionContinuingTokens = new Set(['(', '[', '+', '-']);
const expressionContinuingTokenTypes = new Set(['RegularExpression', 'Template']);

// The replacement ends with a bare identifier, so a `(`, `[`, `+`, `-`, regular expression, or template that ASI separated from the function on the next line would be absorbed into it. A token inside the parent already belongs to the same expression, like the arguments of a called function expression, so it keeps its meaning.
const needsSemicolonAfter = (node, sourceCode) => {
	const nextToken = sourceCode.getTokenAfter(node);
	return nextToken !== null
		&& sourceCode.getRange(nextToken)[0] >= sourceCode.getRange(node.parent)[1]
		&& (
			expressionContinuingTokens.has(nextToken.value)
			|| expressionContinuingTokenTypes.has(nextToken.type)
		);
};

function hasExplicitTypeContext(node, context) {
	if (hasFunctionJSDocumentComment(node, context)) {
		return true;
	}

	// An explicit type on a literal can supply the signatures of functions inside it.
	while (getOutermostTypeScriptExpression(node) === node) {
		const {parent} = node;
		if (parent.type === 'ArrayExpression') {
			node = parent;
		} else if (parent.type === 'Property' && parent.value === node && parent.parent.type === 'ObjectExpression') {
			node = parent.parent;
		} else {
			return false;
		}

		if (hasJSDocumentExpressionType(node, context)) {
			return true;
		}
	}

	return true;
}

function getCoercionFunctionProblem(node, context) {
	// `v => String(v)`
	const returnedExpression = getFunctionReturnExpression(node);
	const callExpression = unwrapTypeScriptExpression(returnedExpression);
	const [parameter] = node.params;

	// Replacing the wrapper can discard its declared signature.
	if (
		!isNativeCoercionFunctionCall(callExpression, parameter.name)
		|| parameter.typeAnnotation
		|| parameter.optional
		|| node.returnType
		|| node.typeParameters
		|| hasTypeScriptTypeAssertion(returnedExpression)
		|| hasExplicitTypeContext(node, context)
	) {
		return;
	}

	const {name} = callExpression.callee;

	const problem = {replacementFunction: name};

	if (node.type === 'FunctionDeclaration' || callExpression.arguments.length !== 1) {
		return problem;
	}

	/**
	@param {import('eslint').Rule.RuleFixer} fixer
	*/
	problem.fix = function * (fixer) {
		let text = name;

		if (
			node.parent.type === 'Property'
			&& node.parent.method
			&& node.parent.value === node
		) {
			text = `: ${text}`;
		} else if (node.parent.type === 'MethodDefinition') {
			text = ` = ${text};`;
		} else if (needsSemicolonAfter(node, context.sourceCode)) {
			text += ';';
		}

		yield fixer.replaceText(node, text);
		yield fixSpaceAroundKeyword(fixer, node, context);
	};

	return problem;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on(functionTypes, node => {
		if (
			node.async
			|| node.generator
			|| isTypeScriptTypePredicateFunction(node)
			|| node.params.length === 0
			|| node.params[0].type !== 'Identifier'
			|| (
				(
					(
						node.parent.type === 'MethodDefinition'
						&& (node.parent.kind === 'constructor' || node.parent.kind === 'set')
					)
					|| (node.parent.type === 'Property' && node.parent.kind === 'set')
				)
				&& node.parent.value === node
			)
		) {
			return;
		}

		let problem = getArrayCallbackProblem(node) || getCoercionFunctionProblem(node, context);

		if (!problem) {
			return;
		}

		const {sourceCode} = context;
		const {replacementFunction, fix} = problem;

		problem = {
			node,
			loc: getFunctionHeadLocation(node, sourceCode),
			messageId: MESSAGE_ID,
			data: {
				functionNameWithKind: getFunctionNameWithKind(node, sourceCode),
				replacementFunction,
			},
		};

		const {parent} = node;
		if (parent.type === 'UnaryExpression' && parent.operator === 'delete') {
			return problem;
		}

		/*
		We do not fix if there are:
		- Comments: No proper place to put them.
		- Extra parameters: Removing them may break types.
		*/
		if (!fix || node.params.length !== 1 || sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		// Rewriting a class method into a class field moves it off the prototype, which changes property lookup, enumerability and `super` dispatch, so that can only be a suggestion.
		if (parent.type === 'MethodDefinition') {
			problem.suggest = [
				{messageId: MESSAGE_ID_SUGGESTION, data: {replacementFunction}, fix},
			];

			return problem;
		}

		problem.fix = fix;

		return problem;
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
			description: 'Prefer using `String`, `Number`, `BigInt`, `Boolean`, and `Symbol` directly.',
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
