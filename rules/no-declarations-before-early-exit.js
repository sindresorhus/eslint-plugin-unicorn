import {isCommentToken, hasSideEffect} from '@eslint-community/eslint-utils';
import {getReferences} from './utils/index.js';

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

// https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/src/rules/RulesOfHooks.ts
const isReactHookName = name =>
	name === 'use' || /^use[\dA-Z]/.test(name);

// Matches `useFoo(…)` and `Namespace.useFoo(…)` (for example, `React.useMemo(…)`).
const isReactHookCall = node => {
	if (node?.type !== 'CallExpression') {
		return false;
	}

	const {callee} = node;
	if (callee.type === 'Identifier') {
		return isReactHookName(callee.name);
	}

	return callee.type === 'MemberExpression'
		&& !callee.computed
		&& callee.object.type === 'Identifier'
		&& /^[A-Z]/.test(callee.object.name)
		&& callee.property.type === 'Identifier'
		&& isReactHookName(callee.property.name);
};

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

const getReferencedVariableNames = (sourceCode, node) => {
	const [start, end] = sourceCode.getRange(node);
	return new Set(
		getReferences(sourceCode.getScope(node))
			.filter(({identifier}) => {
				const [referenceStart, referenceEnd] = sourceCode.getRange(identifier);
				return referenceStart >= start && referenceEnd <= end;
			})
			.map(({identifier}) => identifier.name),
	);
};

const hasCommonReferencedVariable = (sourceCode, nodeA, nodeB) => {
	const variableNames = getReferencedVariableNames(sourceCode, nodeB);
	return [...getReferencedVariableNames(sourceCode, nodeA)]
		.some(name => variableNames.has(name));
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

	// Moving a React hook call below an early exit would break the Rules of Hooks.
	if (isReactHookCall(declarator.init)) {
		return;
	}

	if (
		guardIndex > declarationIndex + 1
		&& !isSimpleInitializer(declarator.init)
	) {
		return;
	}

	// Moving the declaration below the guard reorders its initializer past the guard's condition. That is unsafe when the two interfere through a shared variable and either side has a side effect, e.g. `const x = array.pop()` before `if (array.length > 0)`, or `const first = array[0]` before `if (array.shift())`.
	if (
		declarator.init
		&& hasCommonReferencedVariable(sourceCode, declarator.init, guardStatement)
		&& (
			hasSideEffect(declarator.init, sourceCode)
			|| hasSideEffect(guardStatement.test, sourceCode)
		)
	) {
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

function * getStatementListProblems(sourceCode, statements) {
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

	context.on('Program', node => getStatementListProblems(sourceCode, node.body));
	context.on('BlockStatement', node => getStatementListProblems(sourceCode, node.body));
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
