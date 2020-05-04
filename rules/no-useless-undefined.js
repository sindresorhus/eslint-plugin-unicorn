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
const lastArgumentSelector = getSelector('CallExpression', 'arguments:last-child');

const create = context => {
	const listener = fix => node => {
		context.report({
			node,
			messageId,
			fix: fixer => fix(node, fixer)
		});
	};

	const remove = (node, fixer) => fixer.remove(node);

	return {
		[returnSelector]: listener(remove),
		[yieldSelector]: listener(remove),
		[arrowFunctionSelector]: listener(
			(node, fixer) => fixer.replaceText(node, '{}')
		),
		[variableInitSelector]: listener(
			(node, fixer) => fixer.removeRange([node.parent.id.range[1], node.range[1]])
		),
		[assignmentPatternSelector]: listener(
			(node, fixer) => fixer.removeRange([node.parent.left.range[1], node.range[1]])
		),
		[lastArgumentSelector]: listener(
			(node, fixer) => {
				const tokenAfter = context.getTokenAfter(node);
				return (isCommaToken(tokenAfter) ? [node, tokenAfter] : [node])
					.map(nodeOrToken => remove(nodeOrToken, fixer))
			}
		)
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
			[messageId]: '`undefined` is useless.'
		},
		fixable: 'code'
	}
};
