/* eslint unicorn/prevent-abbreviations:"off" -- https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2015 */

/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
	ignoreConfig: [
		'all',
		'flat/all',
		'flat/recommended',
	],
	ignoreDeprecatedRules: true,
	ruleDocTitleFormat: 'desc',
	ruleListColumns: [
		'name',
		'description',
		'configsError',
		// Omit `configsOff` since we don't intend to convey meaning by setting rules to `off` in the `recommended` config.
		'configsWarn',
		'fixable',
		'hasSuggestions',
		'requiresTypeChecking',
	],
	urlConfigs: 'https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs',
	// Workaround for https://github.com/bmish/eslint-doc-generator/issues/615
	pathRuleDoc: '../docs/rules/{name}.md',
	pathRuleList: '../readme.md',
};

export default config;
