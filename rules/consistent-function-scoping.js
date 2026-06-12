import {getFunctionHeadLocation, getFunctionNameWithKind} from '@eslint-community/eslint-utils';
import {getReferences, isNodeContainsLexicalThis, isNodeMatches} from './utils/index.js';
import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'consistent-function-scoping';
const messages = {
	[MESSAGE_ID]: 'Move {{functionNameWithKind}} to the outer scope.',
};

const isSameScope = (scope1, scope2) =>
	scope1 && scope2 && (scope1 === scope2 || scope1.block === scope2.block);

const isSameScopeAsAny = (scopes, scope) =>
	scopes.some(parentScope => isSameScope(parentScope, scope));

function checkReferences(scope, parentScopes, scopeManager) {
	const hitReference = references => references.some(reference => {
		if (isSameScopeAsAny(parentScopes, reference.from)) {
			return true;
		}

		const {resolved} = reference;
		const [definition] = resolved.defs;

		// Skip recursive function name
		if (definition?.type === 'FunctionName' && resolved.name === definition.name.name) {
			return false;
		}

		return isSameScopeAsAny(parentScopes, resolved.scope);
	});

	const hitDefinitions = definitions => definitions.some(definition => {
		const scope = scopeManager.acquire(definition.node);
		return isSameScopeAsAny(parentScopes, scope);
	});

	// This check looks for neighboring function definitions
	const hitIdentifier = identifiers => identifiers.some(identifier => {
		// Only look at identifiers that live in a FunctionDeclaration
		if (
			!identifier.parent
			|| identifier.parent.type !== 'FunctionDeclaration'
		) {
			return false;
		}

		const identifierScope = scopeManager.acquire(identifier);

		// If we have a scope, the earlier checks should have worked so ignore them here
		/* c8 ignore next 3 */
		if (identifierScope) {
			return false;
		}

		const identifierParentScope = scopeManager.acquire(identifier.parent);
		/* c8 ignore next 3 */
		if (!identifierParentScope) {
			return false;
		}

		// Ignore identifiers from our own scope
		if (isSameScope(scope, identifierParentScope)) {
			return false;
		}

		// Look at the scope above the function definition to see if it lives
		// next to the reference being checked
		return isSameScopeAsAny(parentScopes, identifierParentScope.upper);
	});

	return getReferences(scope)
		.map(({resolved}) => resolved)
		.filter(Boolean)
		.some(variable =>
			hitReference(variable.references)
			|| hitDefinitions(variable.defs)
			|| hitIdentifier(variable.identifiers));
}

// https://reactjs.org/docs/hooks-reference.html
const reactHooks = [
	'useState',
	'useEffect',
	'useContext',
	'useReducer',
	'useCallback',
	'useMemo',
	'useRef',
	'useImperativeHandle',
	'useLayoutEffect',
	'useDebugValue',
].flatMap(hookName => [hookName, `React.${hookName}`]);

const isReactHook = scope =>
	scope.block?.parent?.callee
	&& isNodeMatches(scope.block.parent.callee, reactHooks);

const isArrowFunctionNodeWithThis = (node, visitorKeys) =>
	node.type === 'ArrowFunctionExpression'
	// We avoid `scope.thisFound` because parser scope metadata differs; AST lexical checks are consistent.
	// Include both params and body, because parameter defaults can reference lexical `this`.
	&& isNodeContainsLexicalThis(node, visitorKeys);

function isInsideJestMockFactory(node) {
	let current = node;
	while (current.parent) {
		const {parent} = current;
		if (
			parent.type === 'CallExpression'
			&& parent.arguments[1] === current
			&& functionTypes.includes(current.type)
			&& isNodeMatches(parent.callee, ['jest.mock'])
		) {
			return true;
		}

		current = parent;
	}

	return false;
}

const loopStatementTypes = new Set([
	'DoWhileStatement',
	'ForInStatement',
	'ForOfStatement',
	'ForStatement',
	'WhileStatement',
]);
const isLoopBodyBlock = node =>
	node?.type === 'BlockStatement'
	&& loopStatementTypes.has(node.parent.type)
	&& node.parent.body === node;

function getLoopBodyBlockChain(node) {
	const blocks = [];

	while (node?.type === 'BlockStatement') {
		blocks.push(node);

		if (isLoopBodyBlock(node)) {
			return blocks;
		}

		node = node.parent;
	}

	return [];
}

