import noArrayMutateRule from './shared/no-array-mutate-rule.js';

/** @type {import('eslint').Rule.RuleModule} */
const config = noArrayMutateRule('sort');

export default config;
