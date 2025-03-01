import createDeprecatedRules from './rules/utils/create-deprecated-rules.js';
import flatConfigBase from './configs/flat-config-base.js';
import rules from './rules/index.js';
import {createRequire} from 'node:module';

const packageJson = createRequire(import.meta.url)('./package.json');

const deprecatedRules = createDeprecatedRules({
	// {ruleId: {message: string, replacedBy: string[]}}
	'no-instanceof-array': {
		message: 'Replaced by `unicorn/no-instanceof-builtins` which covers more cases.',
		replacedBy: ['unicorn/no-instanceof-builtins'],
	},
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
