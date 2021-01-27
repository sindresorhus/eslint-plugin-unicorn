'use strict';
const {getFunctionHeadLocation, getFunctionNameWithKind} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const getReferences = require('./utils/get-references');

const MESSAGE_ID = 'consistent-function-scoping';
const messages = {
	[MESSAGE_ID]: 'Move {{functionNameWithKind}} to the outer scope.'
};

const isSameScope = (scope1, scope2) =>
	scope1 && scope2 && (scope1 === scope2 || scope1.block === scope2.block);

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
const isReactHook = node =>
	node &&
	node.parent &&
	node.parent.callee &&
	node.parent.callee.type === 'Identifier' &&
	reactHooks.has(node.parent.callee.name);

const isArrowFunctionWithThis = scope =>
	scope.type === 'function' &&
	scope.block &&
	scope.block.type === 'ArrowFunctionExpression' &&
	(scope.thisFound || scope.childScopes.some(scope => isArrowFunctionWithThis(scope)));

const iifeFunctionTypes = new Set([
	'FunctionExpression',
	'ArrowFunctionExpression'
]);
const isIife = node => node &&
	iifeFunctionTypes.has(node.type) &&
	node.parent &&
	node.parent.type === 'CallExpression' &&
	node.parent.callee === node;
const isCurriedArrayFunction = node => node &&
	node.type === 'ArrowFunctionExpression' &&
	node.parent &&
	node.parent.type === 'ArrowFunctionExpression' &&
	node.parent.body === node;

const getUpperScope = scope => {
	let {upper} = scope;

	const {type, block} = upper;

	if (
		type === 'block' &&
		(
			block.parent.type === 'ForStatement' ||
			block.parent.type === 'ForOfStatement' ||
			block.parent.type === 'ForInStatement'
		) &&
		block.parent.body === block
	) {
		return getUpperScope(upper);
	}

	return scope.upper;
};

const isTopScope = scope =>
	!scope ||
	scope.type === 'global' ||
	scope.type === 'module';

function shouldReport(node, scope, sourceCode) {
	if (isArrowFunctionWithThis(scope)) {
		return false;
	}

	// if (isCurriedArrayFunction(node)) {
	// 	return false;
	// }

	if (isIife(node)) {
		return false;
	}

	const upperScope = getUpperScope(scope);
	if (isTopScope(upperScope)) {
		return false;
	}

	const {type, block} = upperScope;

// console.log({type, block})
	if (
		type === 'function' &&
		(isReactHook(block) || isIife(block))
	) {
		return false;
	}

	if (
		type === 'function-expression-name' &&
		isTopScope(upperScope.upper)
	) {
		return false;
	}

	// Some reference in function is from upperScope
	for (const reference of getReferences(scope)) {
		const {resolved} = reference;
		if (
			resolved &&
			resolved.scope === upperScope &&
			// `scope` of function name is upperScope
			resolved.identifiers.every(identifier => identifier !== node.id)
		) {
			return false;
		}
	}

	const [start, end] = node.range;
	// Some reference in upperScope used in function
	for (const reference of getReferences(upperScope)) {
		const {resolved} = reference;

		if (!resolved) {
			continue;
		}

		const identifiersInUpperScopeBlock = resolved.references.map(({identifier}) => identifier)
			.filter(({range}) => range[0] >= block.range[0] && range[0] <= block.range[1]);
		const identifiersInFunction = identifiersInUpperScopeBlock
			.filter(({range}) => range[0] >= start && range[0] <= end);

		if (
			identifiersInFunction.length > 0 &&
			identifiersInUpperScopeBlock.length > identifiersInFunction.length
		) {
			return false;
		}
	}

	return true;


process.exit(1);
return false;


	// Skip over junk like the block statement inside of a function declaration
	// or the various pieces of an arrow function.

	return getReferences(scope)
		.map(({resolved}) => resolved)
		.filter(Boolean)
		.some(variable =>
			hitReference(variable.references) ||
			hitDefinitions(variable.defs) ||
			hitIdentifier(variable.identifiers)
		);


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
		/* istanbul ignore next: Hard to test */
		if (identifierScope) {
			return false;
		}

		const identifierParentScope = scopeManager.acquire(identifier.parent);
		/* istanbul ignore next: Hard to test */
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

}

const create = context => {
	const {checkArrowFunctions} = {checkArrowFunctions: true, ...context.options[0]};
	const sourceCode = context.getSourceCode();
	const functions = [];

	return {
		':function': () => {
			functions.push(false);
		},
		JSXElement: () => {
			// Turn off this rule if we see a JSX element because scope
			// references does not include JSXElement nodes.
			if (functions.length > 0) {
				functions[functions.length - 1] = true;
			}
		},
		':function:exit': node => {
			const currentFunctionHasJsx = functions.pop();
			if (
				currentFunctionHasJsx ||
				(node.type === 'ArrowFunctionExpression' && !checkArrowFunctions) ||
				!shouldReport(node, context.getScope(), sourceCode)
			) {
				return;
			}

			context.report({
				node,
				loc: getFunctionHeadLocation(node, sourceCode),
				messageId: MESSAGE_ID,
				data: {
					functionNameWithKind: getFunctionNameWithKind(node)
				}
			});
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			checkArrowFunctions: {
				type: 'boolean',
				default: true
			}
		}
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		schema,
		messages
	}
};
