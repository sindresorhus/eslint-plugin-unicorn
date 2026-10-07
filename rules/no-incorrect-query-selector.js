import {removeMemberExpressionProperty, removeMethodCall} from './fix/index.js';
import {
	controlFlowStatementTypes,
	getCommentSafeProblem,
	getConstVariableInitializer,
	getBooleanAncestor,
	getParenthesizedRange,
	isControlFlowTest,
	isLeftHandSide,
	isNodeValueNotDomNode,
	wouldRemoveComments,
} from './utils/index.js';
import {
	isLiteral,
	isNullLiteral,
	isMethodCall,
	getStaticStringValue,
	isUndefined,
} from './ast/index.js';

const MESSAGE_ID_FIRST_MATCH = 'first-match';
const MESSAGE_ID_ID_SELECTOR = 'id-selector';
const MESSAGE_ID_LENGTH_CHECK = 'length-check';
const MESSAGE_ID_QUERY_SELECTOR_ALL_NULLISH = 'query-selector-all-nullish';
const MESSAGE_ID_QUERY_SELECTOR_UNDEFINED = 'query-selector-undefined';

const messages = {
	[MESSAGE_ID_FIRST_MATCH]: 'Prefer `.querySelector()` when only the first match is used.',
	[MESSAGE_ID_ID_SELECTOR]: 'Prefer `.querySelector()` for a simple ID selector.',
	[MESSAGE_ID_LENGTH_CHECK]: 'Check `.length` instead of the `NodeList` object itself.',
	[MESSAGE_ID_QUERY_SELECTOR_ALL_NULLISH]: 'Check `.length` instead of comparing the `NodeList` object with `null` or `undefined`.',
	[MESSAGE_ID_QUERY_SELECTOR_UNDEFINED]: 'Compare the result of `.querySelector()` with `null` instead of `undefined`.',
};

