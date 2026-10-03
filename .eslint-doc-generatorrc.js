/**
@type {import('eslint-doc-generator').GenerateOptions}
*/
const config = {
	configEmoji: [
		['recommended', '✅'],
		['unopinionated', '☑️'],
		['recommended-css', '🎨'],
		['recommended-html', '🌐'],
		['recommended-json', '🧩'],
		['recommended-markdown', '📚'],
		['recommended-toml', '🛠️'],
		['recommended-yaml', '📋'],
	],
	ignoreConfig: [
		'all',
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
	postprocess(content) {
		const headerEnd = content.indexOf('<!-- end auto-generated rule header -->');
		if (headerEnd === -1) {
			return content;
		}

		const header = content.slice(0, headerEnd).replace(/^🚫 This rule is _disabled_ .+$/mv, '🚫 Disabled by default.');
		return header + content.slice(headerEnd);
	},
};

export default config;
