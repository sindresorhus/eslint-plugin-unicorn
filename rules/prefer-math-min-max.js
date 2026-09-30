/* eslint-disable complexity */
import {findVariable} from '@eslint-community/eslint-utils';
import {isBigIntLiteral, isCallExpression, isNewExpression} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {getChildNodes, isBigInt} from './utils/index.js';

const MESSAGE_ID = 'prefer-math-min-max';
const messages = {
	[MESSAGE_ID]: 'Prefer `Math.{{method}}()` to simplify ternary expressions.',
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

// Any of these can run code or write, and the source runs it twice where the rewrite runs it once. A member access is left alone, reading a property off a plain object is the common case.
const effectfulOperandTypes = new Set([
	'AssignmentExpression',
	'AwaitExpression',
	'CallExpression',
	'ImportExpression',
	'NewExpression',
	'TaggedTemplateExpression',
	'UpdateExpression',
	'YieldExpression',
]);

// A function or class body does not run where it is written, only the reference is created
const lazilyEvaluatedTypes = new Set([
	'ArrowFunctionExpression',
	'ClassDeclaration',
	'ClassExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);

const isEffectFreeOperand = node => {
	node = unwrapNode(node);

	if (effectfulOperandTypes.has(node.type)) {
		return false;
	}

	if (node.type === 'TemplateLiteral') {
		return node.expressions.length === 0;
	}

	if (lazilyEvaluatedTypes.has(node.type)) {
		return true;
	}

	// A wrapper like a sequence, array or object evaluates its own operands, an effect hidden in one of them still runs twice in the source and once in the rewrite
	for (const child of getChildNodes(node)) {
		if (!isEffectFreeOperand(child)) {
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

		const hasBigInt = [left, right].some(node =>
			isBigIntLiteral(node)
			|| isCallExpression(node, {
				name: 'BigInt',
				argumentsLength: 1,
				optional: false,
			}));

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
									(identifier.parent.right.type === 'Literal' && typeof identifier.parent.right.value !== 'number')
									|| isBigInt(identifier.parent.right, context)
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
							if (variableDeclarator.init?.type === 'Literal' && typeof variableDeclarator.init.value !== 'number') {
								return;
							}

							/**
							Capture the following statement

							```js
							var foo = BigInt(1)
							var foo = -1n
							```
							*/
							if (variableDeclarator.init && isBigInt(variableDeclarator.init, context)) {
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
		*/
		if (
			context.sourceCode.getCommentsInside(conditionalExpression).length === 0
			&& isEffectFreeOperand(left)
			&& isEffectFreeOperand(right)
		) {
			/**
			@param {import('eslint').Rule.RuleFixer} fixer
			*/
			problem.fix = function * (fixer) {
				const {sourceCode} = context;

				yield fixSpaceAroundKeyword(fixer, conditionalExpression, context);

				const argumentsText = [left, right]
					.map(node => node.type === 'SequenceExpression' ? `(${sourceCode.getText(node)})` : sourceCode.getText(node))
					.join(', ');

				yield fixer.replaceText(conditionalExpression, `Math.${method}(${argumentsText})`);
			};
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
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
