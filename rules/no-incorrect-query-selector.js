import {findVariable} from '@eslint-community/eslint-utils';
import {removeMemberExpressionProperty, removeMethodCall} from './fix/index.js';
import {
	getBooleanAncestor,
	getParenthesizedRange,
	isControlFlowTest,
	isLeftHandSide,
	isNodeValueNotDomNode,
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

const isWriteTarget = node =>
	isLeftHandSide(node)
	|| (
		(node.parent.type === 'ForInStatement' || node.parent.type === 'ForOfStatement')
		&& node.parent.left === node
	);

const isQuerySelectorAllCallPartOfFirstElementAccess = node =>
	isFirstQuerySelectorAllElementAccess(node.parent)
	|| (
		node.parent.type === 'MemberExpression'
		&& node.parent.object === node
		&& isFirstQuerySelectorAllItemCall(node.parent.parent)
	);

const hasCommentsInAccess = (node, querySelectorAllCall, sourceCode, context) => {
	const [, start] = getParenthesizedRange(querySelectorAllCall, context);
	const [, end] = sourceCode.getRange(node);

	return sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});
};

const hasCommentsBetween = (outerNode, innerNode, sourceCode) => {
	const [outerStart, outerEnd] = sourceCode.getRange(outerNode);
	const [innerStart, innerEnd] = sourceCode.getRange(innerNode);

	return sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= outerStart
			&& commentEnd <= outerEnd
			&& (commentEnd <= innerStart || commentStart >= innerEnd);
	});
};

const isSimpleIdSelector = selector => /^#[\-A-Z_a-z][\w\-]*$/v.test(selector);

const getCallFromIdentifier = (node, sourceCode, isCall) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !isCall(definition.node.init)
	) {
		return;
	}

	return definition.node.init;
};

const getQuerySelectorAllCallForLengthCheck = (node, sourceCode) => {
	if (isQuerySelectorAllCall(node)) {
		return node;
	}

	return getCallFromIdentifier(node, sourceCode, isQuerySelectorAllCall);
};

const getLengthCheckProblem = (node, context) => {
	const {sourceCode} = context;

	// Cheap structural checks first, so the expensive scope resolution in
	// `getQuerySelectorAllCallForLengthCheck` runs only for identifiers that are
	// actually used as a control-flow test.
	const {node: booleanAncestor, isNegative} = getBooleanAncestor(node, context);
	if (!isControlFlowTest(booleanAncestor)) {
		return;
	}

	const querySelectorAllCall = getQuerySelectorAllCallForLengthCheck(node, sourceCode);
	if (!querySelectorAllCall) {
		return;
	}

	const text = sourceCode.getText(node);

	return {
		node,
		messageId: MESSAGE_ID_LENGTH_CHECK,
		fix: hasCommentsBetween(booleanAncestor, node, sourceCode)
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

const getQuerySelectorComparison = (node, isCall, sourceCode) => {
	const {left, operator, right} = node;

	if (!['==', '===', '!=', '!=='].includes(operator)) {
		return;
	}

	const leftCall = isCall(left)
		? left
		: getCallFromIdentifier(left, sourceCode, isCall);

	if (leftCall && isNullishNode(right, sourceCode)) {
		return {node: left, value: right};
	}

	const rightCall = isCall(right)
		? right
		: getCallFromIdentifier(right, sourceCode, isCall);

	if (rightCall && isNullishNode(left, sourceCode)) {
		return {node: right, value: left};
	}
};

const getQuerySelectorAllNullishComparisonProblem = (node, context) => {
	const {sourceCode} = context;
	const comparison = getQuerySelectorComparison(node, isQuerySelectorAllCall, sourceCode);
	if (!comparison) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID_QUERY_SELECTOR_ALL_NULLISH,
	};
};

const getQuerySelectorUndefinedComparisonProblem = (node, sourceCode) => {
	const comparison = getQuerySelectorComparison(node, isQuerySelectorCall, sourceCode);
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MemberExpression', node => {
		if (
			!isQuerySelectorAllZeroIndexAccess(node)
			|| isWriteTarget(node)
		) {
			return;
		}

		const querySelectorAllCall = node.object;
		if (hasCommentsInAccess(node, querySelectorAllCall, sourceCode, context)) {
			return;
		}

		return getFirstElementAccessProblem(node, querySelectorAllCall, context);
	});

	context.on('CallExpression', node => {
		if (isFirstQuerySelectorAllItemCall(node)) {
			if (isWriteTarget(node)) {
				return;
			}

			const querySelectorAllCall = node.callee.object;
			if (hasCommentsInAccess(node, querySelectorAllCall, sourceCode, context)) {
				return;
			}

			return getFirstElementAccessProblem(node, querySelectorAllCall, context);
		}

		const lengthCheckProblem = getLengthCheckProblem(node, context);
		if (lengthCheckProblem) {
			return lengthCheckProblem;
		}

		if (
			isQuerySelectorAllCall(node)
			&& !isQuerySelectorAllCallPartOfFirstElementAccess(node)
		) {
			const selector = getStaticStringValue(node.arguments[0]);
			if (isSimpleIdSelector(selector)) {
				return {
					node: node.callee.property,
					messageId: MESSAGE_ID_ID_SELECTOR,
				};
			}
		}
	});

	context.on('BinaryExpression', node =>
		getQuerySelectorAllNullishComparisonProblem(node, context)
		?? getQuerySelectorUndefinedComparisonProblem(node, sourceCode));

	context.on('Identifier', node => getLengthCheckProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
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
