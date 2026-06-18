import {isCommentToken, hasSideEffect} from '@eslint-community/eslint-utils';
import {containsSuspensionPoint, getReferences, trackBranchExits} from './utils/index.js';

const MESSAGE_ID = 'no-declarations-before-early-exit';
const messages = {
	[MESSAGE_ID]: 'Move this declaration after the early exit.',
};

const isLetOrConstDeclaration = node =>
	node.type === 'VariableDeclaration'
	&& (node.kind === 'let' || node.kind === 'const');

// A guard is an `if` statement where exactly one branch always exits, so control after it is
// conditional. `branchAlwaysExits` uses code path analysis, so guards whose exiting branch ends
// in an exhaustive `switch`, `try`/`finally`, or other complex control flow are detected too.
function isGuardStatement(node, branchAlwaysExits) {
	if (node.type !== 'IfStatement') {
		return false;
	}

	const consequentExits = branchAlwaysExits(node.consequent);
	const alternateExits = Boolean(node.alternate) && branchAlwaysExits(node.alternate);
	return consequentExits !== alternateExits;
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

	// Moving a declaration whose initializer suspends (`await`/`yield`) would reorder the guard's condition across the suspension point, changing observable timing.
	if (declarator.init && containsSuspensionPoint(declarator.init, sourceCode.visitorKeys)) {
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

function * getStatementListProblems(sourceCode, statements, branchAlwaysExits) {
	// Resolve each statement to itself when it is a guard (or `undefined` otherwise) at most
	// once per list, instead of re-running the code-path-analysis check for every
	// declaration/statement pair.
	let guards;

	for (const [declarationIndex, declaration] of statements.entries()) {
		if (
			!isLetOrConstDeclaration(declaration)
			|| declaration.declare
		) {
			continue;
		}

		guards ??= statements.map(statement => isGuardStatement(statement, branchAlwaysExits) ? statement : undefined);

		for (let guardIndex = declarationIndex + 1; guardIndex < statements.length; guardIndex++) {
			const guardStatement = guards[guardIndex];
			if (!guardStatement) {
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
	const branchAlwaysExits = trackBranchExits(context);

	// Run on exit so that all nested `if` statements have been visited and their branch exit
	// information is available before scanning each statement list.
	context.onExit('Program', node => getStatementListProblems(sourceCode, node.body, branchAlwaysExits));
	context.onExit('BlockStatement', node => getStatementListProblems(sourceCode, node.body, branchAlwaysExits));
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
