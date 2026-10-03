/**
@type {import('eslint-doc-generator').GenerateOptions}
*/
const config = {
	configEmoji: [
		['recommended', '✅'],
		['unopinionated', '☑️'],
	],
	ignoreConfig: [
		'all',
		'recommended-css',
		'recommended-html',
		'recommended-json',
		'recommended-markdown',
		'recommended-toml',
		'recommended-yaml',
	],
	ignoreDeprecatedRules: true,
	ruleDocTitleFormat: 'name',
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
	urlConfigs: 'https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config',
};

export default config;