function getRelevantParentScopes(parentScope, blockNode, scopeManager) {
	const parentScopes = [];
	if (parentScope) {
		parentScopes.push(parentScope);
	}

	const loopBodyBlockChain = getLoopBodyBlockChain(blockNode);
	if (loopBodyBlockChain.length === 0) {
		return parentScopes;
	}

	const loopBodyBlock = loopBodyBlockChain.at(-1);
	const loopStatementScope = scopeManager.acquire(loopBodyBlock.parent);
	if (loopStatementScope) {
		parentScopes.push(loopStatementScope);
	}

	for (const block of loopBodyBlockChain) {
		const blockScope = scopeManager.acquire(block);
		if (blockScope) {
			parentScopes.push(blockScope);
		}
	}

	return parentScopes;
}

const iifeFunctionTypes = new Set([
	'FunctionExpression',
	'ArrowFunctionExpression',
]);
const isIife = node =>
	iifeFunctionTypes.has(node.type)
	&& node.parent.type === 'CallExpression'
	&& node.parent.callee === node;

// Helper to walk up the chain to find the first non-arrow ancestor
function getNonArrowAncestor(node) {
	let ancestor = node;
	while (ancestor && ancestor.type === 'ArrowFunctionExpression') {
		ancestor = ancestor.parent;
	}

	return ancestor;
}

// Helper to skip over a chain of ArrowFunctionExpression nodes
function skipArrowFunctionChain(node) {
	let current = node;
	while (current.type === 'ArrowFunctionExpression') {
		current = current.parent;
	}

	return current;
}

function getParentNodeAfterNestedArrowFunctions(parentNode, node) {
	// Skip over arrow function expressions when they are parents and we came from a ReturnStatement
	// This handles nested arrow functions: return next => action => { ... }
	// But only when we're in a return statement context
	if (parentNode.type === 'ArrowFunctionExpression' && node.type === 'ArrowFunctionExpression') {
		const ancestor = getNonArrowAncestor(parentNode);
		if (ancestor && ancestor.type === 'ReturnStatement') {
			parentNode = skipArrowFunctionChain(parentNode);
			if (parentNode.type === 'ReturnStatement') {
				parentNode = parentNode.parent;
			}
		}
	}

	return parentNode;
}

function shouldSkipFunction(node, scopeManager, sourceCode) {
	const scope = scopeManager.acquire(node);

	if (
		!scope
		|| isArrowFunctionNodeWithThis(node, sourceCode.visitorKeys)
		|| isInsideJestMockFactory(node)
	) {
		return true;
	}

	let parentNode = node.parent;
	let blockNode;

	// Skip over junk like the block statement inside of a function declaration
	// or the various pieces of an arrow function.

	if (parentNode.type === 'VariableDeclarator') {
		parentNode = parentNode.parent;
	}

	if (parentNode.type === 'VariableDeclaration') {
		parentNode = parentNode.parent;
	}

	// Only skip ReturnStatement for arrow functions
	// Regular function expressions have different semantics and shouldn't be moved
	if (parentNode?.type === 'ReturnStatement' && node.type === 'ArrowFunctionExpression') {
		parentNode = parentNode.parent;
	}

	parentNode = getParentNodeAfterNestedArrowFunctions(parentNode, node);

	if (parentNode?.type === 'BlockStatement') {
		blockNode = parentNode;
		parentNode = parentNode.parent;
	}

	const parentScope = scopeManager.acquire(parentNode);
	const parentScopes = getRelevantParentScopes(parentScope, blockNode, scopeManager);

	if (
		parentScopes.length === 0
		|| parentScopes.some(parentScope => parentScope.type === 'global')
		|| (parentScope && isReactHook(parentScope))
		|| (parentScope && isIife(parentNode))
	) {
		return true;
	}

	return checkReferences(scope, parentScopes, scopeManager);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {checkArrowFunctions} = context.options[0];
	const {sourceCode} = context;
	const {scopeManager} = sourceCode;

	context.onExit(functionTypes, node => {
		if (node.type === 'ArrowFunctionExpression' && !checkArrowFunctions) {
			return;
		}

		if (shouldSkipFunction(node, scopeManager, sourceCode)) {
			return;
		}

		return {
			node,
			loc: getFunctionHeadLocation(node, sourceCode),
			messageId: MESSAGE_ID,
			data: {
				functionNameWithKind: getFunctionNameWithKind(node, sourceCode),
			},
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkArrowFunctions: {
				type: 'boolean',
				description: 'Whether to check arrow functions.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Move function definitions to the highest possible scope.',
			recommended: true,
		},
		schema,
		defaultOptions: [{checkArrowFunctions: true}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
