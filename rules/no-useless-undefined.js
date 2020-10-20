'use strict';
const {isCommaToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const messageId = 'no-useless-undefined';
const messages = {
	[messageId]: 'Do not use useless `undefined`.'
};

const getSelector = (parent, property) =>
	`${parent} > Identifier.${property}[name="undefined"]`;

// `return undefined`
const returnSelector = getSelector('ReturnStatement', 'argument');

// `yield undefined`
const yieldSelector = getSelector('YieldExpression[delegate=false]', 'argument');

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

const isUndefined = node => node && node.type === 'Identifier' && node.name === 'undefined';

const compareFunctionNames = new Set([
	'is',
	'equal',
	'notEqual',
	'strictEqual',
	'notStrictEqual',
	'propertyVal',
	'notPropertyVal',
	'not',
	'include',
	'property',
	'toBe',
	'toHaveBeenCalledWith',
	'toContain',
	'toContainEqual',
	'toEqual',
	'same',
	'notSame',
	'strictSame',
	'strictNotSame'
]);
const isCompareFunction = node => {
	let name;

	if (node.type === 'Identifier') {
		name = node.name;
	} else if (
		node.type === 'MemberExpression' &&
		node.computed === false &&
		node.property &&
		node.property.type === 'Identifier'
	) {
		name = node.property.name;
	}

	return compareFunctionNames.has(name);
};

const create = context => {
	const listener = fix => node => {
		context.report({
			node,
			messageId,
			fix: fixer => fix(node, fixer)
		});
	};

	const code = context.getSourceCode().text;
	const options = {
		checkArguments: true,
		...context.options[0]
	};

	const removeNodeAndLeadingSpace = (node, fixer) => {
		const textBefore = code.slice(0, node.range[0]);
		return fixer.removeRange([
			node.range[0] - (textBefore.length - textBefore.trim().length),
			node.range[1]
		]);
	};

	const listeners = {
		[returnSelector]: listener(removeNodeAndLeadingSpace),
		[yieldSelector]: listener(removeNodeAndLeadingSpace),
		[arrowFunctionSelector]: listener(
			(node, fixer) => fixer.replaceText(node, '{}')
		),
		[variableInitSelector]: listener(
			(node, fixer) => fixer.removeRange([node.parent.id.range[1], node.range[1]])
		),
		[assignmentPatternSelector]: listener(
			(node, fixer) => fixer.removeRange([node.parent.left.range[1], node.range[1]])
		)
	};

	if (options.checkArguments) {
		listeners.CallExpression = node => {
			if (isCompareFunction(node.callee)) {
				return;
			}

			const argumentNodes = node.arguments;
			const undefinedArguments = [];
			for (let index = argumentNodes.length - 1; index >= 0; index--) {
				const node = argumentNodes[index];
				if (isUndefined(node)) {
					undefinedArguments.unshift(node);
				} else {
					break;
				}
			}

			if (undefinedArguments.length === 0) {
				return;
			}

			const firstUndefined = undefinedArguments[0];
			const lastUndefined = undefinedArguments[undefinedArguments.length - 1];

			context.report({
				messageId,
				loc: {
					start: firstUndefined.loc.start,
					end: lastUndefined.loc.end
				},
				fix: fixer => {
					let start = firstUndefined.range[0];
					let end = lastUndefined.range[1];

					const previousArgument = argumentNodes[argumentNodes.length - undefinedArguments.length - 1];

					if (previousArgument) {
						start = previousArgument.range[1];
					} else {
						// If all arguments removed, and there is trailing comma, we need remove it.
						const tokenAfter = context.getTokenAfter(lastUndefined);
						if (isCommaToken(tokenAfter)) {
							end = tokenAfter.range[1];
						}
					}

					return fixer.removeRange([start, end]);
				}
			});
		};
	}

	return listeners;
};

const schema = [
	{
		type: 'object',
		properties: {
			checkArguments: {
				type: 'boolean'
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages,
		schema,
		fixable: 'code'
	}
};
