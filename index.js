'use strict';
const createDeprecatedRules = require('./rules/utils/create-deprecated-rules.js');
const {loadRules} = require('./rules/utils/rule.js');
const legacyConfigBase = require('./configs/legacy-config-base.js');
const flatConfigBase = require('./configs/flat-config-base.js');
const {name, version} = require('./package.json');

const deprecatedRules = createDeprecatedRules({
	// {ruleId: ReplacementRuleId | ReplacementRuleId[]}, if no replacement, use `{ruleId: []}`
	'import-index': [],
	'no-array-instanceof': 'unicorn/no-instanceof-array',
	'no-fn-reference-in-iterator': 'unicorn/no-array-callback-reference',
	'no-reduce': 'unicorn/no-array-reduce',
	'no-unsafe-regex': [],
	'prefer-dataset': 'unicorn/prefer-dom-node-dataset',
	'prefer-event-key': 'unicorn/prefer-keyboard-event-key',
	'prefer-exponentiation-operator': 'prefer-exponentiation-operator',
	'prefer-flat-map': 'unicorn/prefer-array-flat-map',
	'prefer-node-append': 'unicorn/prefer-dom-node-append',
	'prefer-node-remove': 'unicorn/prefer-dom-node-remove',
	'prefer-object-has-own': 'prefer-object-has-own',
	'prefer-replace-all': 'unicorn/prefer-string-replace-all',
	'prefer-starts-ends-with': 'unicorn/prefer-string-starts-ends-with',
	'prefer-text-content': 'unicorn/prefer-dom-node-text-content',
	'prefer-trim-start-end': 'unicorn/prefer-string-trim-start-end',
	'regex-shorthand': 'unicorn/better-regex',
});

const externalRules = {
	// Covered by `unicorn/no-negated-condition`
	'no-negated-condition': 'off',
	// Covered by `unicorn/no-nested-ternary`
	'no-nested-ternary': 'off',
};

const rules = loadRules();
const recommendedRules = Object.fromEntries(
	Object.entries(rules).map(([id, rule]) => [
		`unicorn/${id}`,
		rule.meta.docs.recommended ? 'error' : 'off',
	]),
);
const allRules = Object.fromEntries(
	Object.keys(rules).map(id => [
		`unicorn/${id}`,
		'error',
	]),
);

const createConfig = (rules, isLegacyConfig = false) => ({
	...(isLegacyConfig ? legacyConfigBase : flatConfigBase),
	plugins: isLegacyConfig ? ['unicorn'] : {unicorn},
	rules: {...externalRules, ...rules},
});

const unicorn = {
	meta: {
		name,
		version,
	},
	rules: {
		...rules,
		...deprecatedRules,
	},
};

const configs = {
	recommended: createConfig(recommendedRules, /* isLegacyConfig */ true),
	all: createConfig(allRules, /* isLegacyConfig */ true),
	'flat/recommended': createConfig(recommendedRules),
	'flat/all': createConfig(allRules),
};

module.exports = {...unicorn, configs};
