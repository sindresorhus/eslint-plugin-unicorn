import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isEmptyNode, isNullLiteral, isUndefinedValue} from './ast/index.js';
import {isTypeScriptFile} from './utils/index.js';
import getSwitchCaseHeadLocation from './utils/get-switch-case-head-location.js';

const MESSAGE_ID_ERROR = 'no-useless-switch-case/error';
const MESSAGE_ID_SUGGESTION = 'no-useless-switch-case/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Useless case in switch statement.',
	[MESSAGE_ID_SUGGESTION]: 'Remove this case.',
};

const isEmptySwitchCase = node => node.consequent.every(node => isEmptyNode(node));
const isNullishSwitchCase = node => isUndefinedValue(node.test) || isNullLiteral(node.test);

/**
@param {import('eslint').Rule.RuleContext} context
*/
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

			const problem = {
				node,
				loc: getSwitchCaseHeadLocation(node, context),
				messageId: MESSAGE_ID_ERROR,
			};

			// `switch` evaluates every case test it reaches, so removing a case whose test has a side effect would drop that side effect. The suggestion removes the whole case, so a comment in it would be dropped too.
			if (
				!hasSideEffect(node.test, context.sourceCode)
				&& context.sourceCode.getCommentsInside(node).length === 0
			) {
				problem.suggest = [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						/**
						@param {import('eslint').Rule.RuleFixer} fixer
						*/
						fix: fixer => fixer.remove(node),
					},
				];
			}

			yield problem;
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
