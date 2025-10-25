import toEslintCreate from './to-eslint-create.js';
import getDocumentationUrl from '../utils/get-documentation-url.js';

/**
@import * as ESLint from 'eslint';
@import {UnicornCreate} from './to-eslint-create.js';
*/

/**
@typedef {ESLint.Rule.RuleModule & {
	create: UnicornCreate
}} UnicornRule
*/

/**
Convert Unicorn rule to Eslint rule

@param {string} ruleId
@param {UnicornRule} unicornRule
@returns {ESLint.Rule.RuleModule}
*/
function toEslintRule(ruleId, unicornRule) {
	return {
		meta: {
			// If there is are, options add `[]` so ESLint can validate that no data is passed to the rule.
			// https://github.com/not-an-aardvark/eslint-plugin-eslint-plugin/blob/master/docs/rules/require-meta-schema.md
			schema: [],
			...unicornRule.meta,
			docs: {
				...unicornRule.meta.docs,
				url: getDocumentationUrl(ruleId),
			},
		},
		create: toEslintCreate(unicornRule.create),
	};
}

export default toEslintRule;
