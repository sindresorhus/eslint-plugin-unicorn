import {isCommentToken} from '@eslint-community/eslint-utils';
import {removeExpressionStatement} from './fix/index.js';

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
]);

const isLetDeclarationCandidate = node =>
	Boolean(node.parent)
	&& (node.parent.type === 'Program' || node.parent.type === 'BlockStatement')
	&& node.kind === 'let'
	&& node.declarations.length === 1
	&& node.declarations[0].id.type === 'Identifier'
	&& !node.declarations[0].init;

const isInsideNode = (sourceCode, innerNode, outerNode) => {
	const [innerStart, innerEnd] = sourceCode.getRange(innerNode);
	const [outerStart, outerEnd] = sourceCode.getRange(outerNode);
	return innerStart >= outerStart && innerEnd <= outerEnd;
};

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

function isReferenceInsideBlock(reference, block, sourceCode) {
	if (!isInsideNode(sourceCode, reference.identifier, block)) {
		return false;
	}

	let current = reference.identifier.parent;
	while (current && current !== block) {
		if (scopeBoundaryTypes.has(current.type)) {
			return false;
		}

		current = current.parent;
	}

	return current === block;
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
	name,
}) {
	return function * (fixer) {
		yield removeExpressionStatement(declaration, {sourceCode}, fixer);

		const [assignmentStart] = sourceCode.getRange(assignmentExpression);
		const [rightStart] = sourceCode.getRange(assignmentExpression.right);
		yield fixer.replaceTextRange([assignmentStart, rightStart], `const ${name} = `);
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
		|| !references.some(reference => reference.isRead())
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

	if (!isDescendantWithoutScopeBoundary(block, node.parent)) {
		return;
	}

	if (assignmentStatementStart < declarationEnd) {
		return;
	}

	if (!references.every(reference => isReferenceInsideBlock(reference, block, sourceCode))) {
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
		&& !isParenthesizedAssignmentExpression(sourceCode, assignmentExpression)
		&& !hasCommentsThatBlockFix(sourceCode, node, assignmentStatement)
	) {
		problem.fix = getFix({
			sourceCode,
			declaration: node,
			assignmentExpression,
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
