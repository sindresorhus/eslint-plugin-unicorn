import {
	isParenthesized,
	checkVueTemplate,
	isLogicalExpression,
	isBooleanContext,
	getBooleanAncestor,
	getLogicalExpressionOperands,
	getLogicalExpressionRoot,
	isSameReference,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
	hasSameObjectShapePropertyCheck,
	isKnownNonCollectionLengthOrSize,
	isLengthOrSizeMemberExpression,
	hasCommentInRange,
} from './utils/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isLiteral} from './ast/index.js';

const TYPE_NON_ZERO = 'non-zero';
const TYPE_ZERO = 'zero';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[TYPE_NON_ZERO]: 'Use `.{{property}} {{code}}` when checking {{property}} is not zero.',
	[TYPE_ZERO]: 'Use `.{{property}} {{code}}` when checking {{property}} is zero.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `.{{property}}` with `.{{property}} {{code}}`.',
};

const isCompareRight = (node, operator, value) =>
	node.type === 'BinaryExpression'
	&& node.operator === operator
	&& isLiteral(node.right, value);
const isCompareLeft = (node, operator, value) =>
	node.type === 'BinaryExpression'
	&& node.operator === operator
	&& isLiteral(node.left, value);
const nonZeroStyles = new Map([
	[
		'greater-than',
		{
			code: '> 0',
			test: node => isCompareRight(node, '>', 0),
		},
	],
	[
		'not-equal',
		{
			code: '!== 0',
			test: node => isCompareRight(node, '!==', 0),
		},
	],
]);
const zeroStyle = {
	code: '=== 0',
	test: node => isCompareRight(node, '===', 0),
};

function getLengthCheckParent(node, allowTypeScriptExpression) {
	node = node.parent;
	if (allowTypeScriptExpression) {
		while (isTypeScriptExpressionWrapper(node)) {
			node = node.parent;
		}
	}

	return node;
}

function getLengthCheckMemberExpression(node) {
	if (node.type === 'UnaryExpression' && node.operator === '!') {
		return getLengthCheckMemberExpression(node.argument);
	}

	if (
		node.type === 'CallExpression'
		&& node.callee.type === 'Identifier'
		&& node.callee.name === 'Boolean'
		&& node.arguments.length === 1
	) {
		return getLengthCheckMemberExpression(node.arguments[0]);
	}

	if (node.type !== 'BinaryExpression') {
		return;
	}

	const left = unwrapTypeScriptExpression(node.left);
	if (isLengthOrSizeMemberExpression(left)) {
		return left;
	}

	const right = unwrapTypeScriptExpression(node.right);
	if (isLengthOrSizeMemberExpression(right)) {
		return right;
	}
}

function getLengthCheckNode(node, {allowTypeScriptExpression = false} = {}) {
	node = getLengthCheckParent(node, allowTypeScriptExpression);

	// Zero length check
	if (
		// `foo.length === 0`
		isCompareRight(node, '===', 0)
		// `foo.length == 0`
		|| isCompareRight(node, '==', 0)
		// `foo.length < 1`
		|| isCompareRight(node, '<', 1)
		// `foo.length <= 0`
		|| isCompareRight(node, '<=', 0)
		// `0 === foo.length`
		|| isCompareLeft(node, '===', 0)
		// `0 == foo.length`
		|| isCompareLeft(node, '==', 0)
		// `1 > foo.length`
		|| isCompareLeft(node, '>', 1)
		// `0 >= foo.length`
		|| isCompareLeft(node, '>=', 0)
	) {
		return {isZeroLengthCheck: true, node};
	}

	// Non-Zero length check
	if (
		// `foo.length !== 0`
		isCompareRight(node, '!==', 0)
		// `foo.length != 0`
		|| isCompareRight(node, '!=', 0)
		// `foo.length > 0`
		|| isCompareRight(node, '>', 0)
		// `foo.length >= 1`
		|| isCompareRight(node, '>=', 1)
		// `0 !== foo.length`
		|| isCompareLeft(node, '!==', 0)
		// `0 != foo.length`
		|| isCompareLeft(node, '!=', 0)
		// `0 < foo.length`
		|| isCompareLeft(node, '<', 0)
		// `1 <= foo.length`
		|| isCompareLeft(node, '<=', 1)
	) {
		return {isZeroLengthCheck: false, node};
	}

	return {};
}

function isSameLengthNonZeroCheck(node, lengthNode, context) {
	const comparisonLengthNode = getLengthCheckMemberExpression(node);
	if (!comparisonLengthNode || !isSameReference(comparisonLengthNode, lengthNode)) {
		return false;
	}

	const {isZeroLengthCheck, node: lengthCheckNode} = getLengthCheckNode(comparisonLengthNode, {allowTypeScriptExpression: true});
	if (!lengthCheckNode) {
		return false;
	}

	const {isNegative, node: ancestor} = getBooleanAncestor(lengthCheckNode, context);
	return ancestor === node && isNegative === isZeroLengthCheck;
}

