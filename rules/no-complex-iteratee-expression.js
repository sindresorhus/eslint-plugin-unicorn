'use strict';
const pluralize = require('pluralize');
const getDocumentationUrl = require('./utils/get-documentation-url');
const resolveVariableName = require('./utils/resolve-variable-name');

const MESSAGE_ID = 'no-complex-iteratee-expression';
const messages = {
	[MESSAGE_ID]: 'Move the complex iteratee expression out of the "for-of" header.'
};

const complexForSelector = [
	'ForOfStatement',
	`:matches(${
		[
			// Allow some specific `Object` methods (`Object.keys/values/entries`)
			[
				'[right.type="CallExpression"]',
				'[right.callee.type="MemberExpression"]',
				'[right.callee.object.type="Identifier"]',
				'[right.callee.object.name="Object"]',
				'[right.callee.property.type="Identifier"]',
				'[right.callee.property.name!="keys"]',
				'[right.callee.property.name!="values"]',
				'[right.callee.property.name!="entries"]',
				'[right.arguments.length>0]'
			].join(''),
			// Disallow every call with arguments (except if they are object, in that case it is already handled above)
			[
				'[right.type="CallExpression"]',
				'[right.callee.object.name!="Object"]',
				'[right.arguments.length>0]'
			].join('')
		].join(', ')
	})`
].join('');

const create = context => {
	const source = context.getSourceCode();
	return {
		[complexForSelector](node) {
			if (node.left.type === 'VariableDeclaration' &&
				node.left.declarations.length === 1 &&
				node.left.declarations[0].id.type === 'Identifier') {
				const iterateeName = pluralize(node.left.declarations[0].id.name);

				if (!resolveVariableName(iterateeName, context.getScope())) {
					const iteratee = source.getText(node.right);

					context.report({
						node: node.right,
						messageId: MESSAGE_ID,
						fix: fixer => {
							// FIXME: handle ";"
							fixer.insertTextBefore(node, `const ${iterateeName} = ${iteratee};`);
							fixer.replaceText(node.right, iterateeName);
						}
					});
					return;
				}
			}

			context.report({
				node: node.right,
				messageId: MESSAGE_ID
			});
		}
	};
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: '',
		schema,
		messages
	}
};
