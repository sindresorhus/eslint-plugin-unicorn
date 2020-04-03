'use strict';
const {findVariable} = require('eslint-utils');
const avoidCapture = require('./utils/avoid-capture');
const getDocumentationUrl = require('./utils/get-documentation-url');
const renameVariable = require('./utils/rename-variable');
const methodSelector = require('./utils/method-selector');

// Matches `someObj.catch([FunctionExpression | ArrowFunctionExpression])`
// TODO: Support `promise.then()` second argument
const promiseCatchSelector = [
	methodSelector({
		name: 'catch',
		length: 1
	}),
	`:matches(${
		[
			'FunctionExpression',
			'ArrowFunctionExpression'
		].map(type => `[arguments.0.type="${type}"]`).join(', ')
	})`,
	'[arguments.0.params.length=1]'
].join('');

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
			node = node.arguments[0].params[0];
			if (node.type === 'Identifier') {
				check(node);
			}
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
