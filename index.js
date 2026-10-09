import createDeprecatedRules from './rules/utils/create-deprecated-rules.js';
import flatConfigBase from './configs/flat-config-base.js';
import coreRuleReplacements from './configs/core-rule-replacements.js';
import * as rawRules from './rules/index.js';
import {toEslintRules} from './rules/rule/index.js';
import packageJson from './package.json' with {type: 'json'};

const rules = toEslintRules(rawRules);

const movedToCssicorn = ruleName => ({
	message: `Moved to \`eslint-cssicorn\` as \`cssicorn/${ruleName}\`.`,
	replacedBy: [
		{
			plugin: {
				name: 'eslint-cssicorn',
				url: 'https://github.com/sindresorhus/eslint-cssicorn',
			},
			// ESLint prefixes the rule name with the plugin name, so it must not include `cssicorn/`.
			rule: {
				name: ruleName,
				url: `https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/${ruleName}.md`,
			},
		},
	],
});

const deprecatedRules = createDeprecatedRules({
	'no-unused-array-method-return': {
		message: 'Replaced by `unicorn/no-unused-builtin-method-return` which covers more cases.',
		replacedBy: ['unicorn/no-unused-builtin-method-return'],
	},
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
		message: 'Replaced by `unicorn/prefer-literal-ascii` and `unicorn/prefer-unicode-code-point-escapes`, which cover more cases.',
		replacedBy: ['unicorn/prefer-literal-ascii', 'unicorn/prefer-unicode-code-point-escapes'],
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
	'no-deprecated-css-features': movedToCssicorn('no-deprecated-features'),
	'no-duplicate-css-selectors': movedToCssicorn('no-duplicate-selectors'),
	'no-duplicate-font-family-names': movedToCssicorn('no-duplicate-font-family-names'),
	'no-invalid-media-features': movedToCssicorn('no-invalid-media-features'),
	'no-nesting-with-mixed-specificity': movedToCssicorn('no-nesting-with-mixed-specificity'),
	'no-redundant-nested-style-rules': movedToCssicorn('no-redundant-nested-style-rules'),
	'no-unknown-css-annotations': movedToCssicorn('no-unknown-annotations'),
	'no-unknown-pseudo-selectors': movedToCssicorn('no-unknown-pseudo-selectors'),
	'no-unscoped-css-nesting-selector': movedToCssicorn('no-unscoped-nesting-selector'),
	'prefer-explicit-viewport-units': movedToCssicorn('prefer-explicit-viewport-units'),
	'prefer-media-feature-range-syntax': movedToCssicorn('prefer-media-feature-range-syntax'),
});

const getExternalRules = rules => Object.fromEntries(
	coreRuleReplacements
		.filter(ruleName => rules[`unicorn/${ruleName}`] === 'error')
		.map(ruleName => [ruleName, 'off']),
);

const isJavaScriptRule = rule => !rule.meta.languages || rule.meta.languages.includes('js/js') || rule.meta.languages.includes('*');

const recommendedRules = Object.fromEntries(Object.entries(rules).map(([id, rule]) => [
	`unicorn/${id}`,
	rule.meta.docs.recommended && isJavaScriptRule(rule) ? 'error' : 'off',
]));

const unopinionatedRules = Object.fromEntries(Object.entries(rules).map(([id, rule]) => [
	`unicorn/${id}`,
	rule.meta.docs.recommended === 'unopinionated' && isJavaScriptRule(rule) ? 'error' : 'off',
]));

// TODO: Enable `prefer-iterator-concat` in the recommended and unopinionated configs when targeting Node.js 26.

const allRules = Object.fromEntries(
	Object.entries(rules)
		.filter(([, rule]) => isJavaScriptRule(rule))
		.map(([id]) => [
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
};

const nonJavaScriptLanguages = {
	css: ['css/css'],
	html: ['html/html'],
	json: ['json/json', 'json/jsonc', 'json/json5'],
	markdown: ['markdown/commonmark', 'markdown/gfm'],
	soml: ['soml/soml'],
	toml: ['toml/toml'],
	yaml: ['yml/yaml'],
};

const isLanguageSupported = (rule, language) => {
	const {languages} = rule.meta;
	return !languages || languages.includes('*') || languages.includes(language) || languages.includes(`${language.slice(0, language.lastIndexOf('/'))}/*`);
};

for (const [name, languages] of Object.entries(nonJavaScriptLanguages)) {
	const configName = `recommended-${name}`;
	configs[configName] = {
		name: `unicorn/${configName}`,
		plugins: {unicorn},
		rules: Object.fromEntries(Object.entries(rules)
			.filter(([, rule]) => !rule.meta.deprecated && languages.every(language => isLanguageSupported(rule, language)))
			.map(([ruleName, rule]) => [`unicorn/${ruleName}`, rule.meta.docs.recommended ? 'error' : 'off'])),
	};
}

unicorn.configs = configs;

export default unicorn;
