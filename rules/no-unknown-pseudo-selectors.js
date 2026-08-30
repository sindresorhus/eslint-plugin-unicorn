import {ident} from '@eslint/css-tree';
import standardPseudoSelectors from './shared/standard-pseudo-selectors.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-unknown-pseudo-selectors';
const messages = {
	[MESSAGE_ID]: 'Unknown pseudo-selector \'{{selector}}\'.',
};

const toAsciiLowerCase = string => string.replaceAll(/[A-Z]/g, character => character.toLowerCase());

const getPseudoSelectorKey = pseudoSelector => {
	const colonCount = pseudoSelector.startsWith('::') ? 2 : 1;
	return `${colonCount}:${toAsciiLowerCase(ident.decode(pseudoSelector.slice(colonCount)))}`;
};

const standardPseudoSelectorKeys = new Set(standardPseudoSelectors.map(pseudoSelector => getPseudoSelectorKey(pseudoSelector)));

const getPseudoSelector = node => `${node.type === 'PseudoElementSelector' ? '::' : ':'}${node.name}`;

const getProblem = (node, allowedPseudoSelectorKeys) => {
	const pseudoSelector = getPseudoSelector(node);
	const pseudoSelectorKey = getPseudoSelectorKey(pseudoSelector);

	if (
		standardPseudoSelectorKeys.has(pseudoSelectorKey)
		|| allowedPseudoSelectorKeys.has(pseudoSelectorKey)
	) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
		data: {selector: pseudoSelector},
	};
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const [{allow}] = context.options;
	const allowedPseudoSelectorKeys = new Set(allow.map(pseudoSelector => getPseudoSelectorKey(pseudoSelector)));

	context.on('PseudoClassSelector', node => getProblem(node, allowedPseudoSelectorKeys));
	context.on('PseudoElementSelector', node => getProblem(node, allowedPseudoSelectorKeys));
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unknown pseudo-class and pseudo-element selectors.',
			recommended: false,
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					allow: {
						type: 'array',
						uniqueItems: true,
						items: {
							type: 'string',
							pattern: '^:{1,2}[^:()]+$',
						},
						description: 'Additional pseudo-selectors to allow.',
					},
				},
			},
		],
		defaultOptions: [{allow: []}],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
