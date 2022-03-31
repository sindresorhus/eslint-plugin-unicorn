'use strict';
const {isEmptyNode} = require('./ast/index.js');
const getSwitchCaseHeadLocation = require('./utils/get-switch-case-head-location.js');


const MESSAGE_ID_ERROR = 'no-useless-switch-case/error';
const MESSAGE_ID_SUGGESTION = 'no-useless-switch-case/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Useless case in switch statement.',
	[MESSAGE_ID_SUGGESTION]: 'Remove this case.',
};

const isEmptySwitchCase = node => node.consequent.every(node => isEmptyNode(node));

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		SwitchStatement(switchStatement) {
			const {cases} = switchStatement;
			const node = cases.find(
				(switchCase, index) => isEmptySwitchCase(switchCase) && cases[index + 1] && cases[index + 1].test === null
			);

			if (!node) {
				return;
			}

			return {
				node: node,
				loc: getSwitchCaseHeadLocation(node, context.getSourceCode()),
				messageId: MESSAGE_ID_ERROR,
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.remove(node),
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
			description: 'Disallow useless case in switch statement.',
		},

		hasSuggestions: true,
		messages,
	},
};
