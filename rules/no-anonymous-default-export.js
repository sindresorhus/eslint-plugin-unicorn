'use strict';

const {getFunctionHeadLocation, getFunctionNameWithKind} = require('@eslint-community/eslint-utils');
const getClassHeadLocation = require('./utils/get-class-head-location.js');
const {} = require('./ast/index.js');
const {} = require('./fix/index.js');
const {} = require('./utils/index.js');


const MESSAGE_ID_ERROR = 'no-anonymous-default-export/error';
const MESSAGE_ID_SUGGESTION = 'no-anonymous-default-export/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'The {{description}} should be named.',
	[MESSAGE_ID_SUGGESTION]: 'Name it as {{name}}.',
};

const EXPECTED_FUNCTION_DESCRIPTION = ' \'default\''
function getNodeDescription(node, sourceCode) {
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		ExportDefaultDeclaration({declaration: node}) {
			if (!(
				(
					(
						node.type === 'FunctionDeclaration' ||
						node.type === 'ClassDeclaration'
					)
					&& !node.id
				)
				||
				node.type === 'ArrowFunctionExpression'
			)) {
				return;
			}

			const problem = {
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {}
			}

			if (node.type === 'ClassDeclaration') {
				problem.loc = getClassHeadLocation(node, sourceCode);
				problem.data.description = 'class';
				return problem;
			}

			problem.loc = getFunctionHeadLocation(node, sourceCode);
			// [TODO: @fisker]: Ask `@eslint-community/eslint-utils` to expose `getFunctionKind`
			const nameWithKind = getFunctionNameWithKind(node)
			problem.data.description =
				nameWithKind.endsWith(EXPECTED_FUNCTION_DESCRIPTION)
				? nameWithKind.slice(0, -EXPECTED_FUNCTION_DESCRIPTION.length)
				: nameWithKind

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
