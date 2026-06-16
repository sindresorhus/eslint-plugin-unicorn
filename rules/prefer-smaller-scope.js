import {isCommentToken} from '@eslint-community/eslint-utils';
import {removeStatement} from './fix/index.js';

const MESSAGE_ID = 'prefer-smaller-scope';
const messages = {
	[MESSAGE_ID]: 'Move `{{name}}` into the block where it is used.',
};

const scopeBoundaryTypes = new Set([
	'ArrowFunctionExpression',
	'ClassDeclaration',
	'ClassExpression',
	'FunctionDeclaration',
	'FunctionExpression',
	'StaticBlock',
	'WithStatement',
]);

const isLetDeclarationCandidate = node =>
	Boolean(node.parent)
	&& (node.parent.type === 'Program' || node.parent.type === 'BlockStatement')
	&& node.kind === 'let'
	&& node.declarations.length === 1
	&& node.declarations[0].id.type === 'Identifier'
	&& !node.declarations[0].init;

function isDescendantWithoutScopeBoundary(node, ancestor) {
	let current = node.parent;
	while (current && current !== ancestor) {
		if (scopeBoundaryTypes.has(current.type)) {
			return false;
		}

		current = current.parent;
	}

	return current === ancestor;
}

function hasDynamicScope(node, visitorKeys) {
	if (node.type === 'WithStatement') {
		return true;
	}

	if (
		node.type === 'CallExpression'
		&& node.callee.type === 'Identifier'
		&& node.callee.name === 'eval'
	) {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];
		if (Array.isArray(value)) {
			if (value.some(childNode => childNode && hasDynamicScope(childNode, visitorKeys))) {
				return true;
			}
		} else if (value && hasDynamicScope(value, visitorKeys)) {
			return true;
		}
	}

	return false;
}

function getAssignment(writeReference) {
	const {identifier} = writeReference;
	const assignmentExpression = identifier.parent;

	if (
		assignmentExpression.type !== 'AssignmentExpression'
		|| assignmentExpression.operator !== '='
		|| assignmentExpression.left !== identifier
		|| assignmentExpression.parent.type !== 'ExpressionStatement'
	) {
		return;
	}

	const assignmentStatement = assignmentExpression.parent;
	const block = assignmentStatement.parent;
	if (block.type !== 'BlockStatement') {
		return;
	}

	return {
		assignmentExpression,
		assignmentStatement,
		block,
	};
}

function hasCommentNextTo(sourceCode, node, direction) {
	const token = direction === 'before'
		? sourceCode.getTokenBefore(node, {includeComments: true})
		: sourceCode.getTokenAfter(node, {includeComments: true});

	return Boolean(token && isCommentToken(token));
}

function isParenthesizedAssignmentExpression(sourceCode, assignmentExpression) {
	const tokenBefore = sourceCode.getTokenBefore(assignmentExpression);
	const tokenAfter = sourceCode.getTokenAfter(assignmentExpression);

	return tokenBefore?.value === '(' && tokenAfter?.value === ')';
}

const hasCommentsThatBlockFix = (sourceCode, declaration, assignmentStatement) =>
	sourceCode.getCommentsInside(declaration).length > 0
	|| sourceCode.getCommentsInside(assignmentStatement).length > 0
	|| hasCommentNextTo(sourceCode, declaration, 'before')
	|| hasCommentNextTo(sourceCode, declaration, 'after')
	|| hasCommentNextTo(sourceCode, assignmentStatement, 'before')
	|| hasCommentNextTo(sourceCode, assignmentStatement, 'after');

function getFix({
	sourceCode,
	declaration,
	assignmentExpression,
	assignmentStatement,
	name,
}) {
	return function * (fixer) {
		yield removeStatement(declaration, {sourceCode}, fixer);

		const declarationText = `const ${name} = `;

		if (isParenthesizedAssignmentExpression(sourceCode, assignmentExpression)) {
			yield fixer.replaceText(assignmentStatement, `${declarationText}${sourceCode.getText(assignmentExpression.right)};`);
			return;
		}

		const [assignmentStart] = sourceCode.getRange(assignmentExpression);
		const [rightStart] = sourceCode.getRange(assignmentExpression.right);
		yield fixer.replaceTextRange([assignmentStart, rightStart], declarationText);
	};
}

function getProblem(node, sourceCode) {
	if (!isLetDeclarationCandidate(node)) {
		return;
	}

	const [declarator] = node.declarations;
	const [variable] = sourceCode.getDeclaredVariables(declarator);
	const references = variable.references.filter(reference => !reference.init);
	const writeReferences = references.filter(reference => reference.isWrite());
	if (
		writeReferences.length !== 1
		|| references.every(reference => !reference.isRead())
	) {
		return;
	}

	const assignment = getAssignment(writeReferences[0]);
	if (!assignment) {
		return;
	}

	const {
		assignmentExpression,
		assignmentStatement,
		block,
	} = assignment;
	const [, declarationEnd] = sourceCode.getRange(node);
	const [assignmentStatementStart, assignmentStatementEnd] = sourceCode.getRange(assignmentStatement);

	if (
		!isDescendantWithoutScopeBoundary(block, node.parent)
		|| hasDynamicScope(node.parent, sourceCode.visitorKeys)
	) {
		return;
	}

	if (assignmentStatementStart < declarationEnd) {
		return;
	}

	if (references.some(reference => !isDescendantWithoutScopeBoundary(reference.identifier, block))) {
		return;
	}

	if (references.some(reference => reference.isRead() && sourceCode.getRange(reference.identifier)[0] < assignmentStatementEnd)) {
		return;
	}

	const problem = {
		node: declarator.id,
		messageId: MESSAGE_ID,
		data: {name: declarator.id.name},
	};

	if (
		!declarator.id.typeAnnotation
		&& !(
			isParenthesizedAssignmentExpression(sourceCode, assignmentExpression)
			&& assignmentExpression.right.type === 'SequenceExpression'
		)
		&& !hasCommentsThatBlockFix(sourceCode, node, assignmentStatement)
	) {
		problem.fix = getFix({
			sourceCode,
			declaration: node,
			assignmentExpression,
			assignmentStatement,
			name: declarator.id.name,
		});
	}

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('VariableDeclaration', node => getProblem(node, sourceCode));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer declaring variables in the smallest possible scope.',
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
