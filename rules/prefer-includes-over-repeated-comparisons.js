import {getStaticValue, hasSideEffect} from '@eslint-community/eslint-utils';
import {isSameReference} from './utils/index.js';

const MESSAGE_ID = 'prefer-includes-over-repeated-comparisons';
const messages = {
	[MESSAGE_ID]: 'Use `.includes()` instead of repeated equality checks.',
};

const typeScriptExpressionNodeTypes = new Set([
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
	'TSNonNullExpression',
]);

const optionalChainNodeTypes = new Set([
	'CallExpression',
	'MemberExpression',
]);

const referenceNodeTypes = new Set([
	'Identifier',
	'MemberExpression',
	'Super',
	'ThisExpression',
]);

const unwrapExpression = node =>
	typeScriptExpressionNodeTypes.has(node.type)
		? unwrapExpression(node.expression)
		: node;

const normalizeReference = node => {
	node = unwrapExpression(node);

	if (node.type === 'MemberExpression') {
		return {
			...node,
			object: normalizeReference(node.object),
			property: node.computed ? normalizeReference(node.property) : node.property,
		};
	}

	return node;
};

const containsOptionalChain = node => {
	if (node.type === 'ChainExpression') {
		return true;
	}

	if (optionalChainNodeTypes.has(node.type) && node.optional) {
		return true;
	}

	return Object.entries(node).some(([key, value]) => {
		if (key === 'parent' || !value) {
			return false;
		}

		if (Array.isArray(value)) {
			return value.some(element => element?.type && containsOptionalChain(element));
		}

		return value.type && containsOptionalChain(value);
	});
};

const isSame = (left, right) =>
	isSameReference(normalizeReference(left), normalizeReference(right));

const isReference = node => {
	node = unwrapExpression(node);

	return referenceNodeTypes.has(node.type);
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
	let candidates = [left, right].filter(node => isReference(node));

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
			!comparisons.every(comparison => isStrictEqualityComparison(comparison))
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
	},
};

export default config;
