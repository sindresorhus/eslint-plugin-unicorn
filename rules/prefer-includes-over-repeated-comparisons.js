import {hasSideEffect} from '@eslint-community/eslint-utils';
import {
	getLogicalExpressionOperands,
	getStaticValueIfNoSideEffects,
	isOutermostLogicalExpression,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';
import {isUndefined} from './ast/index.js';
import {
	containsOptionalChain,
	isReference,
	isSame,
} from './utils/comparison.js';

const MESSAGE_ID = 'prefer-includes-over-repeated-comparisons';
const messages = {
	[MESSAGE_ID]: 'Use `.includes()` instead of repeated equality checks.',
};

const isEqualityComparison = (node, logicalOperator) =>
	node.type === 'BinaryExpression'
	&& (logicalOperator === '||' ? ['===', '=='] : ['!==', '!=']).includes(node.operator);

/**
Get the primitive string or number type of an operand with full type information.
*/
const getPrimitiveTypeName = (node, context) => withTypeInformation(node, context, ({type, checker}) => {
	const constrainedType = checker.getBaseConstraintOfType(type) ?? type;
	const isString = checker.isTypeAssignableTo(constrainedType, checker.getStringType());
	const isNumber = checker.isTypeAssignableTo(constrainedType, checker.getNumberType());

	if (isString === isNumber) {
		return;
	}

	return isString ? 'string' : 'number';
});

function getSharedReference(comparisons) {
	const [{left, right}] = comparisons;
	// `undefined` is an identifier, so it qualifies as a reference. Exclude it
	// so comparing distinct expressions against `undefined` is not treated as a
	// shared membership check (e.g. `a === undefined || b === undefined`).
	let candidates = [left, right].filter(node => isReference(node) && !isUndefined(unwrapTypeScriptExpression(node)));

	for (const comparison of comparisons.slice(1)) {
		candidates = candidates.filter(candidate =>
			isSame(candidate, comparison.left) || isSame(candidate, comparison.right));

		if (candidates.length === 0) {
			return;
		}
	}

	return candidates.length === 1 ? candidates[0] : undefined;
}

const getComparedValue = (comparison, sharedReference) => {
	const {left, right} = comparison;
	const isLeftSharedReference = isSame(left, sharedReference);
	const isRightSharedReference = isSame(right, sharedReference);

	if (isLeftSharedReference === isRightSharedReference) {
		return;
	}

	return isLeftSharedReference ? right : left;
};

const isNaNValue = (node, context) => {
	node = unwrapTypeScriptExpression(node);
	const staticValue = getStaticValueIfNoSideEffects(node, context);

	return Number.isNaN(staticValue?.value);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {minimumComparisons} = context.options[0];
	const {sourceCode} = context;

	context.on('LogicalExpression', node => {
		if (
			(node.operator !== '||' && node.operator !== '&&')
			|| !isOutermostLogicalExpression(node)
		) {
			return;
		}

		const comparisons = getLogicalExpressionOperands(node, node.operator);
		if (
			comparisons.some(comparison => !isEqualityComparison(comparison, node.operator))
			|| comparisons.length < minimumComparisons
		) {
			return;
		}

		if (comparisons.some(({left, right}) => containsOptionalChain(left) || containsOptionalChain(right))) {
			return;
		}

		const sharedReference = getSharedReference(comparisons);
		if (
			!sharedReference
			|| isNaNValue(sharedReference, context)
			|| !comparisons.every(comparison => {
				const comparedValue = getComparedValue(comparison, sharedReference);

				return comparedValue
					&& !hasSideEffect(comparedValue, sourceCode)
					&& !isNaNValue(comparedValue, context);
			})
		) {
			return;
		}

		// Equality checks can narrow unions, but `.includes()` cannot.
		if (withTypeInformation(unwrapTypeScriptExpression(sharedReference), context, ({type, checker}) => (checker.getBaseConstraintOfType(type) ?? type).isUnion())) {
			return;
		}

		if (comparisons.some(comparison => comparison.operator === '==' || comparison.operator === '!=')) {
			const primitiveType = getPrimitiveTypeName(sharedReference, context);
			if (
				!primitiveType
				|| comparisons.some(({left, right}) =>
					getPrimitiveTypeName(left, context) !== primitiveType
					|| getPrimitiveTypeName(right, context) !== primitiveType)
			) {
				return;
			}
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			minimumComparisons: {
				type: 'integer',
				minimum: 2,
				description: 'The minimum number of equality comparisons before reporting.',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.includes()` over repeated equality comparisons.',
			recommended: true,
		},
		schema,
		defaultOptions: [
			{
				minimumComparisons: 3,
			},
		],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
