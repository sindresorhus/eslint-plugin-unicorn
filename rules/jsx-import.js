'use strict';
const arrayToSentence = require('array-to-sentence');
const astUtils = require('eslint-ast-utils');
const getDocsUrl = require('./utils/get-docs-url');
const getVariablesInScope = require('./utils/get-variables-in-scope');
const { isImportDeclaration } = require('./utils');

const pragmas = {
	h: ['dom-chef', 'preact'],
	React: ['react'],
	preact: ['preact']
};

const pragmaAPIs = {
	React: ['cloneElement']
};

const getSuggestedPackages = modules => arrayToSentence(modules.map(x => `\`${x}\``), {lastSeparator: ' or '});

const hasPackage = (node, packages) => node.init ?
	packages.some(x => x === astUtils.getRequireSource(node.init)) :
	packages.some(x => x === node.parent.source.value);

const getVariable = (name, variables) => variables.find(x => x.name === name);

const create = context => {
	let isJsx = false;
	let isModuleAPIsCalled = false;
	let pragma;

	return {
		Program: () => {
			for (const key of Object.keys(pragmas)) {
				pragma = pragma || getVariable(key, getVariablesInScope(context));
			}
		},
		CallExpression(node) {
			const {callee} = node;
			if (
				pragma &&
				callee.type === 'MemberExpression' &&
				callee.object.name === pragma.name &&
				pragmaAPIs[pragma.name].includes(callee.property.name)
			) {
				context.markVariableAsUsed(pragma.name);
				isModuleAPIsCalled = true;
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

				if (!isModuleAPIsCalled && !isJsx) {
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
				isModuleAPIsCalled = false;
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		scheme: [],
		type: 'error',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
