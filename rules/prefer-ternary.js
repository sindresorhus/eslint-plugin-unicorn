import {hasSideEffect, findVariable} from '@eslint-community/eslint-utils';
import {
	getAvailableVariableName,
	needsSemicolon,
	isSameReference,
	getIndentString,
	getParenthesizedText,
	getParenthesizedRange,
	shouldAddParenthesesToConditionalExpressionChild,
	getScopes,
	isParenthesized,
	getPreviousNode,
} from './utils/index.js';
import {extendFixRange} from './fix/index.js';

const messageId = 'prefer-ternary';
const suggestionMessageId = 'prefer-ternary/suggestion';

const isTernary = node => node?.type === 'ConditionalExpression';

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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const onlySingleLine = context.options[0] === 'only-single-line';
	const {sourceCode} = context;
	const scopeToNamesGeneratedByFixer = new WeakMap();
	const isSafeName = (name, scopes) => scopes.every(scope => {
		const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
		return !generatedNames || !generatedNames.has(name);
	});

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

	// eslint-disable-next-line complexity
	function merge(options, mergeOptions) {
		const {
			before = '',
			after = ';',
			consequent,
			alternate,
			node,
		} = options;

		const {
			checkThrowStatement,
			returnFalseIfNotMergeable,
		} = {
			checkThrowStatement: false,
			returnFalseIfNotMergeable: false,
			...mergeOptions,
		};

		if (!consequent || !alternate || consequent.type !== alternate.type) {
			return returnFalseIfNotMergeable ? false : options;
		}

		const {type, argument, delegate, left, right, operator} = consequent;

		if (
			type === 'ReturnStatement'
			&& !isTernary(argument)
			&& !isTernary(alternate.argument)
		) {
			return merge({
				before: `${before}return `,
				after,
				consequent: argument === null ? 'undefined' : argument,
				alternate: alternate.argument === null ? 'undefined' : alternate.argument,
				node,
			});
		}

		if (
			type === 'YieldExpression'
			&& delegate === alternate.delegate
			&& !isTernary(argument)
			&& !isTernary(alternate.argument)
		) {
			return merge({
				before: `${before}yield${delegate ? '*' : ''} (`,
				after: `)${after}`,
				consequent: argument === null ? 'undefined' : argument,
				alternate: alternate.argument === null ? 'undefined' : alternate.argument,
				node,
			});
		}

		if (
			type === 'AwaitExpression'
			&& !isTernary(argument)
			&& !isTernary(alternate.argument)
		) {
			return merge({
				before: `${before}await (`,
				after: `)${after}`,
				consequent: argument,
				alternate: alternate.argument,
				node,
			});
		}

		if (
			checkThrowStatement
			&& type === 'ThrowStatement'
			&& !isTernary(argument)
			&& !isTernary(alternate.argument)
		) {
			// `ThrowStatement` don't check nested

			// If `IfStatement` is not a `BlockStatement`, need to add `{}`
			const {parent} = node;
			const needBraces = parent && parent.type !== 'BlockStatement';
			return {
				type,
				before: `${before}${needBraces ? '{\n{{INDENT_STRING}}' : ''}const {{ERROR_NAME}} = `,
				after: `;\n{{INDENT_STRING}}throw {{ERROR_NAME}};${needBraces ? '\n}' : ''}`,
				consequent: argument,
				alternate: alternate.argument,
			};
		}

		if (
			type === 'AssignmentExpression'
			&& operator === alternate.operator
			&& !isTernary(left)
			&& !isTernary(alternate.left)
			&& !isTernary(right)
			&& !isTernary(alternate.right)
			&& isSameReference(left, alternate.left)
		) {
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

	function checkLetPlusIf(node) {
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

		if (
			variable.references.some(reference =>
				isReferenceInsideNode(reference, node.test)
				|| isReferenceInsideNode(reference, right),
			)
		) {
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

		const hasOtherWrites = variable.references.some(reference =>
			!reference.init
			&& reference.isWrite()
			&& !isReferenceInsideNode(reference, node),
		);
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
			return checkLetPlusIf(node);
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
			checkThrowStatement: true,
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

		const scope = sourceCode.getScope(node);
		problem.fix = function * (fixer) {
			const testText = getText(node.test);
			const consequentText = typeof result.consequent === 'string'
				? result.consequent
				: getText(result.consequent);
			const alternateText = typeof result.alternate === 'string'
				? result.alternate
				: getText(result.alternate);

			let {type, before, after} = result;

			let generateNewVariables = false;
			if (type === 'ThrowStatement') {
				const scopes = getScopes(scope);
				const errorName = getAvailableVariableName('error', scopes, isSafeName);

				for (const scope of scopes) {
					if (!scopeToNamesGeneratedByFixer.has(scope)) {
						scopeToNamesGeneratedByFixer.set(scope, new Set());
					}

					const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
					generatedNames.add(errorName);
				}

				const indentString = getIndentString(node, context);

				after = after
					.replace('{{INDENT_STRING}}', () => indentString)
					.replace('{{ERROR_NAME}}', () => errorName);
				before = before
					.replace('{{INDENT_STRING}}', () => indentString)
					.replace('{{ERROR_NAME}}', () => errorName);
				generateNewVariables = true;
			}

			let fixed = `${before}${testText} ? ${consequentText} : ${alternateText}${after}`;
			const tokenBefore = sourceCode.getTokenBefore(node);
			const shouldAddSemicolonBefore = needsSemicolon(tokenBefore, context, fixed);
			if (shouldAddSemicolonBefore) {
				fixed = `;${fixed}`;
			}

			yield fixer.replaceText(node, fixed);

			if (generateNewVariables) {
				yield extendFixRange(fixer, sourceCode.getRange(sourceCode.ast));
			}
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
			description: 'Prefer ternary expressions over simple `if-else` statements.',
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
	},
};

export default config;
