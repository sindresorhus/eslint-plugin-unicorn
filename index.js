import createDeprecatedRules from './rules/utils/create-deprecated-rules.js';
import flatConfigBase from './configs/flat-config-base.js';
import rules from './rules/index.js';
import packageJson from './package.json' with {type: 'json'};

const deprecatedRules = createDeprecatedRules({
	// {ruleId: ReplacementRuleId | ReplacementRuleId[]}, if no replacement, use `{ruleId: []}`
	'no-instanceof-array': 'unicorn/no-instanceof-builtins',
});

const externalRules = {
	// Covered by `unicorn/no-negated-condition`
	'no-negated-condition': 'off',
	// Covered by `unicorn/no-nested-ternary`
	'no-nested-ternary': 'off',
};

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

const createConfig = (rules, flatConfigName) => ({
	...flatConfigBase,
	name: flatConfigName,
	plugins: {
		unicorn,
	},
	rules: {
		...externalRules,
		...rules,
	},
});

const unicorn = {
	meta: {
		name: packageJson.name,
		version: packageJson.version,
	},
	rules: {
		...rules,
		...deprecatedRules,
	},
};

const configs = {
	recommended: createConfig(recommendedRules, 'unicorn/recommended'),
	all: createConfig(allRules, 'unicorn/all'),

	// TODO: Remove this at some point. Kept for now to avoid breaking users.
	'flat/recommended': createConfig(recommendedRules, 'unicorn/flat/recommended'),
	'flat/all': createConfig(allRules, 'unicorn/flat/all'),
};

const allConfigs = {
	...unicorn,
	configs,
};

export default allConfigs;
