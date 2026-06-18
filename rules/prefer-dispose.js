import {findVariable} from '@eslint-community/eslint-utils';
import {isCallExpression, isFunction} from './ast/index.js';

const MESSAGE_ID_ERROR = 'prefer-dispose/error';
const MESSAGE_ID_SUGGESTION = 'prefer-dispose/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{keyword}}` (Explicit Resource Management) over the `try`/`finally` disposal pattern.',
	[MESSAGE_ID_SUGGESTION]: 'Replace the `try`/`finally` with `{{keyword}}`.',
};

// Common resource cleanup method names. `using` itself calls `[Symbol.dispose]()`/`[Symbol.asyncDispose]()`.
const DISPOSAL_METHOD_NAMES = new Set(['close', 'dispose', 'destroy', 'end']);

// Parse one statement of a `finally` block into a disposal descriptor, or return `undefined` if it
// isn't a simple `foo.close()` / `foo[Symbol.dispose]()` (optionally `await`-ed) call.
function parseDisposalStatement(statement) {
	if (statement.type !== 'ExpressionStatement') {
		return;
	}

	let {expression} = statement;
	let isAwaited = false;
	if (expression.type === 'AwaitExpression') {
		isAwaited = true;
		expression = expression.argument;
	}

	// Unwrap the `ChainExpression` around optional chaining, for example `foo?.close()`.
	if (expression.type === 'ChainExpression') {
		expression = expression.expression;
	}

	if (!isCallExpression(expression, {argumentsLength: 0})) {
		return;
	}

	const {callee} = expression;
	if (
		callee.type !== 'MemberExpression'
		|| callee.object.type !== 'Identifier'
	) {
		return;
	}

	const {property} = callee;
	if (callee.computed) {
		// `foo[Symbol.dispose]()` / `foo[Symbol.asyncDispose]()`
		if (
			property.type !== 'MemberExpression'
			|| property.computed
			|| property.object.type !== 'Identifier'
			|| property.object.name !== 'Symbol'
			|| property.property.type !== 'Identifier'
			|| (property.property.name !== 'dispose' && property.property.name !== 'asyncDispose')
		) {
			return;
		}

		if (property.property.name === 'asyncDispose') {
			isAwaited = true;
		}
	} else if (
		property.type !== 'Identifier'
		|| !DISPOSAL_METHOD_NAMES.has(property.name)
	) {
		return;
	}

	return {resourceName: callee.object.name, isAwaited};
}

// `await using` is only legal inside an async function or at module top-level.
function isInAsyncContext(node) {
	for (let current = node.parent; current; current = current.parent) {
		if (isFunction(current)) {
			return current.async === true;
		}

		// `await` is not allowed in a class static block.
		if (current.type === 'StaticBlock') {
			return false;
		}

		if (current.type === 'Program') {
			return current.sourceType === 'module';
		}
	}

	return false;
}

// With type information, confirm the resources actually implement `Symbol.dispose`/`Symbol.asyncDispose`.
// Without it, `using` would throw a `TypeError` at runtime, so this avoids suggesting broken code.
// `getProperties()` resolves a union to its common properties and an intersection to its merged
// properties, so a union member that is not disposable correctly prevents the suggestion.
//
// Resolving and inspecting types can crash deep inside TypeScript 6 while it computes module specifiers
// for symbols declared in other modules (`Cannot read properties of undefined (reading 'includes')`).
// We cannot then confirm disposability, so we conservatively report it as non-disposable rather than crash the lint run.
function areAllResourcesDisposable(resources, parserServices) {
	try {
		return resources.every(({identifier, isAwaited}) => {
			const type = parserServices.getTypeAtLocation(identifier);
			return type.getProperties().some(symbol => {
				// TypeScript stores well-known symbol members under the escaped name `__@<name>@<id>`
				// (for example `__@dispose@9`). We match that directly instead of `typeChecker.symbolToString()`,
				// which is one of the calls that crashes.
				const name = String(symbol.escapedName);
				return name.startsWith('__@dispose') || (isAwaited && name.startsWith('__@asyncDispose'));
			});
		});
	} catch {
		return false;
	}
}

// Resolve a disposed name to the `const`/`let` declaration that can become a `using` declaration.
function resolveResource(disposal, scope, body) {
	const variable = findVariable(scope, disposal.resourceName);
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.node.type !== 'VariableDeclarator'
		|| !definition.node.init
		|| definition.node.id.type !== 'Identifier'
	) {
		return;
	}

	// `definition.kind` is populated by espree but is undefined under `@typescript-eslint/parser`,
	// so fall back to `definition.parent.kind` (the enclosing `VariableDeclaration`). See `prefer-top-level-await`.
	const declaration = definition.parent;
	const kind = definition.kind ?? declaration.kind;
	if (
		(kind !== 'const' && kind !== 'let')
		|| declaration.declarations.length !== 1
		|| declaration.parent.type === 'ExportNamedDeclaration'
		|| !body.includes(declaration)
	) {
		return;
	}

	return {
		...disposal, variable, declaration, identifier: definition.node.id,
	};
}

