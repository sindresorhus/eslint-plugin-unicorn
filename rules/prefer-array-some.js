import {checkVueTemplate} from './utils/rule.js';
import {
	isBooleanExpression,
	isControlFlowTest,
	getParenthesizedRange,
	hasCommentInRange,
	isArray,
	isKnownNonArray,
	isNodeValueNotFunction,
} from './utils/index.js';
import {removeMemberExpressionProperty} from './fix/index.js';
import {
	isLiteral,
	isNullLiteral,
	isUndefined,
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';

const ERROR_ID_ARRAY_SOME = 'some';
const SUGGESTION_ID_ARRAY_SOME = 'some-suggestion';
const ERROR_ID_ARRAY_FILTER = 'filter';
const messages = {
	[ERROR_ID_ARRAY_SOME]: 'Prefer `.some(…)` over `.{{method}}(…)`.',
	[SUGGESTION_ID_ARRAY_SOME]: 'Replace `.{{method}}(…)` with `.some(…)`.',
	[ERROR_ID_ARRAY_FILTER]: 'Prefer `.some(…)` over non-zero length check from `.filter(…)`.',
};

const isCheckingUndefined = node =>
	node.parent.type === 'BinaryExpression'
	// Not checking yoda expression `null != foo.find()` and `undefined !== foo.find()
	&& node.parent.left === node
	&& (
		(
			(
				[
					'!=',
					'==',
					'===',
					'!==',
				].includes(node.parent.operator)
			)
			&& isUndefined(node.parent.right)
		)
		|| (
			(
				node.parent.operator === '!='
				|| node.parent.operator === '=='
			)
			&& isNullLiteral(node.parent.right)
		)
	);
const isNegativeOne = node => node.type === 'UnaryExpression' && node.operator === '-' && node.argument && node.argument.type === 'Literal' && node.argument.value === 1;
const isLiteralZero = node => isLiteral(node, 0);

function isFindResultVariableUsedOnlyAsBoolean(callExpression, context) {
	if (!isArray(callExpression.callee.object, context)) {
		return false;
	}

	const variableDeclarator = callExpression.parent;

	if (
		variableDeclarator.type !== 'VariableDeclarator'
		|| variableDeclarator.init !== callExpression
		|| variableDeclarator.id.type !== 'Identifier'
		|| variableDeclarator.id.typeAnnotation
		|| variableDeclarator.parent.type !== 'VariableDeclaration'
		|| variableDeclarator.parent.kind !== 'const'
		|| (
			variableDeclarator.parent.parent.type === 'ExportNamedDeclaration'
			&& variableDeclarator.parent.parent.declaration === variableDeclarator.parent
		)
	) {
		return false;
	}

	const [variable] = context.sourceCode.getDeclaredVariables(variableDeclarator);

	if (
		!variable
		|| variable.identifiers.length !== 1
		|| variable.identifiers[0] !== variableDeclarator.id
	) {
		return false;
	}

	const references = variable.references.filter(reference => !reference.init);
	if (references.length === 0) {
		return false;
	}

	return references.every(reference => {
		const {identifier} = reference;

		return reference.isRead() && (isBooleanExpression(identifier, context) || isControlFlowTest(identifier));
	});
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	// `.find(…)`
	// `.findLast(…)`
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: ['find', 'findLast'],
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		if (callExpression.typeArguments || callExpression.typeParameters) {
			return;
		}

		if (isKnownNonArray(callExpression.callee.object, context)) {
			return;
		}

		const isCompare = isCheckingUndefined(callExpression);
		if (
			!isCompare
			&& !(
				isBooleanExpression(callExpression, context)
				|| isControlFlowTest(callExpression)
				|| isFindResultVariableUsedOnlyAsBoolean(callExpression, context)
			)
		) {
			return;
		}

		const methodNode = callExpression.callee.property;

		// Removing the comparison would drop comments between the call and the end of the comparison.
		const wouldDropComments = isCompare
			&& hasCommentInRange(context, [
				getParenthesizedRange(callExpression, context)[1],
				context.sourceCode.getRange(callExpression.parent)[1],
			]);

		return {
			node: methodNode,
			messageId: ERROR_ID_ARRAY_SOME,
			data: {method: methodNode.name},
			suggest: wouldDropComments
				? undefined
				: [
					{
						messageId: SUGGESTION_ID_ARRAY_SOME,
						* fix(fixer) {
							yield fixer.replaceText(methodNode, 'some');

							if (!isCompare) {
								return;
							}

							const {sourceCode} = context;
							const parenthesizedRange = getParenthesizedRange(callExpression, context);
							yield fixer.removeRange([parenthesizedRange[1], sourceCode.getRange(callExpression.parent)[1]]);

							if (callExpression.parent.operator === '!=' || callExpression.parent.operator === '!==') {
								return;
							}

							yield fixer.insertTextBeforeRange(parenthesizedRange, '!');
						},
					},
				],
		};
	});

	// These operators also used in `prefer-includes`, try to reuse the code in future
	// `.{findIndex,findLastIndex}(…) !== -1`
	// `.{findIndex,findLastIndex}(…) != -1`
	// `.{findIndex,findLastIndex}(…) > -1`
	// `.{findIndex,findLastIndex}(…) === -1`
	// `.{findIndex,findLastIndex}(…) == -1`
	// `.{findIndex,findLastIndex}(…) >= 0`
	// `.{findIndex,findLastIndex}(…) < 0`
	context.on('BinaryExpression', binaryExpression => {
		const {left, right, operator} = binaryExpression;

		if (!(
			isMethodCall(left, {
				methods: ['findIndex', 'findLastIndex'],
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& (
				(['!==', '!=', '>', '===', '=='].includes(operator) && isNegativeOne(right))
				|| (['>=', '<'].includes(operator) && isLiteralZero(right))
			)
		)) {
			return;
		}

		if (isKnownNonArray(left.callee.object, context)) {
			return;
		}

		const methodNode = left.callee.property;
		return {
			node: methodNode,
			messageId: ERROR_ID_ARRAY_SOME,
			data: {method: methodNode.name},
			* fix(fixer, {abort}) {
				const {sourceCode} = context;
				const operatorToken = sourceCode.getTokenAfter(
					left,
					token => token.type === 'Punctuator' && token.value === operator,
				);
				const [start] = sourceCode.getRange(operatorToken);
				const [, end] = sourceCode.getRange(binaryExpression);

				// Removing the comparison would drop comments in the removed range.
				if (hasCommentInRange(context, [start, end])) {
					return abort();
				}

				if (['===', '==', '<'].includes(operator)) {
					yield fixer.insertTextBefore(binaryExpression, '!');
				}

				yield fixer.replaceText(methodNode, 'some');

				yield fixer.removeRange([start, end]);
			},
		};
	});

	// `.filter(…).length > 0`
	// `.filter(…).length !== 0`
	context.on('BinaryExpression', binaryExpression => {
		if (!(
			// We assume the user already follows `unicorn/explicit-length-check`. These are allowed in that rule.
			(binaryExpression.operator === '>' || binaryExpression.operator === '!==')
			&& binaryExpression.right.type === 'Literal'
			&& binaryExpression.right.raw === '0'
			&& isMemberExpression(binaryExpression.left, {property: 'length', optional: false})
			&& isMethodCall(binaryExpression.left.object, {
				method: 'filter',
				optionalCall: false,
				optionalMember: false,
			})
		)) {
			return;
		}

		const filterCall = binaryExpression.left.object;
		const filterCallObject = filterCall.callee.object;
		if (
			isKnownNonArray(filterCallObject, context)
			|| (
				filterCallObject.type === 'Identifier'
				&& filterCallObject.name.startsWith('$')
			)
		) {
			return;
		}

		const [firstArgument] = filterCall.arguments;
		if (!firstArgument || isNodeValueNotFunction(firstArgument)) {
			return;
		}

		const filterProperty = filterCall.callee.property;
		return {
			node: filterProperty,
			messageId: ERROR_ID_ARRAY_FILTER,
			* fix(fixer, {abort}) {
				const {sourceCode} = context;
				const lengthNode = binaryExpression.left;

				// Removing `.length > 0` would drop comments in the removed range.
				if (hasCommentInRange(context, [
					getParenthesizedRange(filterCall, context)[1],
					sourceCode.getRange(binaryExpression)[1],
				])) {
					return abort();
				}

				// `.filter` to `.some`
				yield fixer.replaceText(filterProperty, 'some');

				/*
					Remove `.length`
					`(( (( array.filter() )).length )) > (( 0 ))`
					------------------------^^^^^^^
				*/
				yield removeMemberExpressionProperty(fixer, lengthNode, context);

				/*
					Remove `> 0`
					`(( (( array.filter() )).length )) > (( 0 ))`
					----------------------------------^^^^^^^^^^
				*/
				yield fixer.removeRange([
					getParenthesizedRange(lengthNode, context)[1],
					sourceCode.getRange(binaryExpression)[1],
				]);

				// The `BinaryExpression` always ends with a number or `)`, no need check for ASI
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.some(…)` over `.filter(…).length` check and `.{find,findLast,findIndex,findLastIndex}(…)`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		hasSuggestions: true,
		languages: [
			'js/js',
		],
	},
};

export default config;
