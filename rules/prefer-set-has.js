'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const getReferences = require('./utils/get-references');

const selector = [
	'VariableDeclarator',
	'[init.type="ArrayExpression"]',
	'>',
	'Identifier'
].join('');

const MESSAGE_ID = "preferSetHas";

const isIncludesCall = node => {
	if (!node.parent || !node.parent.parent) {
		return false;
	}
	const {callee, type} = node.parent.parent
	return (
		type === 'CallExpression' &&
		callee &&
		callee.type === 'MemberExpression' &&
		!callee.computed &&
		callee.object === node &&
		callee.property &&
		callee.property.type === 'Identifier' &&
		callee.property.name === 'includes'
	)
}

const create = context => {
	const scope = context.getScope();
	let identifiers = new Set([]);

	return {
		[selector]: node => {
				const allReferences = getReferences(scope);
				const variable = allReferences.find(
					reference => reference.identifier === node
				).resolved;

				const {references} = variable;
				const nodes = references
					.map(({identifier}) => identifier)
					.filter(x => x !== node)

				if (
					nodes.every(node => isIncludesCall(node))
				) {
					context.report({
						node,
						messageId: MESSAGE_ID,
						data: {
							name: node.name
						},
						fix: fixer => [
							fixer.insertTextBefore(node.parent.init, 'Set('),
							fixer.insertTextAfter(node.parent.init, ')'),
							...nodes.map(node => fixer.replaceText(node.parent.property, 'has'))
						]
					})
				}
		},
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
