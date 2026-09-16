import {hasSideEffect, findVariable} from '@eslint-community/eslint-utils';
import {isBooleanLiteral, isFunction} from './ast/index.js';
import {
	needsSemicolon,
	isSameReference,
	getParenthesizedText,
	getParenthesizedRange,
	shouldAddParenthesesToConditionalExpressionChild,
	isParenthesized,
	getPreviousNode,
	getNextNode,
	getLastTrailingCommentOnSameLine,
	hasCommentInRange,
} from './utils/index.js';

const messageId = 'prefer-ternary';
const suggestionMessageId = 'prefer-ternary/suggestion';

function hasTernary(node, visitorKeys) {
	if (!node) {
		return false;
	}

	if (node.type === 'ConditionalExpression') {
		return true;
	}

	// Functions and classes have their own ternary nesting context.
	if (isFunction(node) || node.type === 'ClassExpression' || node.type === 'ClassDeclaration') {
		return false;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const child = node[key];
		for (const childNode of Array.isArray(child) ? child : [child]) {
			if (hasTernary(childNode, visitorKeys)) {
				return true;
			}
		}
	}

	return false;
}

// Preserve statement/class bodies and multiline containers, while allowing ordinary wrapped expressions.
function hasComplexStructure(node, sourceCode) {
	if (!node) {
		return false;
	}

	if (node.type === 'BlockStatement' || node.type === 'ClassBody') {
		return true;
	}

	if (
		['ObjectExpression', 'ArrayExpression', 'JSXElement', 'JSXFragment', 'TemplateLiteral'].includes(node.type)
		&& sourceCode.getLoc(node).start.line !== sourceCode.getLoc(node).end.line
	) {
		return true;
	}

	for (const key of sourceCode.visitorKeys[node.type] ?? []) {
		const child = node[key];
		for (const childNode of Array.isArray(child) ? child : [child]) {
			if (hasComplexStructure(childNode, sourceCode)) {
				return true;
			}
		}
	}

	return false;
}

function getNodeBody(node) {
	if (node.type === 'ExpressionStatement') {
		return getNodeBody(node.expression);
	}

	if (node.type === 'BlockStatement') {
		const body = node.body.filter(({type}) => type !== 'EmptyStatement');
		if (body.length === 1) {
			return getNodeBody(body[0]);
		}
	}

	return node;
}

const isSingleLineNode = (node, context) =>
	context.sourceCode.getLoc(node).start.line === context.sourceCode.getLoc(node).end.line;

// Keep bare returns as explicit exits rather than introducing an undefined value branch.
const isMergeableReturnStatement = (consequent, alternate, visitorKeys) =>
	consequent.type === 'ReturnStatement'
	&& alternate.type === 'ReturnStatement'
	&& consequent.argument !== null
	&& alternate.argument !== null
	&& !hasTernary(consequent.argument, visitorKeys)
	&& !hasTernary(alternate.argument, visitorKeys)
	&& !(isBooleanLiteral(consequent.argument) && isBooleanLiteral(alternate.argument));

