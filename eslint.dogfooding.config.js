/* Run all unicorn rules on codebase */
/*
! If you're making a new rule, you can ignore this before review.
*/
import eslintPluginUnicorn from './index.js';

const config = [
	eslintPluginUnicorn.configs.all,
	disableExternalRules([
		// If external rules need to be disabled, add the rule name here.
		'n/no-unsupported-features/es-syntax',
		'eslint-plugin/require-meta-default-options',
		'@stylistic/max-len',
		'internal/prefer-context-on',
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
		],
	},
	{
		rules: {
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1109#issuecomment-782689255
			'unicorn/consistent-destructuring': 'off',
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2341
			'unicorn/escape-case': 'off',
			'unicorn/prefer-unicode-code-point-escapes': 'off',
			// Buggy
			'unicorn/custom-error-definition': 'off',
			'unicorn/consistent-function-scoping': 'off',
			// Annoying
			'unicorn/no-asterisk-prefix-in-documentation-comments': 'off',
			'unicorn/no-manually-wrapped-comments': 'off',
			'unicorn/no-keyword-prefix': 'off',
			'unicorn/no-array-front-mutation': 'off',
			'unicorn/no-invalid-argument-count': 'off',
			'unicorn/no-unreadable-for-of-expression': 'off',
			'unicorn/try-complexity': 'off',
			'unicorn/consistent-boolean-name': 'off',
			// Recursive AST/tree walkers are intentional in rule implementation code.
			'unicorn/no-useless-recursion': 'off',
			// Disabled violations remain intentional in this codebase.
			'unicorn/prefer-minimal-ternary': 'off',
			'unicorn/prefer-simple-condition-first': 'off',
			// TODO: Enable when targeting Node.js 26.
			'unicorn/prefer-iterator-concat': 'off',
			'unicorn/prefer-temporal': 'off',
		},
	},
	{
		files: [
			'rules/utils/global-reference-tracker.js',
		],
		rules: {
			// This module intentionally mutates its own exported class during setup.
			'unicorn/no-top-level-side-effects': 'off',
		},
	},
	{
		files: [
			'test/package.js',
			'test/unit/boolean.js',
		],
		rules: {
			// These tests intentionally use module-scoped capture variables across setup callbacks.
			'unicorn/no-top-level-assignment-in-function': 'off',
		},
	},
	{
		files: [
			'rules/comment-content.js',
			'rules/consistent-assert.js',
			'rules/no-for-each.js',
			'rules/no-array-reduce.js',
			'rules/no-declarations-before-early-exit.js',
			'rules/no-error-property-assignment.js',
			'rules/no-redundant-comparison.js',
			'rules/no-unnecessary-polyfills.js',
			'rules/prefer-math-min-max.js',
			'rules/prefer-private-class-fields.js',
			'scripts/internal-rules/fix-snapshot-test.js',
			'test/utils/snapshot-rule-tester.js',
		],
		rules: {
			// Existing implementations intentionally use nested control flow in a few places.
			'unicorn/no-break-in-nested-loop': 'off',
		},
	},
	{
		// Intentional HTTP examples are used in tests.
		files: [
			'test/prefer-https.js',
			'test/string-content.js',
		],
		rules: {
			'unicorn/prefer-https': 'off',
		},
	},
	{
		files: [
			'**/*.js',
		],
		rules: {
			'unicorn/prefer-module': 'off',
			'unicorn/prefer-import-meta-properties': 'off', // We can enable this rule when we drop support for Node.js v18.
		},
	},
	{
		files: [
			'test/**/*.js',
		],
		rules: {
			// Test files contain source-code fixtures in template literals.
			'unicorn/no-incorrect-template-string-interpolation': 'off',
		},
	},
	{
		files: [
			'scripts/rename-rule.js',
		],
		rules: {
			// Exports are intentionally kept for unit tests.
			'unicorn/no-exports-in-scripts': 'off',
		},
	},
	{
		files: [
			'rules/prefer-bigint-literals.js',
		],
		rules: {
			// `Number.isInteger` is intentional here: large integers beyond the safe range are exactly what bigint literals are for.
			'unicorn/prefer-number-is-safe-integer': 'off',
		},
	},
];

// Create rule to allow inline config to disable
function disableExternalRules(rules) {
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
