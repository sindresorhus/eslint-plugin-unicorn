'use strict';
const {findVariable} = require('eslint-utils');
const avoidCapture = require('./utils/avoid-capture');
const getDocumentationUrl = require('./utils/get-documentation-url');
const renameVariable = require('./utils/rename-variable');
const methodSelector = require('./utils/method-selector');

const promiseMethodSelector = (method, argumentsLength, argumentIndex) => [
	methodSelector({
		name: method,
		length: argumentsLength
	}),
	`:matches(${
		[
			'FunctionExpression',
			'ArrowFunctionExpression'
		].map(type => `[arguments.${argumentIndex}.type="${type}"]`).join(', ')
	})`,
	`[arguments.${argumentIndex}.params.length=1]`,
	`[arguments.${argumentIndex}.params.0.type="Identifier"]`
].join('');

// Matches `promise.catch([FunctionExpression | ArrowFunctionExpression])`
const promiseCatchSelector = promiseMethodSelector('catch', 1, 0);

// Matches `promise.then(any, [FunctionExpression | ArrowFunctionExpression])`
const promiseThenSelector = promiseMethodSelector('then', 2, 1);

const catchSelector = [
	'CatchClause',
	// Ignore optional catch binding
	'[param]',
	'>',
	'Identifier.param'
].join('');

const create = context => {
	const {ecmaVersion} = context.parserOptions;
	const sourceCode = context.getSourceCode();

	const {name, caughtErrorsIgnorePattern} = {
		name: 'error',
		caughtErrorsIgnorePattern: /^[\dA-Za-z]+[Ee]rror$/.source,
		...context.options[0]
	};
	const ignoreRegex = new RegExp(caughtErrorsIgnorePattern);

	function check(node) {
		const originalName = node.name;
		const cleanName = originalName.replace(/_+$/g, '');

		if (
			cleanName === name ||
			ignoreRegex.test(originalName) ||
			ignoreRegex.test(cleanName)
		) {
			return;
		}

		const scope = context.getScope();
		const variable = findVariable(scope, node);

		if (originalName === '_' && variable.references.length === 0) {
			return;
		}

		const scopes = [
			variable.scope,
			...variable.references.map(({from}) => from)
		];
		const fixed = avoidCapture(name, scopes, ecmaVersion);

		context.report({
			node,
			message: `The catch parameter should be named \`${fixed}\`.`,
			fix: fixer => renameVariable(variable, fixed, fixer, sourceCode)
		});
	}

	return {
		[promiseCatchSelector]: node => {
			check(node.arguments[0].params[0]);
		},
		[promiseThenSelector]: node => {
			check(node.arguments[1].params[0]);
		},
		[catchSelector]: node => {
			check(node);
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			name: {
				type: 'string'
			},
			caughtErrorsIgnorePattern: {
				type: 'string'
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
		fixable: 'code',
		schema
	}
};
