import {getStaticValue} from '@eslint-community/eslint-utils';
import {
	isParenthesized,
	checkVueTemplate,
	isLogicalExpression,
	isBooleanExpression,
	isControlFlowTest,
	getBooleanAncestor,
	isSameReference,
} from './utils/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isLiteral, isMemberExpression} from './ast/index.js';

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

const shapeProperties = new Set(['depth', 'height', 'width']);

function isLengthOrSizeMemberExpression(node) {
	return isMemberExpression(node, {
		properties: ['length', 'size'],
		optional: false,
	});
}

function isTypeScriptExpression(node) {
	return node?.type === 'TSAsExpression'
		|| node?.type === 'TSSatisfiesExpression'
		|| node?.type === 'TSTypeAssertion'
		|| node?.type === 'TSNonNullExpression';
}

function unwrapTypeScriptExpression(node) {
	if (isTypeScriptExpression(node)) {
		return unwrapTypeScriptExpression(node.expression);
	}

	return node;
}

function getLengthCheckParent(node, allowTypeScriptExpression) {
	node = node.parent;
	if (allowTypeScriptExpression) {
		while (isTypeScriptExpression(node)) {
			node = node.parent;
		}
	}

	return node;
}

function getLogicalExpressionRoot(node) {
	while (
		isLogicalExpression(node.parent)
		&& node.parent.operator === '&&'
	) {
		node = node.parent;
	}

	return node;
}

function getLogicalExpressionOperands(node) {
	return [node.left, node.right].flatMap(child =>
		child.type === 'LogicalExpression' && child.operator === node.operator
			? getLogicalExpressionOperands(child)
			: [child]);
}

function hasSameObjectShapePropertyCheck({node, lengthNode}) {
	const root = getLogicalExpressionRoot(node);
	if (
		root.type !== 'LogicalExpression'
		|| root.operator !== '&&'
	) {
		return false;
	}

	return getLogicalExpressionOperands(root).some(operand =>
		operand !== node
		&& isMemberExpression(operand, {computed: false, optional: false})
		&& operand.property.type === 'Identifier'
		&& shapeProperties.has(operand.property.name)
		&& isSameReference(operand.object, lengthNode.object));
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
		// `0 === foo.length`
		|| isCompareLeft(node, '===', 0)
		// `0 == foo.length`
		|| isCompareLeft(node, '==', 0)
		// `1 > foo.length`
		|| isCompareLeft(node, '>', 1)
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

function isSameLengthNonZeroCheck(node, lengthNode) {
	const comparisonLengthNode = getLengthCheckMemberExpression(node);
	if (!comparisonLengthNode || !isSameReference(comparisonLengthNode, lengthNode)) {
		return false;
	}

	const {isZeroLengthCheck, node: lengthCheckNode} = getLengthCheckNode(comparisonLengthNode, {allowTypeScriptExpression: true});
	if (!lengthCheckNode) {
		return false;
	}

	const {isNegative, node: ancestor} = getBooleanAncestor(lengthCheckNode);
	return ancestor === node && isNegative === isZeroLengthCheck;
}

function isLengthGuardedByNonZeroCheck(lengthNode) {
	const root = getLogicalExpressionRoot(lengthNode);
	if (
		root.type !== 'LogicalExpression'
		|| root.operator !== '&&'
	) {
		return false;
	}

	return getLogicalExpressionOperands(root).some(operand =>
		operand !== lengthNode
		&& isSameLengthNonZeroCheck(operand, lengthNode));
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

		let fixed = `${sourceCode.getText(lengthNode)} ${code}`;
		if (
			!isParenthesized(node, context)
			&& node.type === 'UnaryExpression'
			&& (node.parent.type === 'UnaryExpression' || node.parent.type === 'AwaitExpression')
		) {
			fixed = `(${fixed})`;
		}

		const fix = function * (fixer) {
			yield fixer.replaceText(node, fixed);
			yield fixSpaceAroundKeyword(fixer, node, context);
		};

		const problem = {
			node,
			messageId: isZeroLengthCheck ? TYPE_ZERO : TYPE_NON_ZERO,
			data: {code, property: lengthNode.property.name},
		};

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
		const staticValue = getStaticValue(lengthNode, sourceCode.getScope(lengthNode));
		if (staticValue && (!Number.isInteger(staticValue.value) || staticValue.value < 0)) {
			// Ignore known, non-positive-integer length properties.
			return;
		}

		let node;
		let autoFix = true;
		let {isZeroLengthCheck, node: lengthCheckNode} = getLengthCheckNode(lengthNode);
		if (lengthCheckNode) {
			const {isNegative, node: ancestor} = getBooleanAncestor(lengthCheckNode);
			node = ancestor;
			if (isNegative) {
				isZeroLengthCheck = !isZeroLengthCheck;
			}
		} else {
			const {isNegative, node: ancestor} = getBooleanAncestor(lengthNode);
			if (isBooleanExpression(ancestor) || isControlFlowTest(ancestor)) {
				isZeroLengthCheck = isNegative;
				node = ancestor;
			} else if (isLogicalExpression(lengthNode.parent) && lengthNode.parent.operator === '&&') {
				isZeroLengthCheck = isNegative;
				node = lengthNode;
				autoFix = false;
			}
		}

		if (node) {
			if (
				(node === lengthNode && isLengthGuardedByNonZeroCheck(lengthNode))
				|| hasSameObjectShapePropertyCheck({node, lengthNode})
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
				autoFix: autoFix && !isUnsafeNegationInBinaryExpression,
				shouldSuggest: !isUnsafeNegationInBinaryExpression,
			});
		}
	});
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			'non-zero': {
				enum: [...nonZeroStyles.keys()],
				default: 'greater-than',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
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
	},
};

export default config;
