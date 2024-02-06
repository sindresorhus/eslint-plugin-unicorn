'use strict';

const {getFunctionHeadLocation, getFunctionNameWithKind} = require('@eslint-community/eslint-utils');
const {} = require('./ast/index.js');
const {} = require('./fix/index.js');
const {} = require('./utils/index.js');


const MESSAGE_ID_ERROR = 'no-anonymous-default-export/error';
const MESSAGE_ID_SUGGESTION = 'no-anonymous-default-export/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'The {{description}} should be named.',
	[MESSAGE_ID_SUGGESTION]: 'Name it as {{name}}.',
};

function getNodeDescription(node) {
	if (node.type === 'ClassDeclaration') {
		return 'class'
	}

	const nameWithKind = getFunctionNameWithKind(node)
	if (nameWithKind.endsWith(' \'default\'')) {
		return nameWithKind.slice(0, -' \'default\''.length)
	}

	return nameWithKind
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		ExportDefaultDeclaration(exportDefaultDeclaration) {
			const {declaration} = exportDefaultDeclaration;

			if (!(
				(
					(
						declaration.type === 'FunctionDeclaration' ||
						declaration.type === 'ClassDeclaration'
					)
					&& !declaration.id
				)
				||
				declaration.type === 'ArrowFunctionExpression'
			)) {
				return;
			}

			const problem = {
				node: declaration,
				messageId: MESSAGE_ID_ERROR,
				data: {
					description: getNodeDescription(declaration),
				},
			};

			return problem;

			return {
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: 'unicorn',
					replacement: '🦄',
				},


				/** @param {import('eslint').Rule.RuleFixer} fixer */
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							value: 'unicorn',
							replacement: '🦄',
						},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.replaceText(node, '\'🦄\''),
					}
				],

			};
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow anonymous functions and classes as the default export.',
		},

		hasSuggestions: true,
		messages,
	},
};
