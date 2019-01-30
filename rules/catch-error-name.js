'use strict';
const astUtils = require('eslint-ast-utils');
const getDocsUrl = require('./utils/get-docs-url');

// Matches `someObj.then([FunctionExpression | ArrowFunctionExpression])`
function isLintablePromiseCatch(node) {
	const {callee} = node;

	if (callee.type !== 'MemberExpression') {
		return false;
	}

	const {property} = callee;

	if (property.type !== 'Identifier' || property.name !== 'catch') {
		return false;
	}

	if (node.arguments.length === 0) {
		return false;
	}

	const [arg0] = node.arguments;

	return arg0.type === 'FunctionExpression' || arg0.type === 'ArrowFunctionExpression';
}

const create = context => {
	const options = Object.assign({}, {
		name: 'error',
		caughtErrorsIgnorePattern: '^_$'
	}, context.options[0]);

	const {name} = options;
	const caughtErrorsIgnorePattern = new RegExp(options.caughtErrorsIgnorePattern);
	const stack = [];

	function push(value) {
		stack.push(value);
	}

	function indexifyName(name, scope) {
		const variables = scope.variableScope.set;

		let currentName = name;
		let index = 1;
		while (
			variables.has(currentName) ||
			stack
				.filter(({skip}) => !skip)
				.find(({errName}) => errName === currentName)
		) {
			index++;
			currentName = name + index;
		}

		return name + (index === 1 ? '' : index);
	}

	function popAndReport(node) {
		const {errName, skip} = stack.pop();

		if (skip) {
			return;
		}

		if (node && errName !== node.name && !caughtErrorsIgnorePattern.test(node.name)) {
			const expectedName = errName;
			const problem = {
				node,
				message: `The catch parameter should be named \`${expectedName}\`.`
			};

			if (node.type === 'Identifier') {
				problem.fix = fixer => {
					const fixings = [fixer.replaceText(node, expectedName)];

					const scope = context.getScope();
					const variable = scope.set.get(node.name);
					if (variable) {
						for (const reference of variable.references) {
							fixings.push(fixer.replaceText(reference.identifier, expectedName));
						}
					}

					return fixings;
				};
			}

			context.report(problem);
		}
	}

	return {
		CallExpression: node => {
			if (isLintablePromiseCatch(node)) {
				const {params} = node.arguments[0];

				if (params.length > 0 && params[0].name === '_') {
					push({
						skip: !astUtils.containsIdentifier('_', node.arguments[0].body)
					});
					return;
				}

				const errName = indexifyName(name, context.getScope());
				push({errName});
			}
		},
		'CallExpression:exit': node => {
			if (isLintablePromiseCatch(node)) {
				popAndReport(node.arguments[0].params[0]);
			}
		},
		CatchClause: node => {
			// Optional catch binding
			if (!node || !node.param) {
				push({
					skip: true
				});
				return;
			}

			if (node.param.name === '_') {
				push({
					skip: !astUtils.someContainIdentifier('_', node.body.body)
				});
				return;
			}

			const errName = indexifyName(name, context.getScope());
			push({errName});
		},
		'CatchClause:exit': node => {
			popAndReport(node.param);
		}
	};
};

const schema = [{
	type: 'object',
	properties: {
		name: {
			type: 'string'
		},
		caughtErrorsIgnorePattern: {
			type: 'string'
		}
	}
}];

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code',
		schema
	}
};
