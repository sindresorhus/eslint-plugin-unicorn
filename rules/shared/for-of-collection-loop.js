import {isEmptyArrayExpression} from '../ast/index.js';
import {getVariableIdentifiers} from '../utils/index.js';

/**
Check if the node is an array pattern of two identifiers, like `[key, value]`.

@param {import('estree').Node} node
@returns {boolean}
*/
export const isPairPattern = node =>
	node.type === 'ArrayPattern'
	&& node.elements.length === 2
	&& node.elements.every(element => element?.type === 'Identifier');

/**
Get the declarator of `const array = [];` or `let array = [];`.

@param {import('estree').Node | undefined} node
@returns {import('estree').VariableDeclarator | undefined}
*/
export const getEmptyArrayDeclarator = node => {
	if (
		node?.type !== 'VariableDeclaration'
		|| (node.kind !== 'const' && node.kind !== 'let')
		|| node.declarations.length !== 1
	) {
		return;
	}

	const [declarator] = node.declarations;
	if (
		declarator.id.type !== 'Identifier'
		|| !declarator.init
		|| !isEmptyArrayExpression(declarator.init)
	) {
		return;
	}

	return declarator;
};

/**
Get the binding pattern of a `for…of` left side declaring a single `const` or `let` variable, like `element` in `for (const element of iterable)`.

@param {import('estree').ForOfStatement['left']} node
@returns {import('estree').Pattern | undefined}
*/
export const getForOfDeclarationPattern = node => {
	if (
		node.type === 'VariableDeclaration'
		&& (node.kind === 'const' || node.kind === 'let')
		&& node.declarations.length === 1
	) {
		// A `for…of` declaration cannot have an initializer
		return node.declarations[0].id;
	}
};

/**
Get the bindings of `for (const element of …)` as `{element}`, or of `for (const [index, element] of …)` as `{index, element}`.

@param {import('estree').ForOfStatement} node
@returns {{element: import('estree').Identifier, index?: import('estree').Identifier} | undefined}
*/
export const getForOfBinding = node => {
	const pattern = getForOfDeclarationPattern(node.left);
	if (!pattern) {
		return;
	}

	if (pattern.type === 'Identifier') {
		return {element: pattern};
	}

	if (isPairPattern(pattern)) {
		const [index, element] = pattern.elements;
		return {index, element};
	}
};

/**
Check if any identifier of the variable is inside the node.

@param {import('eslint').Scope.Variable} variable
@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export const referencesVariable = (variable, node, context) => {
	const [start, end] = context.sourceCode.getRange(node);

	return getVariableIdentifiers(variable).some(identifier => {
		const [identifierStart, identifierEnd] = context.sourceCode.getRange(identifier);

		return identifierStart >= start && identifierEnd <= end;
	});
};

/**
Get the text of a declarator target with its type annotation, like `result: string[]` in `const result: string[] = [];`.

@param {import('estree').VariableDeclarator} declarator
@param {import('eslint').Rule.RuleContext} context
@returns {string}
*/
export const getVariableTargetText = (declarator, context) => {
	const {sourceCode} = context;
	const equalsToken = sourceCode.getTokenBefore(declarator.init, token => token.value === '=');
	const [start] = sourceCode.getRange(declarator.id);
	const [end] = sourceCode.getRange(equalsToken);

	return sourceCode.text.slice(start, end).trimEnd();
};
