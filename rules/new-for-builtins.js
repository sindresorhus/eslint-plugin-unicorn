'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const enforceNew = new Set([
	'Object',
	'Array',
	'ArrayBuffer',
	'DataView',
	'Date',
	'Error',
	'Float32Array',
	'Float64Array',
	'Function',
	'Int8Array',
	'Int16Array',
	'Int32Array',
	'Map',
	'WeakMap',
	'Set',
	'WeakSet',
	'Promise',
	'RegExp',
	'Uint8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8ClampedArray'
]);

const disallowNew = new Set([
	'Boolean',
	'Number',
	'String',
	'Symbol'
]);

function isVariableInScope(context, name) {
	let scope = context.getScope();
	let {variables} = scope;

	while (scope.type !== 'global') {
		scope = scope.upper;
		variables = scope.variables.concat(variables);
	}

	if (scope.childScopes.length > 0) {
		variables = scope.childScopes[0].variables.concat(variables);
		if (scope.childScopes[0].childScopes.length > 0) {
			variables = scope.childScopes[0].childScopes[0].variables.concat(variables);
		}
	}

	return variables.some(variable => (
		variable.name === name && variable.defs[0] && variable.defs[0].node
	));
}

const create = context => {
	return {
		CallExpression: node => {
			const {name} = node.callee;

			if (isVariableInScope(context, name)) {
				return;
			}

			if (enforceNew.has(name)) {
				context.report({
					node,
					message: `Use \`new ${name}()\` instead of \`${name}()\`.`,
					fix: fixer => fixer.insertTextBefore(node, 'new ')
				});
			}
		},
		NewExpression: node => {
			const {name} = node.callee;

			if (isVariableInScope(context, name)) {
				return;
			}

			if (disallowNew.has(name)) {
				context.report({
					node,
					message: `Use \`${name}()\` instead of \`new ${name}()\`.`,
					fix: fixer => fixer.removeRange([
						node.range[0],
						node.callee.range[0]
					])
				});
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
