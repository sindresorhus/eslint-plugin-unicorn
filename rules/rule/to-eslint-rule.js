import {createRequire} from 'node:module';
import getDocumentationUrl from '../utils/get-documentation-url.js';
import toEslintCreate, {markFunctionWrapped} from './to-eslint-create.js';

// `import defer` still loads, parses, and links modules upfront. Load implementations on first use instead to avoid that startup cost.
const loadModule = createRequire(import.meta.url);

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
Convert Unicorn rule to ESLint rule

@param {string} ruleId
@param {UnicornRule} unicornRule
@returns {ESLint.Rule.RuleModule}
*/
export default function toEslintRule(ruleId, unicornRule) {
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

/**
Create a rule that loads and adapts its implementation on first use.
*/
export function createLazyRule(ruleId, meta) {
	let create;
	return {
		meta,
		create: markFunctionWrapped(context => {
			create ??= toEslintRule(ruleId, loadModule(`../${ruleId}.js`).default).create;
			return create(context);
		}),
	};
}