function isLengthGuardedByNonZeroCheck(lengthNode, context) {
	const root = getLogicalExpressionRoot(lengthNode, '&&');
	if (
		root.type !== 'LogicalExpression'
		|| root.operator !== '&&'
	) {
		return false;
	}

	return getLogicalExpressionOperands(root, '&&').some(operand =>
		operand !== lengthNode
		&& isSameLengthNonZeroCheck(operand, lengthNode, context));
}

// `node` is replaced by a comparison like `foo.length > 0`. A comparison binds looser than the `!foo.length` or `Boolean(foo.length)` it replaces, so it needs parentheses wherever the replaced expression needed them.
function needsParenthesesForComparison(node, context) {
	if (isParenthesized(node, context)) {
		return false;
	}

	const {parent} = node;

	switch (parent.type) {
		// `(foo.length > 0).x`
		case 'MemberExpression': {
			return parent.object === node;
		}

		// `(foo.length > 0)()`, `new (foo.length > 0)()`
		case 'CallExpression':
		case 'NewExpression': {
			return parent.callee === node;
		}

		// `(foo.length > 0)\`x\``
		case 'TaggedTemplateExpression': {
			return parent.tag === node;
		}

		// `typeof (foo.length > 0)`, `await (foo.length > 0)`, `(foo.length > 0)!`
		// `bar === (foo.length > 0)`, `bar + (foo.length > 0)`, `(foo.length > 0) ** 2`
		case 'AwaitExpression':
		case 'BinaryExpression':
		case 'TSAsExpression':
		case 'TSNonNullExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion':
		case 'UnaryExpression': {
			return true;
		}

		default: {
			return false;
		}
	}
}

function create(context) {
	const options = context.options[0];
	const nonZeroStyle = nonZeroStyles.get(options['non-zero']);
	const {sourceCode} = context;

	function getProblem({node, isZeroLengthCheck, lengthNode, autoFix, shouldSuggest = true}) {
		const {code, test} = isZeroLengthCheck ? zeroStyle : nonZeroStyle;
		if (test(node)) {
			return;
		}

		const comparison = `${sourceCode.getText(lengthNode)} ${code}`;
		const fixed = needsParenthesesForComparison(node, context)
			? `(${comparison})`
			: comparison;

		const fix = function * (fixer) {
			yield fixer.replaceText(node, fixed);
			yield fixSpaceAroundKeyword(fixer, node, context);
		};

		const problem = {
			node,
			messageId: isZeroLengthCheck ? TYPE_ZERO : TYPE_NON_ZERO,
			data: {code, property: lengthNode.property.name},
		};

		// The whole comparison is replaced and `fixed` is rebuilt from the length member alone, so a comment anywhere in it, including between the member and the operator, would be lost
		if (hasCommentInRange(context, sourceCode.getRange(node))) {
			return problem;
		}

		if (autoFix) {
			problem.fix = fix;
		} else if (shouldSuggest) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			];
		}

		return problem;
	}

	context.on('MemberExpression', memberExpression => {
		if (
			!isLengthOrSizeMemberExpression(memberExpression)
			|| memberExpression.object.type === 'ThisExpression'
		) {
			return;
		}

		const lengthNode = memberExpression;
		if (isKnownNonCollectionLengthOrSize(lengthNode, context)) {
			// Ignore known non-cardinality length or size properties.
			return;
		}

		let node;
		let isAutoFix = true;
		let {isZeroLengthCheck, node: lengthCheckNode} = getLengthCheckNode(lengthNode);
		if (lengthCheckNode) {
			const {isNegative, node: ancestor} = getBooleanAncestor(lengthCheckNode, context);
			node = ancestor;
			if (isNegative) {
				isZeroLengthCheck = !isZeroLengthCheck;
			}
		} else {
			const {isNegative, node: ancestor} = getBooleanAncestor(lengthNode, context);
			if (isBooleanContext(ancestor, context)) {
				isZeroLengthCheck = isNegative;
				node = ancestor;
			} else if (isLogicalExpression(lengthNode.parent) && lengthNode.parent.operator === '&&') {
				isZeroLengthCheck = isNegative;
				node = lengthNode;
				isAutoFix = false;
			}
		}

		if (
			!node
			|| (node === lengthNode && isLengthGuardedByNonZeroCheck(lengthNode, context))
			|| hasSameObjectShapePropertyCheck({node, lengthOrSizeNode: lengthNode})
		) {
			return;
		}

		const isUnsafeNegationInBinaryExpression = node.type === 'UnaryExpression'
			&& node.operator === '!'
			&& node.parent.type === 'BinaryExpression'
			&& node.parent.left === node;

		return getProblem({
			node,
			isZeroLengthCheck,
			lengthNode,
			autoFix: isAutoFix && !isUnsafeNegationInBinaryExpression,
			shouldSuggest: !isUnsafeNegationInBinaryExpression,
		});
	});
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			'non-zero': {
				enum: nonZeroStyles.keys().toArray(),
				default: 'greater-than',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce explicitly comparing the `length` or `size` property of a value.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{'non-zero': 'greater-than'}],
		messages,
		hasSuggestions: true,
		languages: [
			'js/js',
		],
	},
};

export default config;
