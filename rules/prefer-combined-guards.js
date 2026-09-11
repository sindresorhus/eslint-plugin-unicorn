import {
	getParenthesizedText,
	getPreviousNode,
	hasCommentInRange,
	isParenthesized,
	isProcessExitCall,
	isTypeScriptExpressionWrapper,
	shouldAddParenthesesToLogicalExpressionChild,
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

function getExitStatement(node, context) {
	if (node?.type !== 'IfStatement' || node.alternate) {
		return;
	}

	let {consequent} = node;
	if (consequent.type === 'BlockStatement') {
		if (consequent.body.length !== 1) {
			return;
		}

		[consequent] = consequent.body;
	}

	if (
		exitStatementTypes.has(consequent.type)
		|| (
			consequent.type === 'ExpressionStatement'
			&& isProcessExitCall(consequent.expression, context)
		)
	) {
		return consequent;
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
			sourceCode.parserServices?.esTreeNodeToTSNodeMap
			|| containsTaggedTemplate(expression, sourceCode.visitorKeys)
		),
	);
};

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

	context.on('IfStatement', node => {
		const exit = getExitStatement(node, context);
		if (!exit) {
			return;
		}

		const previousNode = getPreviousNode(node, context);
		const previousExit = getExitStatement(previousNode, context);
		if (
			!previousExit
			|| previousExit.type !== exit.type
			// Preserve significant whitespace, including ASI inside returned functions.
			|| getExitText(previousExit, sourceCode) !== getExitText(exit, sourceCode)
			|| isExitUnsafeToCombine(exit, sourceCode)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			* fix(fixer, {abort}) {
				const range = [sourceCode.getRange(previousNode)[0], sourceCode.getRange(node)[1]];
				if (hasCommentInRange(context, range)) {
					abort();
				}

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
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
