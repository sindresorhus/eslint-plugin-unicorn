import {hasSideEffect, findVariable} from '@eslint-community/eslint-utils';
import {
	needsSemicolon,
	isSameReference,
	getParenthesizedText,
	getParenthesizedRange,
	shouldAddParenthesesToConditionalExpressionChild,
	isParenthesized,
	getPreviousNode,
} from './utils/index.js';

const messageId = 'prefer-ternary';
const suggestionMessageId = 'prefer-ternary/suggestion';

const isTernary = node => node?.type === 'ConditionalExpression';
const isBooleanLiteral = node => node?.type === 'Literal' && typeof node.value === 'boolean';

function getNodeBody(node) {
	/* c8 ignore next 3 */
	if (!node) {
		return;
	}

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

const isMergeableReturnStatement = (consequent, alternate) =>
	consequent.type === 'ReturnStatement'
	&& alternate.type === 'ReturnStatement'
	&& !isTernary(consequent.argument)
	&& !isTernary(alternate.argument)
	&& !(isBooleanLiteral(consequent.argument) && isBooleanLiteral(alternate.argument));

const isMergeableAssignmentExpression = (consequent, alternate) =>
	consequent.type === 'AssignmentExpression'
	&& alternate.type === 'AssignmentExpression'
	&& consequent.operator === alternate.operator
	&& !isTernary(consequent.left)
	&& !isTernary(alternate.left)
	&& !isTernary(consequent.right)
	&& !isTernary(alternate.right)
	&& isSameReference(consequent.left, alternate.left);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const onlySingleLine = context.options[0] === 'only-single-line';
	const {sourceCode} = context;

	const getText = node => {
		let text = getParenthesizedText(node, context);
		if (
			!isParenthesized(node, sourceCode)
			&& shouldAddParenthesesToConditionalExpressionChild(node)
		) {
			text = `(${text})`;
		}

		return text;
	};

	function merge(options, {returnFalseIfNotMergeable = false} = {}) {
		const {
			before = '',
			after = ';',
			consequent,
			alternate,
			node,
		} = options;

		if (!consequent || !alternate || consequent.type !== alternate.type) {
			return returnFalseIfNotMergeable ? false : options;
		}

		if (isMergeableReturnStatement(consequent, alternate)) {
			const {argument} = consequent;

			return merge({
				before: `${before}return `,
				after,
				consequent: argument === null ? 'undefined' : argument,
				alternate: alternate.argument === null ? 'undefined' : alternate.argument,
				node,
			});
		}

		if (isMergeableAssignmentExpression(consequent, alternate)) {
			const {left, right, operator} = consequent;

			return merge({
				before: `${before}${getParenthesizedText(left, context)} ${operator} `,
				after,
				consequent: right,
				alternate: alternate.right,
				node,
			});
		}

		return returnFalseIfNotMergeable ? false : options;
	}

	// eslint-disable-next-line complexity
	function getLetPlusIfProblem(node) {
		const consequentBody = getNodeBody(node.consequent);
		if (
			!consequentBody
			|| consequentBody.type !== 'AssignmentExpression'
			|| consequentBody.operator !== '='
		) {
			return;
		}

		const {left, right} = consequentBody;

		if (left.type !== 'Identifier') {
			return;
		}

		if (isTernary(node.test) || isTernary(right)) {
			return;
		}

		if (
			onlySingleLine
			&& [node.test, right].some(n => !isSingleLineNode(n, context))
		) {
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
			|| isTernary(declarator.init)
		) {
			return;
		}

		if (
			onlySingleLine
			&& !isSingleLineNode(declarator.init, context)
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

		const problem = {node, messageId};

		const hasComments = sourceCode.getCommentsInside(node).length > 0
			|| sourceCode.getCommentsInside(previousNode).length > 0
			|| sourceCode.getTokensBetween(previousNode, node, {includeComments: true})
				.some(token => token.type === 'Block' || token.type === 'Line');

		if (hasComments) {
			return problem;
		}

		const hasOtherWrites = variable.references.some(reference => !reference.init && reference.isWrite() && !isReferenceInsideNode(reference, node));
		const keyword = hasOtherWrites ? 'let' : 'const';

		problem.suggest = [
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
		];

		return problem;
	}

	context.on('IfStatement', node => {
		if (!node.alternate) {
			return getLetPlusIfProblem(node);
		}

		if (
			(node.parent.type === 'IfStatement' && node.parent.alternate === node)
			|| node.test.type === 'ConditionalExpression'
			|| !node.consequent
		) {
			return;
		}

		const consequent = getNodeBody(node.consequent);
		const alternate = getNodeBody(node.alternate);

		if (
			onlySingleLine
			&& [consequent, alternate, node.test].some(node => !isSingleLineNode(node, context))
		) {
			return;
		}

		const result = merge({node, consequent, alternate}, {
			returnFalseIfNotMergeable: true,
		});

		if (!result) {
			return;
		}

		const problem = {node, messageId};

		// Don't fix if there are comments
		if (sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		problem.fix = function * (fixer) {
			const testText = getText(node.test);
			const consequentText = typeof result.consequent === 'string'
				? result.consequent
				: getText(result.consequent);
			const alternateText = typeof result.alternate === 'string'
				? result.alternate
				: getText(result.alternate);

			const {before, after} = result;

			let fixed = `${before}${testText} ? ${consequentText} : ${alternateText}${after}`;
			const tokenBefore = sourceCode.getTokenBefore(node);
			const shouldAddSemicolonBefore = needsSemicolon(tokenBefore, context, fixed);
			if (shouldAddSemicolonBefore) {
				fixed = `;${fixed}`;
			}

			yield fixer.replaceText(node, fixed);
		};

		return problem;
	});
};

const schema = [
	{
		enum: ['always', 'only-single-line'],
		description: 'Whether to always prefer ternary, or only for single-line expressions.',
	},
];

/** @type {import('eslint').Rule.RuleModule} */
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
