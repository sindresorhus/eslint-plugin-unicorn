'use strict';
const astUtils = require('eslint-ast-utils');
const avoidCapture = require('./utils/avoid-capture');
const getDocumentationUrl = require('./utils/get-documentation-url');
const renameIdentifier = require('./utils/rename-identifier');
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
	})`
].join('');

const catchSelector = [
	'CatchClause',
	// Ignore optional catch binding
	'[param]'
].join('');

const create = context => {
	const {ecmaVersion} = context.parserOptions;

	const options = {
		name: 'error',
		caughtErrorsIgnorePattern: /^_$|^[\dA-Za-z]+(e|E)rror$/.source,
		...context.options[0]
	};

	const sourceCode = context.getSourceCode();
	const {scopeManager} = sourceCode;

	const {name} = options;
	const caughtErrorsIgnorePattern = new RegExp(options.caughtErrorsIgnorePattern);
	const stack = [];

	function push(value) {
		if (stack.length === 1) {
			stack[0] = true;
		}

		stack.push(stack.length > 0 || value);
	}

	function popAndReport(node, scopeNode) {
		const value = stack.pop();

		if (value !== true && !caughtErrorsIgnorePattern.test(node.name)) {
			const expectedName = value || name;
			const problem = {
				node,
				message: `The catch parameter should be named \`${expectedName}\`.`
			};

			if (node.type === 'Identifier') {
				problem.fix = fixer => {
					const nodes = [node];

					const variables = scopeManager.getDeclaredVariables(scopeNode);
					for (const variable of variables) {
						if (variable.name !== node.name) {
							continue;
						}

						for (const reference of variable.references) {
							nodes.push(reference.identifier);
						}
					}

					return nodes.map(node => renameIdentifier(node, expectedName, fixer, sourceCode));
				};
			}

			context.report(problem);
		}
	}

	return {
		[promiseCatchSelector]: node => {
			const {params} = node.arguments[0];

			if (params.length > 0 && params[0].name === '_') {
				push(!astUtils.containsIdentifier('_', node.arguments[0].body));
				return;
			}

			const scope = context.getScope();
			const errorName = avoidCapture(name, [scope.variableScope], ecmaVersion);
			push(params.length === 0 || params[0].name === errorName || errorName);
		},
		[`${promiseCatchSelector}:exit`]: node => {
			const callbackNode = node.arguments[0];
			popAndReport(callbackNode.params[0], callbackNode);
		},
		[catchSelector]: node => {
			if (node.param.name === '_') {
				push(!astUtils.someContainIdentifier('_', node.body.body));
				return;
			}

			const scope = context.getScope();
			const errorName = avoidCapture(name, [scope.variableScope], ecmaVersion);
			push(node.param.name === errorName || errorName);
		},
		[`${catchSelector}:exit`]: node => {
			popAndReport(node.param, node);
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
