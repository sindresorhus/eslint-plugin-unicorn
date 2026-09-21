import {
	compareSpecificity,
	getMaximumSpecificity,
	getParentStyleRule,
	getRuleSpecificities,
} from './shared/css-selector-specificity.js';

const MESSAGE_ID = 'no-nesting-with-mixed-specificity';
const messages = {
	[MESSAGE_ID]: 'Do not nest rules under selector lists with mixed specificity.',
};

const hasMixedSpecificity = specificities => specificities.some(specificity => compareSpecificity(specificity, specificities[0]) !== 0);

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const ruleSpecificities = new WeakMap();

	context.on('Rule', rule => {
		if (rule.prelude.type !== 'SelectorList') {
			return;
		}

		const parentRule = getParentStyleRule(rule, context);
		const parentSpecificities = parentRule && ruleSpecificities.get(parentRule);
		const nestingSpecificity = getMaximumSpecificity(parentSpecificities ?? []);
		const specificities = parentSpecificities?.length === 0 ? [] : getRuleSpecificities(rule, nestingSpecificity);
		ruleSpecificities.set(rule, specificities);

		if (parentSpecificities && hasMixedSpecificity(parentSpecificities)) {
			return {
				node: rule.prelude,
				messageId: MESSAGE_ID,
			};
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow nesting under selector lists with mixed specificity.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
