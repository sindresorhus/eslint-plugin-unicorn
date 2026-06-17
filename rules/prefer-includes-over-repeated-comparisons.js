import {getStaticValue, hasSideEffect} from '@eslint-community/eslint-utils';
import {isUndefined} from './ast/index.js';
import {
	containsOptionalChain,
	isReference,
	isSame,
	unwrapExpression,
} from './utils/comparison.js';

const MESSAGE_ID = 'prefer-includes-over-repeated-comparisons';
const messages = {
	[MESSAGE_ID]: 'Use `.includes()` instead of repeated equality checks.',
};

function getLogicalOrOperands(node) {
	return [node.left, node.right].flatMap(child =>
		child.type === 'LogicalExpression' && child.operator === '||'
			? getLogicalOrOperands(child)
			: [child]);
}

const isStrictEqualityComparison = node =>
	node.type === 'BinaryExpression' && node.operator === '===';

function getSharedReference(comparisons) {
	const [{left, right}] = comparisons;
	// `undefined` is an identifier, so it qualifies as a reference. Exclude it
	// so comparing distinct expressions against `undefined` is not treated as a
	// shared membership check (e.g. `a === undefined || b === undefined`).
	let candidates = [left, right].filter(node => isReference(node) && !isUndefined(unwrapExpression(node)));

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

const isNaNValue = (node, sourceCode) =>
	Number.isNaN(getStaticValue(unwrapExpression(node), sourceCode.getScope(node))?.value);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {minimumComparisons} = context.options[0];
	const {sourceCode} = context;

	context.on('LogicalExpression', node => {
		if (
			node.operator !== '||'
			|| (node.parent.type === 'LogicalExpression' && node.parent.operator === '||')
		) {
			return;
		}

		const comparisons = getLogicalOrOperands(node);
		if (
			comparisons.some(comparison => !isStrictEqualityComparison(comparison))
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
			|| isNaNValue(sharedReference, sourceCode)
			|| !comparisons.every(comparison => {
				const comparedValue = getComparedValue(comparison, sharedReference);

				return comparedValue
					&& !hasSideEffect(comparedValue, sourceCode)
					&& !isNaNValue(comparedValue, sourceCode);
			})
		) {
			return;
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

/** @type {import('eslint').Rule.RuleModule} */
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
