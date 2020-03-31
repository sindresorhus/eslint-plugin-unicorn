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

	function report(expectedName, node, scopeNode) {
		if (caughtErrorsIgnorePattern.test(node.name)) {
			return;
		}

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

	return {
		[promiseCatchSelector]: node => {
			const {params} = node.arguments[0];

			if (
				params.length > 0 &&
				params[0].name === '_' &&
				!astUtils.containsIdentifier('_', node.arguments[0].body)
			) {
				return;
			}

			const scope = context.getScope();
			const errorName = avoidCapture(name, [scope.variableScope], ecmaVersion);
			const callbackNode = node.arguments[0];

			if (params.length === 0 || params[0].name === errorName) {
				return;
			}

			report(
				errorName,
				callbackNode.params[0],
				callbackNode
			);
		},
		[catchSelector]: node => {
			if (
				node.param.name === '_' &&
				!astUtils.someContainIdentifier('_', node.body.body)
			) {
				return;
			}

			const scope = context.getScope();
			const errorName = avoidCapture(name, [scope.variableScope], ecmaVersion);

			if (node.param.name === errorName) {
				return;
			}

			report(
				errorName,
				node.param,
				node
			);
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
