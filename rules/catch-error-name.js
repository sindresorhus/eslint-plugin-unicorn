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
	})`,
	'[arguments.0.params.length=1]'
].join('');

const catchSelector = [
	'CatchClause',
	// Ignore optional catch binding
	'[param]'
].join('');

const create = context => {
	const {ecmaVersion} = context.parserOptions;
	const sourceCode = context.getSourceCode();
	const {scopeManager} = sourceCode;

	const {name, caughtErrorsIgnorePattern} = {
		name: 'error',
		caughtErrorsIgnorePattern: /^[\dA-Za-z]+[Ee]rror$/.source,
		...context.options[0]
	};
	const ignoreRegex = new RegExp(caughtErrorsIgnorePattern);

	function check(parameter, node) {
		if (
			ignoreRegex.test(parameter.name) ||
			(
				parameter.name === '_' &&
				// Should be `node.body.body` in `CatchClause`, body also not right
				// will fix it when fixing #648
				!astUtils.someContainIdentifier('_', node.body)
			)
		) {
			return;
		}

		const scope = context.getScope();
		const fixed = avoidCapture(name, [scope.variableScope], ecmaVersion);

		if (parameter.name === fixed) {
			return;
		}

		const problem = {
			node,
			message: `The catch parameter should be named \`${fixed}\`.`
		};

		if (parameter.type === 'Identifier') {
			problem.fix = fixer => {
				const nodes = [parameter];

				const variables = scopeManager.getDeclaredVariables(node);
				for (const variable of variables) {
					if (variable.name !== parameter.name) {
						continue;
					}

					for (const reference of variable.references) {
						nodes.push(reference.identifier);
					}
				}

				return nodes.map(node => renameIdentifier(node, fixed, fixer, sourceCode));
			};
		}

		context.report(problem);
	}

	return {
		[promiseCatchSelector]: node => {
			const callbackNode = node.arguments[0];
			check(callbackNode.params[0], callbackNode);
		},
		[catchSelector]: node => {
			check(node.param, node);
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
