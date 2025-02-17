/* Run all unicorn rules on codebase */
/*
! If you're making a new rule, you can ignore this before review.
*/
import eslintPluginUnicorn from './index.js';

const config = [
	eslintPluginUnicorn.configs.all,
	disableRules([
		// If external rules needs to be disabled, add the rule name here.
		'n/no-unsupported-features/es-syntax',
		'eslint-plugin/require-meta-default-options',
		'internal/no-restricted-property-access',
	]),
	{
		linterOptions: {
			reportUnusedDisableDirectives: false,
		},
	},
	{
		ignores: [
			'coverage',
			'test/integration/fixtures',
			'test/integration/fixtures-local',
			'rules/utils/lodash.js',
		],
	},
	{
		rules: {
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1109#issuecomment-782689255
			'unicorn/consistent-destructuring': 'off',
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2341
			'unicorn/escape-case': 'off',
			'unicorn/no-hex-escape': 'off',
			// Buggy
			'unicorn/custom-error-definition': 'off',
			'unicorn/consistent-function-scoping': 'off',
			// Annoying
			'unicorn/no-keyword-prefix': 'off',
		},
	},
	{
		files: [
			'**/*.js',
		],
		rules: {
			'unicorn/prefer-module': 'off',
		},
	},
];

// Create rule to allow inline config to disable
function disableRules(rules) {
	const plugins = {};
	for (const rule of rules) {
		const [pluginName, ...rest] = rule.split('/');
		const ruleName = rest.join('/');
		plugins[pluginName] ??= {rules: {}};
		plugins[pluginName].rules[ruleName] ??= {};
	}

	return {plugins};
}

export default config;
