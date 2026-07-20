/** @import * as ESLint from 'eslint'; */

import {unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-barrel-files';
const messages = {
	[MESSAGE_ID]: 'Barrel files are not allowed.',
};

const getImportedBindingNames = program => {
	const importedBindingNames = new Set();

	for (const node of program.body) {
		if (node.type !== 'ImportDeclaration') {
			continue;
		}

		for (const specifier of node.specifiers) {
			importedBindingNames.add(specifier.local.name);
		}
	}

	return importedBindingNames;
};

const isBarrelFile = program => {
	const importedBindingNames = getImportedBindingNames(program);
	let hasReExport = false;

	for (const node of program.body) {
		if (node.type === 'ImportDeclaration') {
			if (node.specifiers.length === 0) {
				return false;
			}

			continue;
		}

		if (node.type === 'ExportAllDeclaration') {
			hasReExport = true;
			continue;
		}

		if (node.type === 'ExportNamedDeclaration') {
			if (
				node.declaration
				|| (!node.source && node.specifiers.some(specifier => !importedBindingNames.has(specifier.local.name)))
			) {
				return false;
			}

			hasReExport ||= node.specifiers.length > 0;
			continue;
		}

		if (node.type === 'ExportDefaultDeclaration') {
			let declaration = unwrapTypeScriptExpression(node.declaration);
			while (declaration.type === 'TSInstantiationExpression') {
				declaration = unwrapTypeScriptExpression(declaration.expression);
			}

			if (declaration.type === 'Identifier' && importedBindingNames.has(declaration.name)) {
				hasReExport = true;
				continue;
			}
		}

		return false;
	}

	return hasReExport;
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('Program', node => {
		if (!isBarrelFile(node)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow barrel files.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
