import {isCommentToken, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	containsNode,
	containsSuspensionPoint,
	getReferencesInside,
	isBranchExit,
	isReactHookName,
	trackBranchExits,
} from './utils/index.js';
import {isInTypeQuery} from './ast/index.js';

const MESSAGE_ID = 'no-declarations-before-early-exit';
const messages = {
	[MESSAGE_ID]: 'Move this declaration after the early exit.',
};

const isLetOrConstDeclaration = node =>
	node.type === 'VariableDeclaration'
	&& (node.kind === 'let' || node.kind === 'const');

// A guard is an `if` statement where exactly one branch always exits, so control after it is conditional. `branchAlwaysExits` uses code path analysis, so guards whose exiting branch ends in an exhaustive `switch`, `try`/`finally`, or other complex control flow are detected too.
function isGuardStatement(node, branchAlwaysExits) {
	if (node.type !== 'IfStatement') {
		return false;
	}

	const consequentExits = branchAlwaysExits(node.consequent);
	const alternateExits = Boolean(node.alternate) && branchAlwaysExits(node.alternate);
	return consequentExits !== alternateExits;
}

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

const callTypes = new Set([
	'CallExpression',
	'NewExpression',
	'TaggedTemplateExpression',
]);

// A reference after the guard can only run before the guard exits when it is in a hoisted function declaration. Any other closure is created after the guard.
const isInFunctionDeclaration = (reference, declarationScope) => {
	for (let scope = reference.from; scope && scope !== declarationScope; scope = scope.upper) {
		if (scope.block.type === 'FunctionDeclaration') {
			return true;
		}
	}

	return false;
};

const isSimpleInitializer = node =>
	!node
	|| node.type === 'Literal'
	|| (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
	);

const hasCommentNextTo = (sourceCode, node, direction) => {
	const token = direction === 'before'
		? sourceCode.getTokenBefore(node, {includeComments: true})
		: sourceCode.getTokenAfter(node, {includeComments: true});

	return token && isCommentToken(token);
};

const hasCommonReferencedVariable = (nodeA, nodeB, context) => {
	const variableNames = new Set(getReferencesInside(nodeB, context).map(({identifier}) => identifier.name));
	return getReferencesInside(nodeA, context).some(({identifier}) => variableNames.has(identifier.name));
};

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
	&& !sourceCode.commentsExistBetween(declaration, guardStatement);

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
	context,
	statements,
	declaration,
	declarator,
	guardStatement,
	declarationIndex,
	guardIndex,
}) {
	const {sourceCode} = context;

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
		&& hasCommonReferencedVariable(declarator.init, guardStatement, context)
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
		&& !isInTypeQuery(reference.identifier),
	);

	if (references.length === 0) {
		return;
	}

	const [, guardEnd] = sourceCode.getRange(guardStatement);
	if (references.some(reference => sourceCode.getRange(reference.identifier)[0] < guardEnd)) {
		return;
	}

	// A call in the guard, or in a statement before it, can run a closure that reads the variable, which would throw once the declaration is moved below the guard.
	if (
		references.some(reference => isInFunctionDeclaration(reference, variable.scope))
		&& statements.slice(declarationIndex + 1, guardIndex + 1).some(statement => containsNode(statement, context, node => callTypes.has(node.type)))
	) {
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

function * getStatementListProblems(context, statements, branchAlwaysExits) {
	// Resolve whether each statement is a guard at most once per list, instead of re-running the code-path-analysis check for every declaration/statement pair. Resolve lazily, since only the statements between a declaration and the first guard after it are needed, and the check can walk a whole branch.
	const guards = [];
	const isGuardAt = index => {
		guards[index] ??= isGuardStatement(statements[index], branchAlwaysExits);
		return guards[index];
	};

	for (const [declarationIndex, declaration] of statements.entries()) {
		if (
			!isLetOrConstDeclaration(declaration)
			|| declaration.declare
		) {
			continue;
		}

		for (let guardIndex = declarationIndex + 1; guardIndex < statements.length; guardIndex++) {
			if (!isGuardAt(guardIndex)) {
				continue;
			}

			const guardStatement = statements[guardIndex];

			for (const declarator of declaration.declarations) {
				const problem = getProblem({
					context,
					statements,
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

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const branchAlwaysExits = trackBranchExits(context, branch => isBranchExit(branch, context, branchAlwaysExits));

	// Run on exit so that all nested `if` statements have been visited and their branch exit information is available before scanning each statement list.
	context.onExit('Program', node => getStatementListProblems(context, node.body, branchAlwaysExits));
	context.onExit('BlockStatement', node => getStatementListProblems(context, node.body, branchAlwaysExits));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
