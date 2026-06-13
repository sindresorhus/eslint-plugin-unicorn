import {isEmptyNode, isNullLiteral, isUndefined} from './ast/index.js';
import {isTypeScriptFile} from './utils/index.js';
import getSwitchCaseHeadLocation from './utils/get-switch-case-head-location.js';

const MESSAGE_ID_ERROR = 'no-useless-switch-case/error';
const MESSAGE_ID_SUGGESTION = 'no-useless-switch-case/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Useless case in switch statement.',
	[MESSAGE_ID_SUGGESTION]: 'Remove this case.',
};

const isEmptySwitchCase = node => node.consequent.every(node => isEmptyNode(node));
const isNullishSwitchCase = node => isUndefined(node.test) || isNullLiteral(node.test);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const isTypeScript = isTypeScriptFile(context.physicalFilename);

	context.on('SwitchStatement', function * (switchStatement) {
		const {cases} = switchStatement;

		// We only check cases where the last case is the `default` case
		if (cases.length < 2 || cases.at(-1).test !== null) {
			return;
		}

		for (let index = cases.length - 2; index >= 0; index--) {
			const node = cases[index];
			if (!isEmptySwitchCase(node)) {
				break;
			}

			if (isTypeScript && isNullishSwitchCase(node)) {
				continue;
			}

			yield {
				node,
				loc: getSwitchCaseHeadLocation(node, context),
				messageId: MESSAGE_ID_ERROR,
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.remove(node),
					},
				],
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless case in switch statements.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
