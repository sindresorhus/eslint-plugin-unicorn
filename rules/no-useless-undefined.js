'use strict';
const {isCommaToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const messageId = 'no-useless-undefined';

const getSelector = (parent, property) =>
	`${parent} > Identifier.${property}[name="undefined"]`;

// `return undefined`
const returnSelector = getSelector('ReturnStatement', 'argument');

// `yield undefined`
const yieldSelector = getSelector('YieldExpression', 'argument');

// `() => undefined`
const arrowFunctionSelector = getSelector('ArrowFunctionExpression', 'body');

// `let foo = undefined` / `var foo = undefined`
const variableInitSelector = getSelector(
	[
		'VariableDeclaration',
		'[kind!="const"]',
		'>',
		'VariableDeclarator'
	].join(''),
	'init'
);

// `const {foo = undefined} = {}`
const assignmentPatternSelector = getSelector('AssignmentPattern', 'right');

// `foo(bar, undefined)`
// TODO: Use this selector and remove `ifLastArgument` function
// esquery throws when use `:last-child` with `typescript-eslint`,
// maybe because ESLint hasn't support OptionalCallExpression
// const lastArgumentSelector = getSelector('CallExpression', 'arguments:last-child');
const lastArgumentSelector = getSelector('CallExpression', 'arguments');
const ifLastArgument = listener => node => {
	const argumentNodes = node.parent.arguments;
	if (argumentNodes[argumentNodes.length - 1] === node) {
		listener(node);
	}
};

const removeNode = (node, fixer) => fixer.remove(node);

const create = context => {
	const listener = fix => node => {
		context.report({
			node,
			messageId,
			fix: fixer => fix(node, fixer)
		});
	};

	return {
		[returnSelector]: listener(removeNode),
		[yieldSelector]: listener(removeNode),
		[arrowFunctionSelector]: listener(
			(node, fixer) => fixer.replaceText(node, '{}')
		),
		[variableInitSelector]: listener(
			(node, fixer) => fixer.removeRange([node.parent.id.range[1], node.range[1]])
		),
		[assignmentPatternSelector]: listener(
			(node, fixer) => fixer.removeRange([node.parent.left.range[1], node.range[1]])
		),
		[lastArgumentSelector]: ifLastArgument(listener(
			(node, fixer) => {
				const argumentNodes = node.parent.arguments;
				const previousArgument = argumentNodes[argumentNodes.length - 2];
				let [start, end] = node.range;
				if (previousArgument) {
					start = previousArgument.range[1];
				} else {
					// If it's the only argument, and there is trailing comma, we need remove it.
					const tokenAfter = context.getTokenAfter(node);
					if (isCommaToken(tokenAfter)) {
						end = tokenAfter.range[1];
					}
				}

				return fixer.removeRange([start, end]);
			}
		))
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
			// [TBD]: better message
			[messageId]: '`undefined` is useless.'
		},
		fixable: 'code'
	}
};
