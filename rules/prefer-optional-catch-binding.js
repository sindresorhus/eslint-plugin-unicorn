'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {findVariable} = require('eslint-utils');
const replaceNodeOrTokenAndSpacesBefore = require('./utils/replace-node-or-token-and-spaces-before');

const ERROR_MESSAGE_ID = 'error';
const messages = {
	[ERROR_MESSAGE_ID]: 'Remove unused catch binding `{{name}}`.'
};

const selector = [
	'CatchClause',
	'>',
	'Identifier.param'
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector]: node => {
			const scope = context.getScope();
			const variable = findVariable(scope, node);

			if (variable.references.length > 0) {
				return;
			}

			context.report({
				node,
				messageId: ERROR_MESSAGE_ID,
				data: {name: node.name},
				* fix(fixer) {
					yield * replaceNodeOrTokenAndSpacesBefore(node, '', fixer, sourceCode);
				}
			});
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
		messages
	}
};
