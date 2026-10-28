/* eslint-disable complexity */
import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	isNewExpression,
	isUndefinedValue,
} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getCallArgumentText,
	getParenthesizedRange,
	getVisitorChildNodes,
	isArray,
	isBigInt,
	isBoolean,
	isKnownNonNumber,
	isNumber,
	isString,
	isTypeScriptFile,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-math-min-max';
const SUGGESTION_ID = 'replace-with-math-min-max';
const messages = {
	[MESSAGE_ID]: 'Prefer `Math.{{method}}()` to simplify ternary expressions.',
	[SUGGESTION_ID]: 'Replace with `Math.{{method}}()`.',
};
const bigIntCheckOptions = {treatMixedUnionAsTarget: true};
const nonNumberExpressionTypes = new Set([
	'ObjectExpression',
	'NewExpression',
	'ArrowFunctionExpression',
	'FunctionExpression',
	'ClassExpression',
]);
const numberCheckOptions = {
	treatMixedUnionAsNonTarget: true,
	nonTargetTypeNames: new Set(['Date']),
	isNonTargetNode: (node, context) =>
		(node.type === 'Literal' && typeof node.value !== 'number')
		|| nonNumberExpressionTypes.has(node.type)
		|| isUndefinedValue(node)
		|| isString(node, context)
		|| isBoolean(node, context)
		|| isArray(node, context),
};

const isNumberTypeAnnotation = typeAnnotation =>
	typeAnnotation.type === 'TSNumberKeyword'
	|| (typeAnnotation.type === 'TSTypeAnnotation' && typeAnnotation.typeAnnotation.type === 'TSNumberKeyword')
	|| (typeAnnotation.type === 'TSTypeReference' && typeAnnotation.typeName.name === 'Number');

function unwrapNode(node) {
	if (
		[
			'TSAsExpression',
			'TSTypeAssertion',
			'TSNonNullExpression',
		].includes(node.type)
	) {
		return unwrapNode(node.expression);
	}

	return node;
}

// Only suggest simple operands, since the source can evaluate an operand twice where the rewrite evaluates it once. Reading a property off a plain object is the common case.
const simpleOperandTypes = new Set([
	'Identifier',
	'PrivateIdentifier',
	'Literal',
	'ThisExpression',
	'Super',
	'MemberExpression',
	'ChainExpression',
	'BinaryExpression',
	'LogicalExpression',
	'ConditionalExpression',
	'SequenceExpression',
	'UnaryExpression',
]);

// Construction expressions are outside the suggestion boundary, including functions with lazy bodies and classes with eager initializers.
const isSimpleOperand = (node, visitorKeys) => {
	node = unwrapTypeScriptExpression(node);

	if (!simpleOperandTypes.has(node.type)) {
		return false;
	}

	// Wrappers such as sequences evaluate their operands, so every child must stay within the same simple-expression boundary.
	for (const child of getVisitorChildNodes(node, visitorKeys)) {
		if (!isSimpleOperand(child, visitorKeys)) {
			return false;
		}
	}

	return true;
};

