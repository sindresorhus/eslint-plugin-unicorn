'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const declarationHandler = (context, node, options) => {
	const moduleName = getModuleName(node);
	const moduleImportType = getModuleImportType(node);

	for (const importStyle in options) {
		if ({}.hasOwnProperty.call(options, importStyle)) {
			for (const importFile in options[importStyle]) {
				if (importFile === moduleName && moduleImportType === 'namedImport' && importStyle === 'defaultExport' && options[importStyle][importFile] === true) {
					context.report({
						node,
						message: `Do not make named import for ${moduleName}`
					});
				} else if (importFile === moduleName && moduleImportType === 'defaultImport' && importStyle === 'namedExport' && options[importStyle][importFile] === true) {
					context.report({
						node,
						message: `Do not make default import for ${moduleName}`
					});
				}
			}
		}
	}
};

function getModuleName(node) {
	if (node.type === 'VariableDeclaration') {
		return node.declarations[0].init.arguments[0].value;
	}

	return node.source.value;
}

function getModuleImportType(node) {
	if (node.type === 'VariableDeclaration') {
		if (node.declarations[0].id.type === 'ObjectPattern') {
			return 'namedImport';
		}

		return 'defaultImport';
	}

	if (node.specifiers[0].type === 'ImportSpecifier') {
		return 'namedImport';
	}

	return 'defaultImport';
}

const create = context => {
	const options = {
		defaultExport: {
			path: true,
			chalk: true,
			...(context.options[0] && context.options[0].defaultExport)
		},
		namedExport: {
			util: true,
			lodash: true,
			underscore: true,
			...(context.options[0] && context.options[0].namedExport)
		}
	};
	return {
		VariableDeclaration: node => declarationHandler(context, node, options),
		ImportDeclaration: node => declarationHandler(context, node, options)
	};
};

const schema = [{
	type: 'object',
	properties: {
		defaultExport: {
			type: 'object'
		},
		namedExport: {
			type: 'object'
		}
	}
}];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code',
		schema
	}
};