const isQuerySelectorCall = node =>
	isMethodCall(node, {
		method: 'querySelector',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& !isNodeValueNotDomNode(node.callee.object);

const isQuerySelectorAllCall = node =>
	isMethodCall(node, {
		method: 'querySelectorAll',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& !isNodeValueNotDomNode(node.callee.object);

const isZeroLiteral = node => isLiteral(node, 0);

const isZeroIndexAccess = (node, isCall) =>
	node.type === 'MemberExpression'
	&& node.computed
	&& !node.optional
	&& isCall(node.object)
	&& isZeroLiteral(node.property);

const isQuerySelectorAllZeroIndexAccess = node => isZeroIndexAccess(node, isQuerySelectorAllCall);

const isFirstItemCall = (node, isCall) =>
	isMethodCall(node, {
		methods: ['at', 'item'],
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& isCall(node.callee.object)
	&& isZeroLiteral(node.arguments[0]);

const isFirstQuerySelectorAllItemCall = node => isFirstItemCall(node, isQuerySelectorAllCall);

const isFirstQuerySelectorAllElementAccess = node => isQuerySelectorAllZeroIndexAccess(node) || isFirstQuerySelectorAllItemCall(node);

const isQuerySelectorAllCallPartOfFirstElementAccess = node =>
	isFirstQuerySelectorAllElementAccess(node.parent)
	|| (
		node.parent.type === 'MemberExpression'
		&& node.parent.object === node
		&& isFirstQuerySelectorAllItemCall(node.parent.parent)
	);

const getAccessRange = (node, querySelectorAllCall, context) => {
	const {sourceCode} = context;
	const [, start] = getParenthesizedRange(querySelectorAllCall, context);
	const [, end] = sourceCode.getRange(node);

	return [start, end];
};

const isSimpleIdSelector = selector => /^#[\-A-Z_a-z][\w\-]*$/v.test(selector);

const getCallFromIdentifier = (node, context, isCall) => {
	const initializer = getConstVariableInitializer(node, context);
	return isCall(initializer) ? initializer : undefined;
};

const getQuerySelectorAllCallForLengthCheck = (node, context) =>
	isQuerySelectorAllCall(node) ? node : getCallFromIdentifier(node, context, isQuerySelectorAllCall);

// Parent types from which `getBooleanAncestor` can climb or `isControlFlowTest` can be true. Any other parent means the identifier is not a control-flow test.
const controlFlowTestParentTypes = new Set([
	...controlFlowStatementTypes,
	'LogicalExpression',
	'UnaryExpression',
	'CallExpression',
	'VExpressionContainer',
]);

const getLengthCheckProblem = (node, context) => {
	const {sourceCode} = context;

	// Cheap structural checks first, so the expensive scope resolution in
	// `getQuerySelectorAllCallForLengthCheck` runs only for identifiers that are
	// actually used as a control-flow test.
	if (!controlFlowTestParentTypes.has(node.parent.type)) {
		return;
	}

	const {node: booleanAncestor, isNegative} = getBooleanAncestor(node, context);
	if (!isControlFlowTest(booleanAncestor)) {
		return;
	}

	const querySelectorAllCall = getQuerySelectorAllCallForLengthCheck(node, context);
	if (!querySelectorAllCall) {
		return;
	}

	const text = sourceCode.getText(node);

	return {
		node,
		messageId: MESSAGE_ID_LENGTH_CHECK,
		// The whole ancestor is replaced by the text of `node`, so a comment elsewhere in it would be deleted, and one right after it would end up after the new condition instead of after the call it documents
		fix: wouldRemoveComments(context, booleanAncestor, [node]) || sourceCode.getCommentsAfter(booleanAncestor).length > 0
			? undefined
			: fixer => fixer.replaceText(booleanAncestor, `${text}.length ${isNegative ? '=== 0' : '> 0'}`),
	};
};

const removeFirstElementAccess = (fixer, node, context) => node.type === 'MemberExpression'
	? removeMemberExpressionProperty(fixer, node, context)
	: removeMethodCall(fixer, node, context);

const getFirstElementAccessProblem = (node, querySelectorAllCall, context) => ({
	node,
	messageId: MESSAGE_ID_FIRST_MATCH,
	* fix(fixer) {
		yield fixer.replaceText(querySelectorAllCall.callee.property, 'querySelector');
		yield removeFirstElementAccess(fixer, node, context);
	},
});

const isNullishNode = (node, sourceCode) =>
	isNullLiteral(node)
	|| (
		isUndefined(node)
		&& sourceCode.isGlobalReference(node)
	);

const getQuerySelectorComparison = (node, isCall, context) => {
	const {left, operator, right} = node;

	if (!['==', '===', '!=', '!=='].includes(operator)) {
		return;
	}

	const leftCall = isCall(left)
		? left
		: getCallFromIdentifier(left, context, isCall);

	if (leftCall && isNullishNode(right, context.sourceCode)) {
		return {node: left, value: right};
	}

	const rightCall = isCall(right)
		? right
		: getCallFromIdentifier(right, context, isCall);

	if (rightCall && isNullishNode(left, context.sourceCode)) {
		return {node: right, value: left};
	}
};

const getQuerySelectorAllNullishComparisonProblem = (node, context) => {
	const comparison = getQuerySelectorComparison(node, isQuerySelectorAllCall, context);
	if (!comparison) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID_QUERY_SELECTOR_ALL_NULLISH,
	};
};

const getQuerySelectorUndefinedComparisonProblem = (node, context) => {
	const comparison = getQuerySelectorComparison(node, isQuerySelectorCall, context);
	if (
		!comparison
		|| (node.operator !== '===' && node.operator !== '!==')
		|| !isUndefined(comparison.value)
	) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID_QUERY_SELECTOR_UNDEFINED,
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('MemberExpression', node => {
		if (
			!isQuerySelectorAllZeroIndexAccess(node)
			|| isLeftHandSide(node)
		) {
			return;
		}

		const querySelectorAllCall = node.object;
		const accessRange = getAccessRange(node, querySelectorAllCall, context);
		return getCommentSafeProblem(context, getFirstElementAccessProblem(node, querySelectorAllCall, context), accessRange);
	});

	context.on('CallExpression', node => {
		if (isFirstQuerySelectorAllItemCall(node)) {
			if (isLeftHandSide(node)) {
				return;
			}

			const querySelectorAllCall = node.callee.object;
			const accessRange = getAccessRange(node, querySelectorAllCall, context);
			return getCommentSafeProblem(context, getFirstElementAccessProblem(node, querySelectorAllCall, context), accessRange);
		}

		const lengthCheckProblem = getLengthCheckProblem(node, context);
		if (lengthCheckProblem) {
			return lengthCheckProblem;
		}

		if (
			!isQuerySelectorAllCall(node)
			|| isQuerySelectorAllCallPartOfFirstElementAccess(node)
		) {
			return;
		}

		const selector = getStaticStringValue(node.arguments[0]);
		if (isSimpleIdSelector(selector)) {
			return {
				node: node.callee.property,
				messageId: MESSAGE_ID_ID_SELECTOR,
			};
		}
	});

	context.on('BinaryExpression', node =>
		getQuerySelectorAllNullishComparisonProblem(node, context)
		?? getQuerySelectorUndefinedComparisonProblem(node, context));

	context.on('Identifier', node => getLengthCheckProblem(node, context));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow incorrect `querySelector()` and `querySelectorAll()` usage.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
