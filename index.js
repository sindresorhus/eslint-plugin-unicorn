import createDeprecatedRules from './rules/utils/create-deprecated-rules.js';
import flatConfigBase from './configs/flat-config-base.js';
import coreRuleReplacements from './configs/core-rule-replacements.js';
import * as rawRules from './rules/index.js';
import {toEslintRules} from './rules/rule/index.js';
import packageJson from './package.json' with {type: 'json'};

const rules = toEslintRules(rawRules);

const deprecatedRules = createDeprecatedRules({
	'better-regex': {
		message: 'Removed. Prefer `eslint-plugin-regexp`',
		replacedBy: [],
	},
	'no-instanceof-array': {
		message: 'Replaced by `unicorn/no-instanceof-builtins` which covers more cases.',
		replacedBy: ['unicorn/no-instanceof-builtins'],
	},
	'no-length-as-slice-end': {
		message: 'Replaced by `unicorn/no-unnecessary-slice-end` which covers more cases.',
		replacedBy: ['unicorn/no-unnecessary-slice-end'],
	},
	'no-hex-escape': {
		message: 'Replaced by `unicorn/prefer-unicode-code-point-escapes` which covers more cases.',
		replacedBy: ['unicorn/prefer-unicode-code-point-escapes'],
	},
	'no-array-push-push': {
		message: 'Replaced by `unicorn/prefer-single-call` which covers more cases.',
		replacedBy: ['unicorn/prefer-single-call'],
	},
	'prevent-abbreviations': {
		message: 'Renamed to `unicorn/name-replacements`.',
		replacedBy: ['unicorn/name-replacements'],
	},
	'prefer-json-parse-buffer': {
		message: 'Renamed to `unicorn/consistent-json-file-read`.',
		replacedBy: ['unicorn/consistent-json-file-read'],
	},
	'prefer-dom-node-dataset': {
		message: 'Renamed to `unicorn/dom-node-dataset`.',
		replacedBy: ['unicorn/dom-node-dataset'],
	},
});

const getExternalRules = rules => Object.fromEntries(
	coreRuleReplacements
		.filter(ruleName => rules[`unicorn/${ruleName}`] === 'error')
		.map(ruleName => [ruleName, 'off']),
);

const recommendedRules = Object.fromEntries(Object.entries(rules).map(([id, rule]) => [
	`unicorn/${id}`,
	rule.meta.docs.recommended ? 'error' : 'off',
]));

const unopinionatedRules = Object.fromEntries(Object.entries(rules).map(([id, rule]) => [
	`unicorn/${id}`,
	rule.meta.docs.recommended === 'unopinionated' ? 'error' : 'off',
]));

// TODO: Enable `prefer-iterator-concat` in the recommended and unopinionated configs when targeting Node.js 26.

const allRules = Object.fromEntries(Object.keys(rules).map(id => [
	`unicorn/${id}`,
	'error',
]));

const createConfig = (rules, flatConfigName) => ({
	...flatConfigBase,
	name: flatConfigName,
	plugins: {
		unicorn,
	},
	rules: {
		...getExternalRules(rules),
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
	unopinionated: createConfig(unopinionatedRules, 'unicorn/unopinionated'),
	all: createConfig(allRules, 'unicorn/all'),

	// TODO: Remove this at some point. Kept for now to avoid breaking users.
	'flat/recommended': createConfig(recommendedRules, 'unicorn/flat/recommended'),
	'flat/all': createConfig(allRules, 'unicorn/flat/all'),
};

unicorn.configs = configs;

export default unicorn;
