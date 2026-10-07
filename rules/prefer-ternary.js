import {hasSideEffect, findVariable} from '@eslint-community/eslint-utils';
import {isBooleanLiteral, isFunction} from './ast/index.js';
import {
	needsSemicolon,
	isSameReference,
	isSameTokens,
	getConditionalExpressionChildText,
	getParenthesizedText,
	getParenthesizedRange,
	isParenthesized,
	getPreviousNode,
	getNextNode,
	getLastTrailingCommentOnSameLine,
	getCommentSafeProblem,
	getVisitorChildNodes,
	withTypeInformation,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const messageId = 'prefer-ternary';
const suggestionMessageId = 'prefer-ternary/suggestion';

function hasTernary(node, visitorKeys) {
	if (node.type === 'ConditionalExpression') {
		return true;
	}

	// Functions and classes have their own ternary nesting context.
	if (isFunction(node) || node.type === 'ClassExpression' || node.type === 'ClassDeclaration') {
		return false;
	}

	return getVisitorChildNodes(node, visitorKeys).some(childNode => hasTernary(childNode, visitorKeys));
}

// Preserve statement/class bodies and multiline containers, while allowing ordinary wrapped expressions.
function hasComplexStructure(node, sourceCode) {
	if (node.type === 'BlockStatement' || node.type === 'ClassBody') {
		return true;
	}

	if (
		['ObjectExpression', 'ArrayExpression', 'JSXElement', 'JSXFragment', 'TemplateLiteral'].includes(node.type)
		&& sourceCode.getLoc(node).start.line !== sourceCode.getLoc(node).end.line
	) {
		return true;
	}

	return getVisitorChildNodes(node, sourceCode.visitorKeys).some(childNode => hasComplexStructure(childNode, sourceCode));
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

const isArrowFunction = node => unwrapTypeScriptExpression(node).type === 'ArrowFunctionExpression';

// Keep bare returns as explicit exits rather than introducing an undefined value branch.
const isMergeableReturnStatement = (consequent, alternate, visitorKeys) =>
	consequent.type === 'ReturnStatement'
	&& alternate.type === 'ReturnStatement'
	&& consequent.argument !== null
	&& alternate.argument !== null
	&& !hasTernary(consequent.argument, visitorKeys)
	&& !hasTernary(alternate.argument, visitorKeys)
	&& !(isBooleanLiteral(consequent.argument) && isBooleanLiteral(alternate.argument));

function hasSameAssignmentTargetTypes(consequent, alternate, context) {
	const {sourceCode} = context;
	// Pattern containers have synthesized types; compare their expressions instead.
	if (
		!['ArrayPattern', 'ObjectPattern', 'RestElement', 'Property', 'AssignmentPattern'].includes(consequent.type)
		&& withTypeInformation(consequent, context, ({type}) => type !== sourceCode.parserServices.getTypeAtLocation(alternate))
	) {
		return false;
	}

	const alternateChildren = [...getVisitorChildNodes(alternate, sourceCode.visitorKeys)];
	return getVisitorChildNodes(consequent, sourceCode.visitorKeys).every((childNode, index) => hasSameAssignmentTargetTypes(childNode, alternateChildren[index], context));
}

const isMergeableAssignmentExpression = (consequent, alternate, context) =>
	consequent.type === 'AssignmentExpression'
	&& alternate.type === 'AssignmentExpression'
	// Keep member target evaluation and compound/logical reads after the condition.
	&& consequent.operator === '='
	&& alternate.operator === '='
	&& !hasTernary(consequent.right, context.sourceCode.visitorKeys)
	&& !hasTernary(alternate.right, context.sourceCode.visitorKeys)
	&& (
		(
			// Direct arrow assignments infer their names from the identifier target.
			unwrapTypeScriptExpression(consequent.left).type === 'Identifier'
			&& !isArrowFunction(consequent.right)
			&& !isArrowFunction(alternate.right)
			&& isSameReference(consequent.left, alternate.left)
		)
		|| (
			consequent.left.type === alternate.left.type
			&& (consequent.left.type === 'ArrayPattern' || consequent.left.type === 'ObjectPattern')
			// Token matching ignores line breaks, which can change statement semantics.
			&& !hasComplexStructure(consequent.left, context.sourceCode)
			&& !hasComplexStructure(alternate.left, context.sourceCode)
			&& isSameTokens(context.sourceCode.getTokens(consequent.left), context.sourceCode.getTokens(alternate.left))
		)
	)
	// Moving the target outside the branches can lose narrowed contextual types.
	&& (
		!context.sourceCode.parserServices?.program
		|| (
			isSameTokens(context.sourceCode.getTokens(consequent.left), context.sourceCode.getTokens(alternate.left))
			&& hasSameAssignmentTargetTypes(consequent.left, alternate.left, context)
		)
	);

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const isOnlySingleLine = context.options[0] === 'only-single-line';
	const {sourceCode} = context;

	const getText = node => {
		const text = getConditionalExpressionChildText(node, context);
		return (
			node.type === 'ArrowFunctionExpression'
			&& node.parent.type === 'IfStatement'
			&& !isParenthesized(node, context)
		)
			? `(${text})`
			: text;
	};

	function merge(options, {returnFalseIfNotMergeable = false} = {}) {
		const {
			before = '',
			consequent,
			alternate,
		} = options;

		if (consequent.type !== alternate.type) {
			return !returnFalseIfNotMergeable && options;
		}

		if (isMergeableReturnStatement(consequent, alternate, sourceCode.visitorKeys)) {
			const {argument} = consequent;

			return merge({
				before: `${before}return `,
				consequent: argument,
				alternate: alternate.argument,
			});
		}

		if (isMergeableAssignmentExpression(consequent, alternate, context)) {
			const {left, right, operator} = consequent;

			const result = {
				before: `${before}${getParenthesizedText(left, context)} ${operator} `,
				consequent: right,
				alternate: alternate.right,
			};

			// Destructuring evaluates its RHS before its targets; keep nested assignments after the condition.
			if (left.type === 'ArrayPattern' || left.type === 'ObjectPattern') {
				return result;
			}

			return merge(result);
		}

		return !returnFalseIfNotMergeable && options;
	}

	// Convert an initialized `let` followed by one conditional reassignment.
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
			// Inferred declaration types can lose contextual typing after introducing a ternary.
			|| (sourceCode.parserServices?.program && !declarator.id.typeAnnotation)
			|| [declarator.init, right].some(expression => isArrowFunction(expression))
		) {
			return;
		}

		const expressions = [node.test, right, declarator.init];

		if (expressions.some(expression =>
			hasTernary(expression, sourceCode.visitorKeys)
			|| hasComplexStructure(expression, sourceCode)
			|| (isOnlySingleLine && !isSingleLineNode(expression, context)))) {
			return;
		}

		// The rewrite builds `test ? right : init`, so the initializer moves from before the test to after it. A test with a side effect would observe the change.
		if (hasSideEffect(declarator.init, sourceCode) || hasSideEffect(node.test, sourceCode)) {
			return;
		}

		// The `let` declaration right before the `if` declares it
		const variable = findVariable(sourceCode.getScope(node), left);

		const isReferenceInsideNode = (reference, targetNode) => {
			const [referenceStart, referenceEnd] = sourceCode.getRange(reference.identifier);
			const [nodeStart, nodeEnd] = sourceCode.getRange(targetNode);
			return referenceStart >= nodeStart && referenceEnd <= nodeEnd;
		};

		if (variable.references.some(reference => isReferenceInsideNode(reference, node.test) || isReferenceInsideNode(reference, right))) {
			return;
		}

		// Report commented decisions without offering edits that would remove comments.
		// Inspect comments entirely within the affected statement range.
		const commentRange = [sourceCode.getRange(previousNode)[0], sourceCode.getRange(node)[1]];
		// Preserve comments and allow ESLint directives to suppress the report.
		const hasOtherWrites = variable.references.some(reference => !reference.init && reference.isWrite() && !isReferenceInsideNode(reference, node));

		return getCommentSafeProblem(context, {
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
						const keyword = hasOtherWrites ? 'let' : 'const';
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
		}, commentRange);
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

		const trailingComment = isFlatReturn && getLastTrailingCommentOnSameLine(context, alternateNode);
		const commentRange = trailingComment
			? [replacementRange[0], sourceCode.getRange(trailingComment)[1]]
			: replacementRange;

		// Report commented decisions without offering edits that would remove comments.
		// Preserve comments and allow ESLint directives to suppress the report.
		return getCommentSafeProblem(context, {
			node,
			messageId,
			* fix(fixer) {
				const testText = getText(node.test);
				const consequentText = getText(result.consequent);
				const alternateText = getText(result.alternate);

				const {before} = result;

				let fixed = `${before}${testText} ? ${consequentText} : ${alternateText}`;
				if (consequent.type === 'AssignmentExpression' && consequent.left.type === 'ObjectPattern') {
					fixed = `(${fixed})`;
				}

				fixed += ';';
				const tokenBefore = sourceCode.getTokenBefore(node);
				const shouldAddSemicolonBefore = needsSemicolon(tokenBefore, context, fixed);
				if (shouldAddSemicolonBefore) {
					fixed = `;${fixed}`;
				}

				yield fixer.replaceTextRange(replacementRange, fixed);
			},
		}, commentRange);
	}

	context.on('IfStatement', node => {
		if (!node.alternate) {
			const nextNode = getNextNode(node, context);
			return nextNode?.type === 'ReturnStatement' ? getIfBranchesProblem(node, nextNode) ?? getLetPlusIfProblem(node) : getLetPlusIfProblem(node);
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
