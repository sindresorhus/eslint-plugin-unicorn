'use strict';
const {getStringIfConstant} = require('eslint-utils');

const getDocumentationUrl = require('./utils/get-documentation-url');

const getAllowedImportStyles = (styles, moduleName) => {
	const importStyles = styles[moduleName];

	if (Array.isArray(importStyles)) {
		return importStyles;
	}

	if (typeof importStyles === 'string') {
		return [ importStyles ];
	}

	return null;
}

const getActualImportDeclarationStyles = importDeclaration => {
	const { specifiers } = importDeclaration;

	if (specifiers.length === 0) {
		return [ 'unassigned' ];
	}

	const styles = new Set();

	for (const specifier of specifiers) {
		if (specifier.type === 'ImportDefaultSpecifier') {
			styles.add('default');
			continue;
		}

		if (specifier.type === 'ImportNamespaceSpecifier') {
			styles.add('namespace');
			continue;
		}

		if (specifier.type === 'ImportSpecifier') {
			styles.add('named');
			continue;
		}
	}

	return [ ...styles ];
};

const joinOr = words => {
	return words
		.map((word, index) => {
			if (index === (words.length - 1)) {
				return word;
			}

			if (index === (words.length - 2)) {
				return word + ' or';
			}

			return word + ',';
		})
		.join(' ');
}

const MESSAGE_ID = 'importStyle';

const defaultStyles =  {
	util: 'named',
	path: 'default',
	chalk: 'default',
};

const create = context => {
	let [
		{
			styles = {}
		} = {}
	] = context.options;

	styles = {
		...defaultStyles,
		...styles,
	};

	const report = (node, moduleName, actualImportStyles, allowedImportStyles) => {
		const data = {
			allowedStyles: joinOr(allowedImportStyles),
			moduleName,
		};

		context.report({
			node,
			messageId: MESSAGE_ID,
			data,
		});
	};

	return {
		ImportDeclaration(node) {
			const moduleName = getStringIfConstant(node.source, context.getScope());

			if (!moduleName) {
				return;
			}

			const allowedImportStyles = getAllowedImportStyles(styles, moduleName);

			if (!allowedImportStyles || allowedImportStyles.length === 0) {
				return;
			}

			const actualImportStyles = getActualImportDeclarationStyles(node);

			if (actualImportStyles.every(style => allowedImportStyles.includes(style))) {
				return;
			}

			report(node, moduleName, actualImportStyles, allowedImportStyles);
		},
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[MESSAGE_ID]: 'Use {{allowedStyles}} import for module `{{moduleName}}`.',
		}
	}
};