// Whether the resolved resources can be safely converted to `using` declarations.
function areResourcesConvertible(resources, tryStatement, sourceCode, parserServices) {
	const {body} = tryStatement.parent;

	// `resources` arrives in the `finally` disposal order. `using` disposes in reverse declaration
	// order (LIFO), so only convert when the `finally` already disposes in that order; otherwise the
	// suggestion would change the observable cleanup order and could break dependent resources.
	const disposalOrder = resources.map(({declaration}) => declaration);

	// All declarations must sit contiguously, immediately before the `try`.
	resources.sort((a, b) => body.indexOf(a.declaration) - body.indexOf(b.declaration));
	const expectedStartIndex = body.indexOf(tryStatement) - resources.length;
	if (
		expectedStartIndex < 0
		|| resources.some(({declaration}, index) => body[expectedStartIndex + index] !== declaration)
	) {
		return false;
	}

	if (disposalOrder.some((declaration, index) => declaration !== resources.at(-1 - index).declaration)) {
		return false;
	}

	// The resource must not be reassigned or used after the `try`, since `using` is block-scoped.
	const [, tryStatementEnd] = sourceCode.getRange(tryStatement);
	const isReassignedOrUsedAfterTry = ({references}) => references.some(reference =>
		(!reference.init && reference.isWrite())
		|| sourceCode.getRange(reference.identifier)[0] > tryStatementEnd);
	if (resources.some(({variable}) => isReassignedOrUsedAfterTry(variable))) {
		return false;
	}

	if (resources.some(({isAwaited}) => isAwaited) && !isInAsyncContext(tryStatement)) {
		return false;
	}

	// When type information is available, only report resources that are actually disposable.
	return !(parserServices?.program && !areAllResourcesDisposable(resources, parserServices));
}

// Match a `try`/`finally` resource-disposal pattern and return the resources to convert, or `undefined`.
function findResources(tryStatement, sourceCode, parserServices) {
	const {finalizer} = tryStatement;
	if (!finalizer) {
		return;
	}

	// The `finally` block must consist solely of disposal calls.
	const disposals = [];
	for (const statement of finalizer.body) {
		const disposal = parseDisposalStatement(statement);
		if (!disposal) {
			return;
		}

		disposals.push(disposal);
	}

	if (disposals.length === 0) {
		return;
	}

	const names = new Set(disposals.map(({resourceName}) => resourceName));
	if (names.size !== disposals.length) {
		return;
	}

	const {parent} = tryStatement;
	if (parent.type !== 'BlockStatement' && parent.type !== 'Program') {
		return;
	}

	const scope = sourceCode.getScope(tryStatement);
	const resources = [];
	for (const disposal of disposals) {
		const resource = resolveResource(disposal, scope, parent.body);
		if (!resource) {
			return;
		}

		resources.push(resource);
	}

	if (areResourcesConvertible(resources, tryStatement, sourceCode, parserServices)) {
		return resources;
	}
}

// Without a `catch`, the fix unwraps the `try` block into the new `using` block, merging the two
// scopes. A binding declared in the `try` block that shares a resource name would then collide with
// the `using` declaration, so the suggestion must be skipped.
function hasShadowingConflict(tryStatement, resources, sourceCode) {
	if (tryStatement.handler) {
		return false;
	}

	const blockScope = sourceCode.getScope(tryStatement.block);
	if (blockScope.block !== tryStatement.block) {
		return false;
	}

	const resourceNames = new Set(resources.map(({resourceName}) => resourceName));
	return blockScope.variables.some(({name}) => resourceNames.has(name));
}

function * fixTryStatement(fixer, tryStatement, resources, sourceCode) {
	// Turn each declaration into `using`/`await using`, opening a new block before the first one.
	for (const [index, {declaration, isAwaited}] of resources.entries()) {
		const keywordToken = sourceCode.getFirstToken(declaration);
		const keyword = isAwaited ? 'await using' : 'using';
		yield fixer.replaceText(keywordToken, index === 0 ? `{\n${keyword}` : keyword);
	}

	const [, tryStatementEnd] = sourceCode.getRange(tryStatement);

	if (tryStatement.handler) {
		// Keep `try { … } catch (…) { … }`, drop only the `finally`, and close the new block.
		const [, handlerEnd] = sourceCode.getRange(tryStatement.handler);
		yield fixer.replaceTextRange([handlerEnd, tryStatementEnd], '\n}');
		return;
	}

	// No `catch`: unwrap the `try` block into the new block.
	const tryToken = sourceCode.getFirstToken(tryStatement);
	const tryBlockOpen = sourceCode.getFirstToken(tryStatement.block);
	const tryBlockClose = sourceCode.getLastToken(tryStatement.block);
	yield fixer.removeRange([sourceCode.getRange(tryToken)[0], sourceCode.getRange(tryBlockOpen)[1]]);
	yield fixer.replaceTextRange([sourceCode.getRange(tryBlockClose)[0], tryStatementEnd], '\n}');
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {parserServices} = sourceCode;

	context.on('TryStatement', tryStatement => {
		const resources = findResources(tryStatement, sourceCode, parserServices);
		if (!resources) {
			return;
		}

		const data = {keyword: resources.some(({isAwaited}) => isAwaited) ? 'await using' : 'using'};
		const problem = {node: tryStatement, messageId: MESSAGE_ID_ERROR, data};

		// Skip the suggestion when applying the fix would drop comments. The `try` block and `catch`
		// handler are kept verbatim, so their comments survive; the `finally` block and anything
		// between the structural keywords are removed, so comments there would be lost. Declarations
		// keep their comments because the fix only replaces their leading keyword token.
		const preservedComments = new Set([
			...sourceCode.getCommentsInside(tryStatement.block),
			...(tryStatement.handler ? sourceCode.getCommentsInside(tryStatement.handler) : []),
		]);
		if (sourceCode.getCommentsInside(tryStatement).some(comment => !preservedComments.has(comment))) {
			return problem;
		}

		if (hasShadowingConflict(tryStatement, resources, sourceCode)) {
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data,
				fix: fixer => fixTryStatement(fixer, tryStatement, resources, sourceCode),
			},
		];

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `using`/`await using` over manual `try`/`finally` resource disposal.',
			// Enable in the `recommended` config once we target Node.js 24, where `using`/`await using` is supported natively.
			recommended: false,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
