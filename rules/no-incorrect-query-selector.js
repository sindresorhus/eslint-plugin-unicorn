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
	isMethodCall,
	isStringLiteral,
} from './ast/index.js';

const MESSAGE_ID_FIRST_MATCH = 'first-match';
const MESSAGE_ID_ID_SELECTOR = 'id-selector';
const MESSAGE_ID_LENGTH_CHECK = 'length-check';

const messages = {
	[MESSAGE_ID_FIRST_MATCH]: 'Prefer `.querySelector()` when only the first match is used.',
	[MESSAGE_ID_ID_SELECTOR]: 'Prefer `.querySelector()` for a simple ID selector.',
	[MESSAGE_ID_LENGTH_CHECK]: 'Check `.length` instead of the `NodeList` object itself.',
};

const isQuerySelectorAllCall = node =>
	isMethodCall(node, {
		method: 'querySelectorAll',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& !isNodeValueNotDomNode(node.callee.object);

const isZeroLiteral = node => isLiteral(node, 0);

const isZeroIndexAccess = node =>
	node.type === 'MemberExpression'
	&& node.computed
	&& !node.optional
	&& isQuerySelectorAllCall(node.object)
	&& isZeroLiteral(node.property);

const isFirstItemCall = node =>
	isMethodCall(node, {
		methods: ['at', 'item'],
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& isQuerySelectorAllCall(node.callee.object)
	&& isZeroLiteral(node.arguments[0]);

const isFirstElementAccess = node => isZeroIndexAccess(node) || isFirstItemCall(node);

const isQuerySelectorAllCallPartOfFirstElementAccess = node =>
	isFirstElementAccess(node.parent)
	|| (
		node.parent.type === 'MemberExpression'
		&& node.parent.object === node
		&& isFirstItemCall(node.parent.parent)
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

const getStaticSelector = node => {
	if (isStringLiteral(node)) {
		return node.value;
	}

	if (node.type !== 'TemplateLiteral' || node.expressions.length > 0) {
		return;
	}

	const [quasi] = node.quasis;
	return quasi.value.cooked;
};

const isSimpleIdSelector = selector => /^#[A-Za-z_\-][\w\-]*$/v.test(selector);

const getQuerySelectorAllCallFromIdentifier = (node, sourceCode) => {
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
		|| !isQuerySelectorAllCall(definition.node.init)
	) {
		return;
	}

	return definition.node.init;
};

const getQuerySelectorAllCallForLengthCheck = (node, sourceCode) => {
	if (isQuerySelectorAllCall(node)) {
		return node;
	}

	return getQuerySelectorAllCallFromIdentifier(node, sourceCode);
};

const getLengthCheckProblem = (node, context) => {
	const {sourceCode} = context;
	const querySelectorAllCall = getQuerySelectorAllCallForLengthCheck(node, sourceCode);
	if (!querySelectorAllCall) {
		return;
	}

	const {node: booleanAncestor, isNegative} = getBooleanAncestor(node);
	if (!isControlFlowTest(booleanAncestor)) {
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MemberExpression', node => {
		if (
			!isZeroIndexAccess(node)
			|| isLeftHandSide(node)
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
		if (isFirstItemCall(node)) {
			if (isLeftHandSide(node)) {
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
			const selector = getStaticSelector(node.arguments[0]);
			if (isSimpleIdSelector(selector)) {
				return {
					node: node.callee.property,
					messageId: MESSAGE_ID_ID_SELECTOR,
				};
			}
		}
	});

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
	},
};

export default config;
