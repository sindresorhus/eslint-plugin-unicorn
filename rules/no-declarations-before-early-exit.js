import {isCommentToken} from '@eslint-community/eslint-utils';

const MESSAGE_ID = 'no-declarations-before-early-exit';
const messages = {
	[MESSAGE_ID]: 'Move this declaration after the early exit.',
};

const isLetOrConstDeclaration = node =>
	node.type === 'VariableDeclaration'
	&& (node.kind === 'let' || node.kind === 'const');

const getLastStatement = node => {
	if (node.type !== 'BlockStatement') {
		return node;
	}

	return node.body.at(-1);
};

const isEarlyExitStatement = node =>
	node?.type === 'ReturnStatement'
	|| node?.type === 'ThrowStatement'
	|| node?.type === 'BreakStatement'
	|| node?.type === 'ContinueStatement';

function branchDefinitelyExits(node) {
	const statement = getLastStatement(node);
	if (isEarlyExitStatement(statement)) {
		return true;
	}

	return statement?.type === 'IfStatement'
		&& statement.alternate
		&& branchDefinitelyExits(statement.consequent)
		&& branchDefinitelyExits(statement.alternate);
}

function isGuardStatement(node) {
	if (node.type !== 'IfStatement') {
		return false;
	}

	const consequentExits = branchDefinitelyExits(node.consequent);
	const alternateExits = node.alternate && branchDefinitelyExits(node.alternate);
	return consequentExits !== Boolean(alternateExits);
}

const isSimpleInitializer = node =>
	!node
	|| node.type === 'Literal'
	|| (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
	);

const hasCommentsBetween = (sourceCode, firstNode, secondNode) =>
	sourceCode.getTokensBetween(firstNode, secondNode, {includeComments: true})
		.some(token => isCommentToken(token));

const hasCommentNextTo = (sourceCode, node, direction) => {
	const token = direction === 'before'
		? sourceCode.getTokenBefore(node, {includeComments: true})
		: sourceCode.getTokenAfter(node, {includeComments: true});

	return token && isCommentToken(token);
};

function isTypeScriptTypeQueryReference(identifier) {
	let node = identifier;
	while (node.parent.type === 'TSQualifiedName') {
		node = node.parent;
	}

	return node.parent.type === 'TSTypeQuery';
}

const shouldFix = ({
	sourceCode,
	declaration,
	guardStatement,
	declarationIndex,
	guardIndex,
}) =>
	guardIndex === declarationIndex + 1
	&& declaration.declarations.length === 1
	&& isSimpleInitializer(declaration.declarations[0].init)
	&& sourceCode.getCommentsInside(declaration).length === 0
	&& !hasCommentNextTo(sourceCode, declaration, 'before')
	&& !hasCommentNextTo(sourceCode, guardStatement, 'after')
	&& !hasCommentsBetween(sourceCode, declaration, guardStatement);

function getFix(sourceCode, declaration, guardStatement) {
	const declarationText = sourceCode.getText(declaration);
	const guardText = sourceCode.getText(guardStatement);
	const [declarationStart, declarationEnd] = sourceCode.getRange(declaration);
	const [guardStart, guardEnd] = sourceCode.getRange(guardStatement);
	const separator = sourceCode.text.slice(declarationEnd, guardStart);

	return fixer => fixer.replaceTextRange(
		[declarationStart, guardEnd],
		`${guardText}${separator}${declarationText}`,
	);
}

function getProblem({
	sourceCode,
	declaration,
	declarator,
	guardStatement,
	declarationIndex,
	guardIndex,
}) {
	if (declarator.id.type !== 'Identifier') {
		return;
	}

	const [variable] = sourceCode.getDeclaredVariables(declarator);
	const references = variable.references.filter(reference =>
		!reference.init
		&& !isTypeScriptTypeQueryReference(reference.identifier),
	);

	if (references.length === 0) {
		return;
	}

	const [, guardEnd] = sourceCode.getRange(guardStatement);
	if (references.some(reference => sourceCode.getRange(reference.identifier)[0] < guardEnd)) {
		return;
	}

	const problem = {
		node: declarator.id,
		messageId: MESSAGE_ID,
	};

	if (shouldFix({
		sourceCode,
		declaration,
		guardStatement,
		declarationIndex,
		guardIndex,
	})) {
		problem.fix = getFix(sourceCode, declaration, guardStatement);
	}

	return problem;
}

function * checkStatementList(sourceCode, statements) {
	for (const [declarationIndex, declaration] of statements.entries()) {
		if (
			!isLetOrConstDeclaration(declaration)
			|| declaration.declare
		) {
			continue;
		}

		for (const [guardIndex, guardStatement] of statements.entries()) {
			if (guardIndex <= declarationIndex || !isGuardStatement(guardStatement)) {
				continue;
			}

			for (const declarator of declaration.declarations) {
				const problem = getProblem({
					sourceCode,
					declaration,
					declarator,
					guardStatement,
					declarationIndex,
					guardIndex,
				});

				if (problem) {
					yield problem;
				}
			}

			break;
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('Program', node => checkStatementList(sourceCode, node.body));
	context.on('BlockStatement', node => checkStatementList(sourceCode, node.body));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow declarations before conditional early exits when they are only used after the exit.',
			recommended: 'unopinionated',
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
