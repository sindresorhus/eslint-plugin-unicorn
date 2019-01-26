'use strict';
const arrayToSentence = require('array-to-sentence');
const astUtils = require('eslint-ast-utils');
const getDocsUrl = require('./utils/get-docs-url');

const pragmas = {
	h: ['dom-chef', 'preact'],
	React: ['react'],
	preact: ['preact']
};

const getSuggestedPackages = modules => arrayToSentence(modules.map(x => `\`${x}\``), {lastSeparator: ' or '});

const hasPackage = (node, packages) => node.init ?
	packages.some(x => x === astUtils.getRequireSource(node.init)) :
	packages.some(x => x === node.parent.source.value);

const isImportDeclaration = node => node.init ?
	astUtils.isStaticRequire(node.init) :
	node.parent.type === 'ImportDeclaration';

const getVariable = (name, variables) => variables.find(x => x.name === name);

// https://github.com/yannickcr/eslint-plugin-react/blob/master/lib/util/variable.js#L27-L52
const getVariablesInScope = context => {
	let scope = context.getScope();
	let {variables} = scope;

	while (scope.type !== 'global') {
		scope = scope.upper;
		variables = variables.concat(scope.variables);
	}

	if (scope.childScopes.length > 0) {
		variables = scope.childScopes[0].variables.concat(variables);

		if (scope.childScopes[0].childScopes.length > 0) {
			variables = scope.childScopes[0].childScopes[0].variables.concat(variables);
		}
	}

	return variables.reverse();
};

const create = context => {
	let isJsx = false;
	let pragma;

	return {
		Program: () => {
			for (const x of Object.keys(pragmas)) {
				pragma = pragma || getVariable(x, getVariablesInScope(context));
			}
		},
		JSXOpeningElement: node => {
			isJsx = true;

			if (pragma) {
				context.markVariableAsUsed(pragma.name);
			} else {
				context.report({
					node,
					message: 'A valid pragma must be in scope when using JSX'
				});
			}
		},
		'Program:exit': () => {
			if (pragma) {
				const {node} = pragma.defs[0];
				const isDeclaration = isImportDeclaration(node);
				const packages = pragmas[pragma.name];
				const hasPkg = hasPackage(node, packages);

				if (!isJsx) {
					context.report({
						node,
						message: `\`${pragma.name}\` shouldn't be imported when not using JSX`
					});
				}

				if (isJsx && (!isDeclaration || !hasPkg)) {
					context.report({
						node,
						message: `\`${pragma.name}\` should be imported from ${getSuggestedPackages(packages)}`,
						fix: fixer => {
							if (isDeclaration && packages.length === 1) {
								const val = node.init ? node.init.arguments[0] : node.parent.source;
								return fixer.replaceText(val, `'${packages[0]}'`);
							}
						}
					});
				}

				isJsx = false;
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
