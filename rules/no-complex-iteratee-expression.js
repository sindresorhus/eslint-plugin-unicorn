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
	`:not(${
		[
			'[right.type="Identifier"]',
			'[right.type="MemberExpression"]',
			'[right.type="CallExpression"][right.arguments.length=0]',
			[
				'[right.type="CallExpression"]',
				'[right.callee.type="MemberExpression"]',
				'[right.callee.object.type="Identifier"]',
				'[right.callee.object.name="Object"]',
				'[right.callee.property.type="Identifier"]',
				'[right.callee.property.name=/(keys|values|entries)/]'
			].join('')
		].join(', ')
	})`
].join('');

const create = context => {
	const source = context.getSourceCode();
	return {
		[complexForSelector](node) {
			// Checks if we can deduce a name for the iteratee from the iterated value
			if (node.left.type === 'VariableDeclaration' &&
				node.left.declarations.length === 1 &&
				node.left.declarations[0].id.type === 'Identifier') {
				const iterateeName = pluralize(node.left.declarations[0].id.name);

				if (!resolveVariableName(iterateeName, context.getScope())) {
					const iteratee = source.getText(node.right);

					context.report({
						node: node.right,
						messageId: MESSAGE_ID,
						* fix(fixer) {
							yield fixer.insertTextBefore(node, `const ${iterateeName} = ${iteratee};\n`);
							yield fixer.replaceText(node.right, iterateeName);
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
		fixable: 'code',
		schema,
		messages
	}
};