const isMergeableAssignmentExpression = (consequent, alternate, visitorKeys) =>
	consequent.type === 'AssignmentExpression'
	&& alternate.type === 'AssignmentExpression'
	&& consequent.operator === alternate.operator
	&& !hasTernary(consequent.right, visitorKeys)
	&& !hasTernary(alternate.right, visitorKeys)
	&& isSameReference(consequent.left, alternate.left);

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const isOnlySingleLine = context.options[0] === 'only-single-line';
	const {sourceCode} = context;

	const getText = node => {
		let text = getParenthesizedText(node, context);
		if (
			!isParenthesized(node, sourceCode)
			&& (
				shouldAddParenthesesToConditionalExpressionChild(node)
				|| (node.type === 'ArrowFunctionExpression' && node.parent.type === 'IfStatement')
			)
		) {
			text = `(${text})`;
		}

		return text;
	};

	function merge(options, {returnFalseIfNotMergeable = false} = {}) {
		const {
			before = '',
			consequent,
			alternate,
		} = options;

		if (consequent.type !== alternate.type) {
			return returnFalseIfNotMergeable ? false : options;
		}

		if (isMergeableReturnStatement(consequent, alternate, sourceCode.visitorKeys)) {
			const {argument} = consequent;

			return merge({
				before: `${before}return `,
				consequent: argument,
				alternate: alternate.argument,
			});
		}

		if (isMergeableAssignmentExpression(consequent, alternate, sourceCode.visitorKeys)) {
			const {left, right, operator} = consequent;

			return merge({
				before: `${before}${getParenthesizedText(left, context)} ${operator} `,
				consequent: right,
				alternate: alternate.right,
			});
		}

		return returnFalseIfNotMergeable ? false : options;
	}

	// eslint-disable-next-line complexity
	function getLetPlusIfProblem(node) {
		const consequentBody = getNodeBody(node.consequent);
		if (
			consequentBody.type !== 'AssignmentExpression'
			|| consequentBody.operator !== '='
		) {
			return;
		}

		const {left, right} = consequentBody;

		if (left.type !== 'Identifier') {
			return;
		}

		const previousNode = getPreviousNode(node, context);
		if (
			!previousNode
			|| previousNode.type !== 'VariableDeclaration'
			|| previousNode.kind !== 'let'
			|| previousNode.declarations.length !== 1
		) {
			return;
		}

		const [declarator] = previousNode.declarations;
		if (
			declarator.id.type !== 'Identifier'
			|| declarator.id.name !== left.name
			|| !declarator.init
		) {
			return;
		}

		const expressions = [node.test, right, declarator.init];

		if (
			expressions.some(expression => hasTernary(expression, sourceCode.visitorKeys) || hasComplexStructure(expression, sourceCode))
			|| (isOnlySingleLine && expressions.some(expression => !isSingleLineNode(expression, context)))
		) {
			return;
		}

		if (hasSideEffect(declarator.init, sourceCode)) {
			return;
		}

		const scope = sourceCode.getScope(node);
		const variable = findVariable(scope, left);
		if (!variable) {
			return;
		}

		const isReferenceInsideNode = (reference, targetNode) => {
			const [referenceStart, referenceEnd] = sourceCode.getRange(reference.identifier);
			const [nodeStart, nodeEnd] = sourceCode.getRange(targetNode);
			return referenceStart >= nodeStart && referenceEnd <= nodeEnd;
		};

		if (variable.references.some(reference => isReferenceInsideNode(reference, node.test) || isReferenceInsideNode(reference, right))) {
			return;
		}

		// Preserve commented decisions as statements, without reporting.
		if (hasCommentInRange(context, [sourceCode.getRange(previousNode)[0], sourceCode.getRange(node)[1]])) {
			return;
		}

		const hasOtherWrites = variable.references.some(reference => !reference.init && reference.isWrite() && !isReferenceInsideNode(reference, node));
		const keyword = hasOtherWrites ? 'let' : 'const';

		return {
			node,
			messageId,
			suggest: [
				{
					messageId: suggestionMessageId,
					* fix(fixer) {
						const testText = getText(node.test);
						const consequentText = getText(right);
						const alternateText = getText(declarator.init);

						const ternary = `${testText} ? ${consequentText} : ${alternateText}`;

						const letToken = sourceCode.getFirstToken(previousNode);
						yield fixer.replaceText(letToken, keyword);

						yield fixer.replaceTextRange(getParenthesizedRange(declarator.init, context), ternary);

						const [, declarationEnd] = sourceCode.getRange(previousNode);
						const [, ifEnd] = sourceCode.getRange(node);
						const nextToken = sourceCode.getTokenAfter(node);
						const addSemicolon = nextToken && needsSemicolon(sourceCode.getLastToken(previousNode), context, nextToken.value);
						yield fixer.replaceTextRange([declarationEnd, ifEnd], addSemicolon ? ';' : '');
					},
				},
			],
		};
	}

	function getIfBranchesProblem(node, alternateNode = node.alternate) {
		if (
			(node.parent.type === 'IfStatement' && node.parent.alternate === node)
			|| hasTernary(node.test, sourceCode.visitorKeys)
		) {
			return;
		}

		const consequent = getNodeBody(node.consequent);
		const alternate = getNodeBody(alternateNode);

		if (
			isOnlySingleLine
			&& [consequent, alternate, node.test].some(node => !isSingleLineNode(node, context))
		) {
			return;
		}

		const result = merge({consequent, alternate}, {
			returnFalseIfNotMergeable: true,
		});

		if (!result || [node.test, result.consequent, result.alternate].some(expression => hasComplexStructure(expression, sourceCode))) {
			return;
		}

		const isFlatReturn = !node.alternate;
		const replacementRange = isFlatReturn
			? [sourceCode.getRange(node)[0], sourceCode.getRange(alternateNode)[1]]
			: sourceCode.getRange(node);

		// Preserve commented decisions as statements, without reporting.
		if (
			hasCommentInRange(context, replacementRange)
			|| (isFlatReturn && getLastTrailingCommentOnSameLine(context, alternateNode))
		) {
			return;
		}

		return {
			node,
			messageId,
			* fix(fixer) {
				const testText = getText(node.test);
				const consequentText = getText(result.consequent);
				const alternateText = getText(result.alternate);

				const {before} = result;

				let fixed = `${before}${testText} ? ${consequentText} : ${alternateText};`;
				const tokenBefore = sourceCode.getTokenBefore(node);
				const shouldAddSemicolonBefore = needsSemicolon(tokenBefore, context, fixed);
				if (shouldAddSemicolonBefore) {
					fixed = `;${fixed}`;
				}

				yield fixer.replaceTextRange(replacementRange, fixed);
			},
		};
	}

	context.on('IfStatement', node => {
		if (!node.alternate) {
			const nextNode = getNextNode(node, context);
			if (nextNode?.type === 'ReturnStatement') {
				return getIfBranchesProblem(node, nextNode) ?? getLetPlusIfProblem(node);
			}

			return getLetPlusIfProblem(node);
		}

		return getIfBranchesProblem(node);
	});
};

const schema = [
	{
		enum: ['always', 'only-single-line'],
		description: 'Whether to always prefer ternary, or only for single-line expressions.',
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
			description: 'Prefer ternary expressions over simple `if` statements that return or assign values.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: ['always'],
		messages: {
			[messageId]: 'This `if` statement can be replaced by a ternary expression.',
			[suggestionMessageId]: 'Use a ternary expression.',
		},
		languages: [
			'js/js',
		],
	},
};

export default config;
