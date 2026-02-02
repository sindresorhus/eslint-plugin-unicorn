import {
	getAvailableVariableName,
	needsSemicolon,
	isSameReference,
	getIndentString,
	getParenthesizedText,
	shouldAddParenthesesToConditionalExpressionChild,
	getScopes,
	isParenthesized,
} from './utils/index.js';
import {extendFixRange} from './fix/index.js';

const messageId = 'prefer-ternary';

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

/**
 * Find a preceding uninitialized variable declaration that matches the assignment target.
 * @param {import('estree').IfStatement} ifStatement
 * @param {import('estree').Identifier} assignmentLeft
 * @returns {import('estree').VariableDeclaration | undefined}
 */
function findPrecedingVariableDeclaration(ifStatement, assignmentLeft) {
	const {parent} = ifStatement;
	if (parent.type !== 'BlockStatement' && parent.type !== 'Program') {
		return;
	}

	const {body} = parent;
	const nodeIndex = body.indexOf(ifStatement);
	if (nodeIndex <= 0) {
		return;
	}

	const previousStatement = body[nodeIndex - 1];
	if (previousStatement.type !== 'VariableDeclaration') {
		return;
	}

	// Must have a single declarator with no init
	if (previousStatement.declarations.length !== 1) {
		return;
	}

	const declarator = previousStatement.declarations[0];
	if (declarator.init !== null) {
		return;
	}

	// Assignment target must be a simple identifier
	if (assignmentLeft.type !== 'Identifier' || declarator.id.type !== 'Identifier') {
		return;
	}

	if (declarator.id.name !== assignmentLeft.name) {
		return;
	}

	return previousStatement;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0] ?? {};
	const onlySingleLine = options === 'always' ? false : options.onlySingleLine;
	const onlyAssignments = options === 'always' ? false : options.onlyAssignments;
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
			stopAfterAssignment,
		} = {
			checkThrowStatement: false,
			returnFalseIfNotMergeable: false,
			stopAfterAssignment: false,
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
			const returnResult = {
				before: `${before}return `,
				after,
				consequent: argument === null ? 'undefined' : argument,
				alternate: alternate.argument === null ? 'undefined' : alternate.argument,
				node,
			};

			// When stopAfterAssignment is true, don't recurse further
			// This keeps await/yield inside the ternary branches
			if (stopAfterAssignment) {
				return returnResult;
			}

			return merge(returnResult);
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

			// If `IfStatement` is not a `BlockStatement`, need add `{}`
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
			const assignmentResult = {
				before: `${before}${sourceCode.getText(left)} ${operator} `,
				after,
				consequent: right,
				alternate: alternate.right,
				node,
			};

			// When stopAfterAssignment is true, don't recurse further
			// This keeps await/yield inside the ternary branches
			if (stopAfterAssignment) {
				return assignmentResult;
			}

			return merge(assignmentResult);
		}

		return returnFalseIfNotMergeable ? false : options;
	}

	context.on('IfStatement', node => {
		if (
			(node.parent.type === 'IfStatement' && node.parent.alternate === node)
			|| node.test.type === 'ConditionalExpression'
			|| !node.consequent
			|| !node.alternate
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

		if (
			onlyAssignments
			&& consequent?.type !== 'AssignmentExpression'
			&& consequent?.type !== 'ReturnStatement'
		) {
			return;
		}

		const result = merge({node, consequent, alternate}, {
			checkThrowStatement: true,
			returnFalseIfNotMergeable: true,
			stopAfterAssignment: onlyAssignments,
		});

		if (!result) {
			return;
		}

		const problem = {node, messageId};

		// Don't fix if there are comments
		if (sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		// Check for preceding variable declaration when only-assignments is enabled
		let precedingVariableDeclaration;
		if (onlyAssignments && consequent?.type === 'AssignmentExpression' && consequent.operator === '=') {
			precedingVariableDeclaration = findPrecedingVariableDeclaration(node, consequent.left);
			// Don't combine if there are comments in the declaration
			if (precedingVariableDeclaration && sourceCode.getCommentsInside(precedingVariableDeclaration).length > 0) {
				precedingVariableDeclaration = undefined;
			}
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
					.replace('{{INDENT_STRING}}', indentString)
					.replace('{{ERROR_NAME}}', errorName);
				before = before
					.replace('{{INDENT_STRING}}', indentString)
					.replace('{{ERROR_NAME}}', errorName);
				generateNewVariables = true;
			}

			// Combine with preceding variable declaration if found
			if (precedingVariableDeclaration) {
				const {kind} = precedingVariableDeclaration;
				const variableName = precedingVariableDeclaration.declarations[0].id.name;
				const fixed = `${kind} ${variableName} = ${testText} ? ${consequentText} : ${alternateText};`;

				// Remove the variable declaration including trailing whitespace up to the if-else
				const declarationRange = sourceCode.getRange(precedingVariableDeclaration);
				const ifRange = sourceCode.getRange(node);
				yield fixer.removeRange([declarationRange[0], ifRange[0]]);
				yield fixer.replaceText(node, fixed);
				return;
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
		oneOf: [
			{enum: ['always']},
			{
				type: 'object',
				properties: {
					onlySingleLine: {type: 'boolean'},
					onlyAssignments: {type: 'boolean'},
				},
				additionalProperties: false,
			},
		],
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
		schema,
		defaultOptions: ['always'],
		messages: {
			[messageId]: 'This `if` statement can be replaced by a ternary expression.',
		},
	},
};

export default config;
