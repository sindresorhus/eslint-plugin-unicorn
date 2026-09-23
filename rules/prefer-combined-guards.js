import {
	getParenthesizedText,
	getPreviousNode,
	hasCommentInRange,
	isParenthesized,
	isProcessExitCall,
	isTypeScriptExpressionWrapper,
	shouldAddParenthesesToLogicalExpressionChild,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-combined-guards';
const messages = {
	[MESSAGE_ID]: 'Combine this guard with the previous one using `||`.',
};

const exitStatementTypes = new Set([
	'ReturnStatement',
	'ThrowStatement',
	'BreakStatement',
	'ContinueStatement',
]);

function isSimpleCondition(node, allowLogicalOr = true) {
	node = unwrapTypeScriptExpression(node);

	switch (node.type) {
		case 'LogicalExpression': {
			return allowLogicalOr
				&& node.operator === '||'
				&& isSimpleCondition(node.left)
				&& isSimpleCondition(node.right);
		}

		case 'UnaryExpression':
		case 'AwaitExpression': {
			return isSimpleCondition(node.argument, false);
		}

		case 'ConditionalExpression':
		case 'AssignmentExpression':
		case 'SequenceExpression':
		case 'ArrowFunctionExpression':
		case 'YieldExpression': {
			return false;
		}

		default: {
			return true;
		}
	}
}

function getGuardStatements(node, context, checkMultiStatementBodies) {
	if (node?.type !== 'IfStatement' || node.alternate) {
		return;
	}

	const {consequent} = node;
	const statements = consequent.type === 'BlockStatement' ? consequent.body : [consequent];
	if (
		statements.length === 0
		|| (statements.length > 1 && !checkMultiStatementBodies)
	) {
		return;
	}

	const exit = statements.at(-1);
	if (
		exitStatementTypes.has(exit.type)
		|| (
			exit.type === 'ExpressionStatement'
			&& isProcessExitCall(exit.expression, context)
		)
	) {
		return statements;
	}
}

const getExitText = (node, sourceCode) => {
	const value = node.expression ?? node.argument ?? node.label;
	return value ? sourceCode.getText(value) : '';
};

function containsTaggedTemplate(node, visitorKeys) {
	if (node.type === 'TaggedTemplateExpression') {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const child = node[key];
		for (const childNode of Array.isArray(child) ? child : [child]) {
			if (childNode?.type && containsTaggedTemplate(childNode, visitorKeys)) {
				return true;
			}
		}
	}

	return false;
}

const isExitUnsafeToCombine = (node, sourceCode) => {
	const expression = node.type === 'ExpressionStatement'
		? node.expression.arguments[0]
		: node.argument;

	return Boolean(
		expression
		&& (
			(
				sourceCode.parserServices?.esTreeNodeToTSNodeMap
				&& expression.type !== 'Literal'
			)
			|| containsTaggedTemplate(expression, sourceCode.visitorKeys)
		),
	);
};

const canCombineBodies = (previousStatements, statements, sourceCode) =>
	previousStatements.length === statements.length
	&& statements.slice(0, -1).every((statement, index) =>
		sourceCode.getText(statement) === sourceCode.getText(previousStatements[index])
		&& !containsTaggedTemplate(statement, sourceCode.visitorKeys));

// Node types that TypeScript can narrow.
const referenceTypes = new Set([
	'Identifier',
	'MemberExpression',
	'ThisExpression',
	'JSXIdentifier',
	'JSXMemberExpression',
]);

function hasSameReferenceTypes(previousNode, node, parserServices, visitorKeys) {
	if (
		referenceTypes.has(node.type)
		&& parserServices.getTypeAtLocation(previousNode) !== parserServices.getTypeAtLocation(node)
	) {
		return false;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const children = [node[key]].flat();
		const previousChildren = [previousNode[key]].flat();
		for (const [index, child] of children.entries()) {
			if (child?.type && !hasSameReferenceTypes(previousChildren[index], child, parserServices, visitorKeys)) {
				return false;
			}
		}
	}

	return true;
}

/*
Statements before the exit may depend on each guard's TypeScript narrowing. The combined body sees the union of both narrowed types, so with full type information, combine them only when every reference has the same type in both bodies.
*/
function isNarrowingPreserved(previousStatements, statements, sourceCode) {
	const {parserServices, visitorKeys} = sourceCode;
	if (statements.length === 1 || !parserServices?.esTreeNodeToTSNodeMap) {
		return true;
	}

	return Boolean(parserServices.program)
		&& statements.slice(0, -1).every((statement, index) => hasSameReferenceTypes(previousStatements[index], statement, parserServices, visitorKeys));
}

function getConditionText(node, property, context) {
	if (isParenthesized(node, context)) {
		return getParenthesizedText(node, context);
	}

	const text = context.sourceCode.getText(node);
	return isTypeScriptExpressionWrapper(node)
		|| shouldAddParenthesesToLogicalExpressionChild(node, {operator: '||', property})
		? `(${text})`
		: text;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {checkCompoundConditions, checkMultiStatementBodies} = context.options[0];

	context.on('IfStatement', node => {
		const statements = getGuardStatements(node, context, checkMultiStatementBodies);
		if (!statements) {
			return;
		}

		const previousNode = getPreviousNode(node, context);
		const previousStatements = getGuardStatements(previousNode, context, checkMultiStatementBodies);
		if (!previousStatements) {
			return;
		}

		const exit = statements.at(-1);
		const previousExit = previousStatements.at(-1);
		if (
			previousExit.type !== exit.type
			// Preserve significant whitespace, including ASI inside returned functions.
			|| getExitText(previousExit, sourceCode) !== getExitText(exit, sourceCode)
			|| isExitUnsafeToCombine(exit, sourceCode)
			|| !canCombineBodies(previousStatements, statements, sourceCode)
			|| (!checkCompoundConditions && (!isSimpleCondition(previousNode.test) || !isSimpleCondition(node.test)))
		) {
			return;
		}

		const range = [sourceCode.getRange(previousNode)[0], sourceCode.getRange(node)[1]];
		// Comments can describe distinct exit reasons that combining guards would obscure.
		if (sourceCode.getCommentsBefore(previousNode).length > 0 || hasCommentInRange(context, range)) {
			return;
		}

		if (!isNarrowingPreserved(previousStatements, statements, sourceCode)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			* fix(fixer) {
				const left = getConditionText(previousNode.test, 'left', context);
				const right = getConditionText(node.test, 'right', context);
				const closingParenthesis = sourceCode.getTokenBefore(node.consequent);
				// Retain the second body and its trailing boundary to preserve semicolon insertion.
				const suffix = sourceCode.text.slice(sourceCode.getRange(closingParenthesis)[1], range[1]);
				yield fixer.replaceTextRange(range, `if (${left} || ${right})${suffix}`);
			},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer combining consecutive guards with identical exit statements.',
			recommended: true,
		},
		fixable: 'code',
		schema: [{
			type: 'object',
			properties: {
				checkCompoundConditions: {
					type: 'boolean',
					description: 'Check guards with compound conditions.',
				},
				checkMultiStatementBodies: {
					type: 'boolean',
					description: 'Check guards whose bodies run the same statements before the exit.',
				},
			},
			additionalProperties: false,
		}],
		defaultOptions: [{checkCompoundConditions: false, checkMultiStatementBodies: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