function getTypeAnnotation(node) {
	if (node.type === 'TSNonNullExpression') {
		return getTypeAnnotation(node.expression);
	}

	if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
		return node.typeAnnotation;
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('ConditionalExpression', /** @param {import('estree').ConditionalExpression} conditionalExpression */ conditionalExpression => {
		const {test, consequent, alternate} = conditionalExpression;

		if (test.type !== 'BinaryExpression') {
			return;
		}

		const {operator, left, right} = test;

		const hasBigInt = [left, right].some(node => isBigInt(node, context, bigIntCheckOptions));

		if (hasBigInt) {
			return;
		}

		const hasDate = [left, right].some(node => isNewExpression(node, {name: 'Date'}));

		if (hasDate) {
			return;
		}

		const [leftText, rightText, alternateText, consequentText] = [left, right, alternate, consequent].map(node => context.sourceCode.getText(unwrapNode(node)));

		const isGreaterOrEqual = operator === '>' || operator === '>=';
		const isLessOrEqual = operator === '<' || operator === '<=';

		let method;

		// Prefer `Math.min()`
		if (
			// `height > 50 ? 50 : height`
			(isGreaterOrEqual && leftText === alternateText && rightText === consequentText)
			// `height < 50 ? height : 50`
			|| (isLessOrEqual && leftText === consequentText && rightText === alternateText)
		) {
			method = 'min';
		} else if (
			// `height > 50 ? height : 50`
			(isGreaterOrEqual && leftText === consequentText && rightText === alternateText)
			// `height < 50 ? 50 : height`
			|| (isLessOrEqual && leftText === alternateText && rightText === consequentText)
		) {
			method = 'max';
		}

		if (!method) {
			return;
		}

		const scriptKind = context.sourceCode.parserServices?.esTreeNodeToTSNodeMap?.get(conditionalExpression)?.getSourceFile().scriptKind;
		// TypeScript's public `ScriptKind.TS` and `ScriptKind.TSX` values.
		const isTypeScript = isTypeScriptFile(context.physicalFilename) || scriptKind === 3 || scriptKind === 4;

		if ([left, right].some(node => isTypeScript
			? !isNumber(node, context)
			: isKnownNonNumber(node, context, numberCheckOptions))) {
			return;
		}

		for (const node of [left, right]) {
			const expressionNode = unwrapNode(node);
			const typeAnnotation = getTypeAnnotation(node);
			if (
				node !== expressionNode
				&& typeAnnotation
				&& !isNumberTypeAnnotation(typeAnnotation)
			) {
				return;
			}

			// Find variable declaration
			if (expressionNode.type === 'Identifier') {
				// The declaration can live in any enclosing scope, `findVariable()` walks them all
				const variable = findVariable(context.sourceCode.getScope(expressionNode), expressionNode);

				for (const definition of variable?.defs ?? []) {
					switch (definition.type) {
						case 'Parameter': {
							const identifier = definition.name;

							/**
							Capture the following statement

							```js
							function foo(a: number) {}
							```
							*/
							if (identifier.typeAnnotation?.type === 'TSTypeAnnotation' && !isNumberTypeAnnotation(identifier.typeAnnotation)) {
								return;
							}

							/**
							Capture the following statement

							```js
							function foo(a = 10) {}
							```
							*/
							if (
								identifier.parent.type === 'AssignmentPattern'
								&& (
									isKnownNonNumber(identifier.parent.right, context, numberCheckOptions)
									|| isBigInt(identifier.parent.right, context, bigIntCheckOptions)
								)
							) {
								return;
							}

							break;
						}

						case 'Variable': {
							/**
							@type {import('estree').VariableDeclarator}
							*/
							const variableDeclarator = definition.node;
							if (variableDeclarator.id !== definition.name) {
								break;
							}

							/**
							Capture the following statement

							```js
							var foo: number
							```
							*/
							if (variableDeclarator.id.typeAnnotation?.type === 'TSTypeAnnotation' && !isNumberTypeAnnotation(variableDeclarator.id.typeAnnotation)) {
								return;
							}

							/**
							Capture the following statement

							```js
							var foo = 10
							```
							*/
							if (
								variableDeclarator.init
								&& isKnownNonNumber(variableDeclarator.init, context, numberCheckOptions)
							) {
								return;
							}

							/**
							Capture the following statement

							```js
							var foo = BigInt(1)
							var foo = -1n
							```
							*/
							if (variableDeclarator.init && isBigInt(variableDeclarator.init, context, bigIntCheckOptions)) {
								return;
							}

							/**
							Capture the following statement

							```js
							var foo = new Date()
							```
							*/
							if (isNewExpression(variableDeclarator.init, {name: 'Date'})) {
								return;
							}

							break;
						}

						default:
					}
				}
			}
		}

		const problem = {
			node: conditionalExpression,
			messageId: MESSAGE_ID,
			data: {method},
		};

		/*
		The replacement is rebuilt from both operands, so a comment between them would be lost. The same operand is written on both sides of the comparison, so the source evaluates it twice and `Math.min()`/`Math.max()` only once. That is only the same when reading the operand has no effect.
		Even number operands differ for `NaN` and signed zero, so only offer a suggestion.
		*/
		if (
			!wouldRemoveComments(context, conditionalExpression, [left, right].map(node => getParenthesizedRange(node, context)))
			&& [left, right].every(node => isSimpleOperand(node, context.sourceCode.visitorKeys) && !hasSideEffect(node, context.sourceCode))
		) {
			problem.suggest = [{
				messageId: SUGGESTION_ID,
				data: {method},
				/**
				@param {import('eslint').Rule.RuleFixer} fixer
				*/
				* fix(fixer) {
					yield fixSpaceAroundKeyword(fixer, conditionalExpression, context);

					const argumentsText = [left, right]
						.map(node => getCallArgumentText(node, context))
						.join(', ');

					yield fixer.replaceText(conditionalExpression, `Math.${method}(${argumentsText})`);
				},
			}];
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prefer `Math.min()` and `Math.max()` over ternaries for simple comparisons.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
