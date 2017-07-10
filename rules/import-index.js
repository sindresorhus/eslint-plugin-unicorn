'use strict';
const isImportingIndex = m => m.endsWith('/') || m.endsWith('index.js') || m.endsWith('index');
const normalize = m => m.replace(/(\/|\/index(.js)?)$/, '');

const importIndex = (context, node, m) => {
	if (isImportingIndex(m.value)) {
		context.report({
			node,
			message: 'Import index files with `.`',
			fix: fixer => fixer.replaceText(m, `'${normalize(m.value)}'`)
		});
	}
};

const create = context => {
	return {
		'CallExpression[callee.name="require"]': node => importIndex(context, node, node.arguments[0]),
		ImportDeclaration: node => importIndex(context, node, node.source)
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
