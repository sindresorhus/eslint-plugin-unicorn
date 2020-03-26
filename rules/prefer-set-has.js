'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const getReferences = require('./utils/get-references');

const selector = [
	':not(ExportNamedDeclaration)',
	'>',
	'VariableDeclaration',
	'>',
	'VariableDeclarator',
	'[init.type="ArrayExpression"]',
	'>',
	'Identifier'
].join('');

const MESSAGE_ID = 'preferSetHas';

const isIncludesCall = node => {
	/* istanbul ignore next */
	if (!node.parent || !node.parent.parent) {
		return false;
	}

	const {type, optional, callee, arguments: parameters} = node.parent.parent;
	return (
		type === 'CallExpression' &&
		!optional,
		callee &&
		callee.type === 'MemberExpression' &&
		!callee.computed &&
		callee.object === node &&
		callee.property.type === 'Identifier' &&
		callee.property.name === 'includes' &&
		parameters.length === 1 &&
		parameters[0].type !== 'SpreadElement'
	);
};

const create = context => {
	const scope = context.getScope();
	const declarations = new Set();

	return {
		[selector]: node => {
			declarations.add(node);
		},
		'Program:exit'() {
			if (declarations.size === 0) {
				return;
			}

			const references = getReferences(scope);
			for (const declaration of declarations) {
				const variable = references
					.find(({identifier}) => identifier === declaration)
					.resolved;
				const nodes = variable.references
					.map(({identifier}) => identifier)
					.filter(node => node !== declaration);

				if (
					nodes.length > 0 &&
					nodes.every(node => isIncludesCall(node))
				) {
					context.report({
						node: declaration,
						messageId: MESSAGE_ID,
						data: {
							name: declaration.name
						},
						fix: fixer => [
							fixer.insertTextBefore(declaration.parent.init, 'new Set('),
							fixer.insertTextAfter(declaration.parent.init, ')'),
							...nodes.map(node => fixer.replaceText(node.parent.property, 'has'))
						]
					});
				}
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages: {
			[MESSAGE_ID]: '`{{name}}` should be a `Set`, and use `{{name}}.has()` to check existence or non-existence.'
		}
	}
};
