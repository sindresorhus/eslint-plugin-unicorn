'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_NAMED = 'named';
const MESSAGE_ID_ANONYMOUS = 'anonymous';

const getReferences = scope => scope.references.concat(
	...scope.childScopes.map(scope => getReferences(scope))
);

const isSameScope = (scope1, scope2) =>
	scope1 && scope2 && (scope1 === scope2 || scope1.block === scope2.block);

function checkReferences(scope, parent, scopeManager) {
	const hitReference = references => references.some(reference => {
		if (isSameScope(parent, reference.from)) {
			return true;
		}

		const {resolved} = reference;
		const [definition] = resolved.defs;

		// Skip recursive function name
		if (definition && definition.type === 'FunctionName' && resolved.name === definition.name.name) {
			return false;
		}

		return isSameScope(parent, resolved.scope);
	});

	const hitDefinitions = definitions => definitions.some(definition => {
		const scope = scopeManager.acquire(definition.node);
		return isSameScope(parent, scope);
	});

	// This check looks for neighboring function definitions
	const hitIdentifier = identifiers => identifiers.some(identifier => {
		// Only look at identifiers that live in a FunctionDeclaration
		if (
			!identifier.parent ||
				identifier.parent.type !== 'FunctionDeclaration'
		) {
			return false;
		}

		const identifierScope = scopeManager.acquire(identifier);

		// If we have a scope, the earlier checks should have worked so ignore them here
		if (identifierScope) {
			return false;
		}

		const identifierParentScope = scopeManager.acquire(identifier.parent);
		if (!identifierParentScope) {
			return false;
		}

		// Ignore identifiers from our own scope
		if (isSameScope(scope, identifierParentScope)) {
			return false;
		}

		// Look at the scope above the function definition to see if lives
		// next to the reference being checked
		return isSameScope(parent, identifierParentScope.upper);
	});

	return getReferences(scope)
		.map(({resolved}) => resolved)
		.filter(Boolean)
		.some(variable =>
			hitReference(variable.references) ||
			hitDefinitions(variable.defs) ||
			hitIdentifier(variable.identifiers)
		);
}

// https://reactjs.org/docs/hooks-reference.html
const reactHooks = new Set([
	'useState',
	'useEffect',
	'useContext',
	'useReducer',
	'useCallback',
	'useMemo',
	'useRef',
	'useImperativeHandle',
	'useLayoutEffect',
	'useDebugValue'
]);
const isReactHook = scope =>
	scope.block &&
	scope.block.parent &&
	scope.block.parent.callee &&
	scope.block.parent.callee.type === 'Identifier' &&
	reactHooks.has(scope.block.parent.callee.name);

function checkNode(node, scopeManager) {
	const scope = scopeManager.acquire(node);
	if (!scope) {
		return true;
	}

	let parentNode = node.parent;
	if (!parentNode) {
		return true;
	}

	// Skip over junk like the block statement inside of a function declaration
	// or the various pieces of an arrow function.

	if (parentNode.type === 'VariableDeclarator') {
		parentNode = parentNode.parent;
	}

	if (parentNode.type === 'VariableDeclaration') {
		parentNode = parentNode.parent;
	}

	if (parentNode.type === 'BlockStatement') {
		parentNode = parentNode.parent;
	}

	const parentScope = scopeManager.acquire(parentNode);
	if (!parentScope || parentScope.type === 'global' || isReactHook(parentScope)) {
		return true;
	}

	return checkReferences(scope, parentScope, scopeManager);
}

const create = context => {
	const sourceCode = context.getSourceCode();
	const {scopeManager} = sourceCode;

	const functions = [];
	let hasJsx = false;

	return {
		'ArrowFunctionExpression, FunctionDeclaration': node => functions.push(node),
		JSXElement: () => {
			// Turn off this rule if we see a JSX element because scope
			// references does not include JSXElement nodes.
			hasJsx = true;
		},
		':matches(ArrowFunctionExpression, FunctionDeclaration):exit': node => {
			if (!hasJsx && !checkNode(node, scopeManager)) {
				const functionType = node.type === 'ArrowFunctionExpression' ? 'arrow function' : 'function';
				let functionName = '';
				if (node.id) {
					functionName = node.id.name;
				} else if (
					node.parent &&
					node.parent.type === 'VariableDeclarator' &&
					node.parent.id &&
					node.parent.id.type === 'Identifier'
				) {
					functionName = node.parent.id.name;
				}

				context.report({
					node,
					messageId: functionName ? MESSAGE_ID_NAMED : MESSAGE_ID_ANONYMOUS,
					data: {
						functionType,
						functionName
					}
				});
			}

			functions.pop();
			if (functions.length === 0) {
				hasJsx = false;
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[MESSAGE_ID_NAMED]: 'Move {{functionType}} `{{functionName}}` to the outer scope.',
			[MESSAGE_ID_ANONYMOUS]: 'Move {{functionType}} to the outer scope.'
		}
	}
};
