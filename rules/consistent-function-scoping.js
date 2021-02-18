'use strict';
const {getFunctionHeadLocation, getFunctionNameWithKind} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const getReferences = require('./utils/get-references');

const MESSAGE_ID = 'consistent-function-scoping';
const messages = {
	[MESSAGE_ID]: 'Move {{functionNameWithKind}} to the outer scope.'
};

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
// const isCurriedArrayFunction = node => node &&
// 	node.type === 'ArrowFunctionExpression' &&
// 	node.parent &&
// 	node.parent.type === 'ArrowFunctionExpression' &&
// 	node.parent.body === node;

const getUpperScope = scope => {
	const {upper} = scope;

	const {type, block} = upper;

	if (
		type === 'block' &&
		(
			block.parent.type === 'ForStatement' ||
			block.parent.type === 'ForOfStatement' ||
			block.parent.type === 'ForInStatement' ||
			block.parent.type === 'CatchClause'
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

function shouldReport(node, scope) {
	if (isArrowFunctionWithThis(scope)) {
		return false;
	}

	// If (isCurriedArrayFunction(node)) {
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

	console.log({type, block});
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
				!shouldReport(node, context.getScope())
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
