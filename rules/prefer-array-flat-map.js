import {
	getParenthesizedText,
	hasOptionalChainElement,
	isKnownNonArray,
	isNodeMatches,
	isParenthesized,
	isSameIdentifier,
	shouldAddParenthesesToMemberExpressionObject,
	shouldSkipKnownNonArrayReceiver,
	wouldRemoveComments,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';
import {removeMethodCall} from './fix/index.js';

const MESSAGE_ID = 'prefer-array-flat-map';
const MESSAGE_ID_FILTER_FLAT_MAP = 'prefer-array-flat-map/filter-flat-map';
const SUGGESTION_ID_FILTER_FLAT_MAP = 'prefer-array-flat-map/filter-flat-map-suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `.flatMap(…)` over `.map(…).flat()`.',
	[MESSAGE_ID_FILTER_FLAT_MAP]: 'Prefer a single `.flatMap(…)` over `.filter(…).flatMap(…)`.',
	[SUGGESTION_ID_FILTER_FLAT_MAP]: 'Replace `.filter(…).flatMap(…)` with a single `.flatMap(…)`.',
};

const ignored = ['React.Children', 'Children'];

const conditionalTestExpressionTypesRequiringParentheses = new Set([
	'ArrowFunctionExpression',
	'AssignmentExpression',
	'ClassExpression',
	'ConditionalExpression',
	'FunctionExpression',
	'ObjectExpression',
	'SequenceExpression',
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
	'YieldExpression',
]);

const hasTypeArguments = node => node.typeArguments || node.typeParameters;

const isSimpleUntypedSingleParameterArrowCallback = node =>
	node.type === 'ArrowFunctionExpression'
	&& !node.async
	&& !node.returnType
	&& !node.typeParameters
	&& node.params.length === 1
	&& node.params[0].type === 'Identifier'
	&& !node.params[0].optional
	&& !node.params[0].typeAnnotation
	&& node.body.type !== 'BlockStatement';

const canArrayExpressionReturnMultipleItems = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length > 1;

function getConditionalTestText(node, context) {
	if (isParenthesized(node, context)) {
		return getParenthesizedText(node, context);
	}

	const text = context.sourceCode.getText(node);
	return conditionalTestExpressionTypesRequiringParentheses.has(node.type) ? `(${text})` : text;
}

function getMemberExpressionObjectText(node, context) {
	if (isParenthesized(node, context)) {
		return getParenthesizedText(node, context);
	}

	const text = context.sourceCode.getText(node);
	return shouldAddParenthesesToMemberExpressionObject(node, context) ? `(${text})` : text;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!(
			isMethodCall(callExpression, {
				method: 'flat',
				optionalCall: false,
				optionalMember: false,
			})
			&& (
				callExpression.arguments.length === 0
				|| (
					callExpression.arguments.length === 1
					&& callExpression.arguments[0].type === 'Literal'
					&& callExpression.arguments[0].raw === '1'
				)
			)
			&& isMethodCall(callExpression.callee.object, {
				method: 'map',
				optionalCall: false,
			})
		)) {
			return;
		}

		const flatCallExpression = callExpression;
		const mapCallExpression = flatCallExpression.callee.object;
		if (
			isNodeMatches(mapCallExpression.callee.object, ignored)
			|| shouldSkipKnownNonArrayReceiver(mapCallExpression.callee.object, context)
		) {
			return;
		}

		const {sourceCode} = context;
		const mapProperty = mapCallExpression.callee.property;
		// Renaming `.map` to `.flatMap` keeps the call's type arguments (now wrong for `flatMap`),
		// and removing `.flat()` would drop its type arguments — skip the fix in either case.
		const fix = (
			wouldRemoveComments(context, flatCallExpression, [mapCallExpression])
			|| hasTypeArguments(flatCallExpression)
			|| hasTypeArguments(mapCallExpression)
		)
			? undefined
			: function * (fixer) {
				// Removes:
				//   map(…).flat();
				//         ^^^^^^^
				//   (map(…)).flat();
				//           ^^^^^^^
				yield removeMethodCall(fixer, flatCallExpression, context);

				// Renames:
				//   map(…).flat();
				//   ^^^
				//   (map(…)).flat();
				//    ^^^
				yield fixer.replaceText(mapProperty, 'flatMap');
			};

		return {
			node: flatCallExpression,
			loc: {
				start: sourceCode.getLoc(mapProperty).start,
				end: sourceCode.getLoc(flatCallExpression).end,
			},
			messageId: MESSAGE_ID,
			fix,
		};
	});

	context.on('CallExpression', flatMapCallExpression => {
		if (
			!isMethodCall(flatMapCallExpression, {
				method: 'flatMap',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			|| hasTypeArguments(flatMapCallExpression)
		) {
			return;
		}

		const filterCallExpression = flatMapCallExpression.callee.object;
		if (
			!isMethodCall(filterCallExpression, {
				method: 'filter',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			|| hasTypeArguments(filterCallExpression)
			|| hasOptionalChainElement(filterCallExpression.callee.object)
			|| isKnownNonArray(filterCallExpression.callee.object, context)
		) {
			return;
		}

		const {sourceCode} = context;
		if (sourceCode.getCommentsInside(flatMapCallExpression).length > 0) {
			return;
		}

		const [filterCallback] = filterCallExpression.arguments;
		const [flatMapCallback] = flatMapCallExpression.arguments;
		if (
			!isSimpleUntypedSingleParameterArrowCallback(filterCallback)
			|| !isSimpleUntypedSingleParameterArrowCallback(flatMapCallback)
			|| !canArrayExpressionReturnMultipleItems(flatMapCallback.body)
		) {
			return;
		}

		const [filterElementParameter] = filterCallback.params;
		const [flatMapElementParameter] = flatMapCallback.params;
		if (!isSameIdentifier(filterElementParameter, flatMapElementParameter)) {
			return;
		}

		const arrayText = getMemberExpressionObjectText(filterCallExpression.callee.object, context);
		const parameterText = sourceCode.getText(filterElementParameter);
		const predicateText = getConditionalTestText(filterCallback.body, context);
		const mappedText = sourceCode.getText(flatMapCallback.body);

		return {
			node: flatMapCallExpression.callee.property,
			messageId: MESSAGE_ID_FILTER_FLAT_MAP,
			suggest: [
				{
					messageId: SUGGESTION_ID_FILTER_FLAT_MAP,
					fix: fixer => fixer.replaceText(
						flatMapCallExpression,
						`${arrayText}.flatMap(${parameterText} => ${predicateText} ? ${mappedText} : [])`,
					),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.flatMap(…)` over `.map(…).flat()` and `.filter(…).flatMap(…)`.',
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
