import fs, {promises as fsAsync} from 'node:fs';
import path from 'node:path';
/// import process from 'node:process';
import test from 'ava';
import css from '@eslint/css';
import {ESLint, Linter} from 'eslint';
import {defineConfig} from 'eslint/config';
import {builtinRules} from 'eslint/use-at-your-own-risk';
/// import * as eslintrc from '@eslint/eslintrc';
/// import globals from 'globals';
import coreRuleReplacements from '../configs/core-rule-replacements.js';
import eslintPluginUnicorn from '../index.js';
import * as rawRules from '../rules/index.js';
import languages from './utils/languages.js';

const javaScriptConfigs = Object.entries(eslintPluginUnicorn.configs).filter(([name]) => !name.startsWith('recommended-'));
const nonJavaScriptConfigs = {
	'recommended-css': [languages.css],
	'recommended-html': [languages.html],
	'recommended-json': [languages.json, languages.jsonc, languages.json5],
	'recommended-markdown': [languages.markdown, {...languages.markdown, language: 'markdown/gfm'}],
	'recommended-toml': [languages.toml],
	'recommended-yaml': [languages.yaml],
};

let ruleFiles;

test.before(async () => {
	const files = await fsAsync.readdir('rules');
	ruleFiles = files.filter(file => path.extname(file) === '.js' && path.basename(file) !== 'index.js');
});

const countCoreRuleReplacements = config => Object.keys(config.rules)
	.filter(ruleId => coreRuleReplacements.includes(ruleId))
	.length;

const deprecatedRules = Object.entries(eslintPluginUnicorn.rules)
	.filter(([, {meta: {deprecated}}]) => deprecated)
	.map(([ruleId]) => ruleId);

const isJavaScriptRule = rule => !rule.meta.languages || rule.meta.languages.includes('js/js') || rule.meta.languages.includes('*');

const RULES_WITHOUT_EXAMPLES_SECTION = new Set([
	// Doesn't show code samples since it's just focused on filenames.
	'filename-case',
]);

test('exports only the supported presets', t => {
	t.deepEqual(Object.keys(eslintPluginUnicorn.configs), [
		'recommended',
		'unopinionated',
		'all',
		...Object.keys(nonJavaScriptConfigs),
	]);
});

test('Every rule is defined in index file in alphabetical order', t => {
	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		t.truthy(eslintPluginUnicorn.rules[name], `'${name}' is not exported in 'index.js'`);
		if (!deprecatedRules.includes(name)) {
			t.truthy(
				eslintPluginUnicorn.configs.recommended.rules[`unicorn/${name}`],
				`'${name}' is not set in the recommended config`,
			);
		}

		const documentationPath = path.join('docs/rules', `${name}.md`);
		const testPath = path.join('test', file.replace(/\.js$/, '.js'));

		t.truthy(fs.existsSync(documentationPath), `There is no documentation for '${name}'`);
		t.truthy(fs.existsSync(testPath), `There are no tests for '${name}'`);
	}

	t.is(
		Object.keys(eslintPluginUnicorn.rules).length - deprecatedRules.length,
		ruleFiles.length,
		'There are more exported rules than rule files.',
	);
	t.is(
		Object.keys(eslintPluginUnicorn.configs.recommended.rules).length - deprecatedRules.length - countCoreRuleReplacements(eslintPluginUnicorn.configs.recommended),
		ruleFiles.length - deprecatedRules.length,
		'There are more exported rules in the recommended config than rule files.',
	);
	t.is(
		Object.keys(eslintPluginUnicorn.configs.unopinionated.rules).length - deprecatedRules.length - countCoreRuleReplacements(eslintPluginUnicorn.configs.unopinionated),
		ruleFiles.length - deprecatedRules.length,
		'There are more exported rules in the unopinionated config than rule files.',
	);
	t.is(
		Object.keys(eslintPluginUnicorn.configs.all.rules).length - deprecatedRules.length - countCoreRuleReplacements(eslintPluginUnicorn.configs.all),
		ruleFiles.filter(file => isJavaScriptRule(eslintPluginUnicorn.rules[path.basename(file, '.js')])).length - deprecatedRules.length,
		'There are more rules than those exported in the all config.',
	);
});

test('core rule replacements are disabled only when the Unicorn replacement is enabled', t => {
	for (const [configName, config] of javaScriptConfigs) {
		const enabledCoreRuleReplacements = coreRuleReplacements
			.filter(ruleName => config.rules[`unicorn/${ruleName}`] === 'error');
		const externalRules = Object.keys(config.rules)
			.filter(ruleId => !ruleId.startsWith('unicorn/'));

		t.deepEqual(externalRules, enabledCoreRuleReplacements, `${configName} should only disable core rules with enabled Unicorn replacements.`);

		for (const ruleName of coreRuleReplacements) {
			t.true(builtinRules.has(ruleName), `'${ruleName}' should be an ESLint core rule.`);
			t.truthy(eslintPluginUnicorn.rules[ruleName], `'unicorn/${ruleName}' should exist.`);

			const unicornRuleSeverity = config.rules[`unicorn/${ruleName}`];

			if (unicornRuleSeverity === 'error') {
				t.is(config.rules[ruleName], 'off', `${configName} should disable '${ruleName}' when 'unicorn/${ruleName}' is enabled.`);
			} else {
				t.is(config.rules[ruleName], undefined, `${configName} should not disable '${ruleName}' when 'unicorn/${ruleName}' is disabled.`);
			}
		}
	}
});

test('validate configuration', async t => {
	const results = await Promise.all(javaScriptConfigs.map(async ([name, config]) => {
		const eslint = new ESLint({
			baseConfig: config,
			overrideConfigFile: true,
		});

		const result = await eslint.calculateConfigForFile('dummy.js');

		return {name, config, result};
	}));

	for (const {name, config, result} of results) {
		t.deepEqual(
			Object.keys(result.rules),
			Object.keys(config.rules),
			`Configuration for "${name}" is invalid.`,
		);
	}
});

test('preset configs only enable language-compatible rules', t => {
	for (const [configName, config] of javaScriptConfigs) {
		const enabledUnicornRuleIds = Object.entries(config.rules)
			.filter(([ruleId, severity]) => severity === 'error' && ruleId.startsWith('unicorn/'))
			.map(([ruleId]) => ruleId);
		for (const ruleId of enabledUnicornRuleIds) {
			const ruleName = ruleId.slice('unicorn/'.length);
			t.true(isJavaScriptRule(eslintPluginUnicorn.rules[ruleName]), `'${ruleId}' in '${configName}' does not support JavaScript.`);
		}
	}
});

test('prefer-escaped-irregular-whitespace is enabled in the JavaScript unopinionated preset', t => {
	const ruleName = 'prefer-escaped-irregular-whitespace';
	t.is(eslintPluginUnicorn.configs.unopinionated.rules[`unicorn/${ruleName}`], 'error');
});

test('recommended config works with defineConfig', async t => {
	const eslint = new ESLint({
		baseConfig: defineConfig({
			files: ['**/*.js'],
			plugins: {
				unicorn: eslintPluginUnicorn,
			},
			extends: [
				'unicorn/recommended',
			],
		}),
		overrideConfigFile: true,
	});

	const [result] = await eslint.lintText('[1, 2, 3].indexOf(2) !== -1;', {filePath: 'file.js'});
	t.true(result.messages.some(message => message.ruleId === 'unicorn/prefer-includes'));
});

test('CSS rule works with defineConfig', async t => {
	const eslint = new ESLint({
		baseConfig: defineConfig({
			files: ['**/*.css'],
			plugins: {
				css,
				unicorn: eslintPluginUnicorn,
			},
			language: 'css/css',
			rules: {
				'unicorn/no-deprecated-css-features': 'error',
			},
		}),
		overrideConfigFile: true,
	});

	const [result] = await eslint.lintText('a { word-wrap: break-word; }', {filePath: 'file.css'});
	t.true(result.messages.some(message => message.ruleId === 'unicorn/no-deprecated-css-features'));
});

/* eslint-disable unicorn/prefer-https -- Test fixtures intentionally use HTTP. */
const nonJavaScriptCode = {
	css: 'a { background: url(http://example.com/image.png); }',
	html: '<a href="http://example.com">Link</a>',
	json: '{"url": "http://example.com"}',
	jsonc: '{"url": "http://example.com"}',
	json5: '{url: "http://example.com"}',
	markdown: '[Link](http://example.com)',
	toml: 'url = "http://example.com"',
	yaml: 'url: "http://example.com"',
};
/* eslint-enable unicorn/prefer-https */

for (const [configName, supportedLanguages] of Object.entries(nonJavaScriptConfigs)) {
	for (const {name, language, plugins} of supportedLanguages) {
		test(`${configName} works with ${language} through string extends`, async t => {
			const preset = eslintPluginUnicorn.configs[configName];
			t.deepEqual(Object.keys(preset), ['name', 'plugins', 'rules']);
			t.is(preset.name, `unicorn/${configName}`);
			t.deepEqual(Object.keys(preset.plugins), ['unicorn']);
			t.true(Object.keys(preset.rules).every(ruleId => ruleId.startsWith('unicorn/')));
			t.is(preset.rules['unicorn/prefer-includes'], undefined);
			t.is(preset.rules['unicorn/comment-content'], 'off');
			t.is(preset.rules['unicorn/no-empty-file'], 'error');
			for (const ruleName of deprecatedRules) {
				t.is(preset.rules[`unicorn/${ruleName}`], undefined);
			}

			const filePath = `file.${name}`;
			const eslint = new ESLint({
				overrideConfigFile: true,
				baseConfig: defineConfig({
					files: [filePath],
					plugins: {...plugins, unicorn: eslintPluginUnicorn},
					language,
					extends: [`unicorn/${configName}`],
					rules: {'unicorn/prefer-https': 'warn'},
				}),
			});
			const config = await eslint.calculateConfigForFile(filePath);
			t.is(config.languageOptions.globals, undefined);
			const [result] = await eslint.lintText(nonJavaScriptCode[name], {filePath});
			t.deepEqual(result.messages.map(({ruleId, severity}) => ({ruleId, severity})), [{ruleId: 'unicorn/prefer-https', severity: 1}]);
		});
	}
}

test('direct presets register Unicorn and stay scoped alongside JavaScript with user overrides', async t => {
	const languageConfigs = Object.entries(nonJavaScriptConfigs).flatMap(([configName, supportedLanguages]) => supportedLanguages.map(({language, plugins}) => ({
		files: [`file.${language.split('/').at(-1)}`],
		plugins,
		language,
		extends: [eslintPluginUnicorn.configs[configName]],
		rules: {'unicorn/prefer-https': 'off'},
	})));
	const eslint = new ESLint({
		overrideConfigFile: true,
		baseConfig: defineConfig([
			{
				files: ['file.js'],
				extends: [eslintPluginUnicorn.configs.recommended],
				rules: {'unicorn/prefer-https': ['error', {ignore: [/example\.com/v]}]},
			},
			...languageConfigs,
		]),
	});
	const javaScriptConfig = await eslint.calculateConfigForFile('file.js');
	t.is(javaScriptConfig.rules['unicorn/prefer-includes'][0], 2);
	const [javaScriptResult] = await eslint.lintText(`export default ${nonJavaScriptCode.json};`, {filePath: 'file.js'});
	t.deepEqual(javaScriptResult.messages, []);

	await Promise.all(Object.values(nonJavaScriptConfigs).flat().map(async ({name, language}) => {
		const filePath = `file.${language.split('/').at(-1)}`;
		const config = await eslint.calculateConfigForFile(filePath);
		t.is(config.rules['unicorn/prefer-includes'], undefined);
		t.is(config.languageOptions.globals, undefined);
		t.is(config.rules['unicorn/prefer-https'][0], 0);
		const [result] = await eslint.lintText(nonJavaScriptCode[name], {filePath});
		t.deepEqual(result.messages, [], language);
	}));
});

test('non-JavaScript preset recommendation levels match rule metadata', t => {
	for (const [configName, supportedLanguages] of Object.entries(nonJavaScriptConfigs)) {
		const {rules} = eslintPluginUnicorn.configs[configName];
		for (const [name, rule] of Object.entries(eslintPluginUnicorn.rules)) {
			const compatible = !rule.meta.deprecated && supportedLanguages.every(({language}) => {
				const {languages} = rule.meta;
				return !languages || languages.includes('*') || languages.includes(language) || languages.includes(`${language.split('/', 1)[0]}/*`);
			});
			let expectedSeverity;
			if (compatible) {
				expectedSeverity = rule.meta.docs.recommended ? 'error' : 'off';
			}

			t.is(rules[`unicorn/${name}`], expectedSeverity, `${configName}: ${name}`);
		}
	}
});

test.serial('non-JavaScript presets honor wildcards, require every dialect, and exclude deprecated rules', async t => {
	const rule = rawRules.indent;
	const originalMeta = rule.meta;
	t.teardown(() => {
		rule.meta = originalMeta;
	});

	rule.meta = {...originalMeta, languages: ['json/*']};
	const {default: wildcardPlugin} = await import('../index.js?json-wildcard');
	t.is(wildcardPlugin.configs['recommended-json'].rules['unicorn/indent'], 'off');
	t.is(wildcardPlugin.configs['recommended-css'].rules['unicorn/indent'], undefined);

	rule.meta = {...originalMeta, languages: ['json/jsonc']};
	const {default: dialectPlugin} = await import('../index.js?jsonc-only');
	t.is(dialectPlugin.configs['recommended-json'].rules['unicorn/indent'], undefined);

	rule.meta = {...originalMeta, languages: ['*'], deprecated: true};
	const {default: deprecatedPlugin} = await import('../index.js?deprecated-rule');
	for (const configName of Object.keys(nonJavaScriptConfigs)) {
		t.is(deprecatedPlugin.configs[configName].rules['unicorn/indent'], undefined);
	}
});

for (const ruleName of ['expiring-todo-comments', 'no-asterisk-prefix-in-documentation-comments', 'no-manually-wrapped-comments', 'single-line-block-comment-style']) {
	test(`${ruleName} safely ignores comment-like strings in strict JSON`, t => {
		const code = String.raw`{"line": "// TODO [2000-01-01]: Update", "block": "/* Comment. */", "multiline": "/**\n * Wrapped\n * comment.\n */"}`;
		const linter = new Linter();
		const result = linter.verifyAndFix(code, {
			files: ['**/*.json'],
			language: languages.json.language,
			plugins: {...languages.json.plugins, unicorn: eslintPluginUnicorn},
			rules: {
				[`unicorn/${ruleName}`]: ruleName === 'expiring-todo-comments'
					? ['error', {date: '2026-01-01', checkDates: true, checkDatesOnPullRequests: true}]
					: 'error',
			},
		}, {filename: 'file.json'});
		t.deepEqual(result.messages, []);
		t.is(result.output, code);
		t.false(result.fixed);
	});
}

for (const {name, language, plugins} of [languages.jsonc, languages.json5]) {
	test(`recommended-json fixes comments in ${language}`, async t => {
		const eslint = new ESLint({
			overrideConfigFile: true,
			fix: true,
			baseConfig: defineConfig({
				files: [`**/*.${name}`],
				plugins: {...plugins, unicorn: eslintPluginUnicorn},
				language,
				extends: ['unicorn/recommended-json'],
			}),
		});
		const [result] = await eslint.lintText('/**\n * Comment.\n */\n{}', {filePath: `file.${name}`});
		t.deepEqual(result.messages, []);
		t.is(result.output, '/**\nComment.\n*/\n{}');
	});
}

test('Every rule declares valid supported languages', t => {
	const knownLanguages = ['js/js', 'markdown/gfm', ...Object.values(languages).map(({language}) => language)];
	const supportedLanguages = new Set(['*', ...knownLanguages, ...knownLanguages.map(language => `${language.split('/', 1)[0]}/*`)]);
	for (const [name, rule] of Object.entries(rawRules)) {
		t.true(Array.isArray(rule.meta.languages), name);
		t.true(rule.meta.languages.length > 0, name);
		t.deepEqual(rule.meta.languages, [...new Set(rule.meta.languages)], name);
		for (const language of rule.meta.languages) {
			t.true(supportedLanguages.has(language), `${name}: ${language}`);
		}
	}
});

for (const [ruleName, code, recommendedSeverity] of [
	['no-shorthand-property-overrides', 'const element = <div style={{paddingLeft: 1, padding: 2}} />;', 'error'],
	['no-missing-local-resource', 'new URL("./missing-resource-for-package-test.svg", import.meta.url);', 'off'],
]) {
	test(`${ruleName} reports JavaScript problems and is configured in JavaScript presets`, t => {
		const linter = new Linter();
		const messages = linter.verify(code, {
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			plugins: {unicorn: eslintPluginUnicorn},
			rules: {[`unicorn/${ruleName}`]: 'error'},
		}, {filename: 'file.js'});
		t.deepEqual(messages.map(({ruleId}) => ruleId), [`unicorn/${ruleName}`]);
		t.is(eslintPluginUnicorn.configs.all.rules[`unicorn/${ruleName}`], 'error');
		t.is(eslintPluginUnicorn.configs.recommended.rules[`unicorn/${ruleName}`], recommendedSeverity);
		t.is(eslintPluginUnicorn.configs.unopinionated.rules[`unicorn/${ruleName}`], recommendedSeverity);
	});
}

test('require-frontmatter-fields rejects JavaScript and is excluded from JavaScript presets', t => {
	const ruleId = 'unicorn/require-frontmatter-fields';
	const linter = new Linter();
	t.throws(() => linter.verify('const value = 1;', {
		plugins: {unicorn: eslintPluginUnicorn},
		rules: {[ruleId]: 'error'},
	}), {message: /do not support the language "js\/js"/});
	t.is(eslintPluginUnicorn.configs.all.rules[ruleId], undefined);
	t.is(eslintPluginUnicorn.configs.recommended.rules[ruleId], 'off');
	t.is(eslintPluginUnicorn.configs.unopinionated.rules[ruleId], 'off');
});

test('Every rule has valid meta.type', t => {
	const validTypes = ['problem', 'suggestion', 'layout'];

	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		const rule = eslintPluginUnicorn.rules[name];

		t.true(rule.meta !== null && rule.meta !== undefined, `${name} has no meta`);
		t.is(typeof rule.meta.type, 'string', `${name} meta.type is not string`);
		t.true(validTypes.includes(rule.meta.type), `${name} meta.type is not one of [${validTypes.join(', ')}]`);
	}
});

test('Every deprecated rules listed in docs/deleted-and-deprecated-rules.md', async t => {
	const content = await fsAsync.readFile('docs/deleted-and-deprecated-rules.md', 'utf8');
	for (const name of deprecatedRules) {
		const rule = eslintPluginUnicorn.rules[name];
		t.is(typeof rule.create, 'function', `${name} create is not function`);
		t.deepEqual(rule.create(), {}, `${name} create should return empty object`);
		t.is(typeof rule.meta.deprecated.message, 'string', `${name} meta.deprecated.message should be string`);
		t.true(Array.isArray(rule.meta.deprecated.replacedBy), `${name} meta.deprecated.replacedBy should be array`);

		for (const replacement of rule.meta.deprecated.replacedBy) {
			t.is(typeof replacement.rule.name, 'string', `${name} meta.deprecated.replacedBy[].rule.name should be string`);
			t.is(typeof replacement.rule.url, 'string', `${name} meta.deprecated.replacedBy[].rule.url should be string`);
		}

		t.true(content.includes(`\n### ${name}\n`));
		t.false(content.includes(`\n### ~${name}~\n`));
	}
});

test('no-hex-escape lists both replacement rules', t => {
	const replacementRuleNames = eslintPluginUnicorn.rules['no-hex-escape'].meta.deprecated.replacedBy
		.map(replacement => replacement.rule.name);

	t.deepEqual(replacementRuleNames, [
		'unicorn/prefer-literal-ascii',
		'unicorn/prefer-unicode-code-point-escapes',
	]);
});

test('Removed rules are listed in docs/deleted-and-deprecated-rules.md', async t => {
	const content = await fsAsync.readFile('docs/deleted-and-deprecated-rules.md', 'utf8');
	t.true(content.includes('\n### ~no-array-for-each~\n'));
});

test('Every rule file has the appropriate contents', t => {
	for (const ruleFile of ruleFiles) {
		const ruleName = path.basename(ruleFile, '.js');
		const rulePath = path.join('rules', `${ruleName}.js`);
		const ruleContents = fs.readFileSync(rulePath, 'utf8');

		t.regex(
			ruleContents,
			// TODO: Use `@import` instead of `import('eslint')`
			/\/\*\*\s*@type \{(?:import\('eslint'\)|ESLint)\.Rule\.RuleModule\}\s*\*\//,
			`${ruleName} includes jsdoc comment for rule type`,
		);
	}
});

test('Every rule has a doc with the appropriate content', t => {
	for (const ruleFile of ruleFiles) {
		const ruleName = path.basename(ruleFile, '.js');

		if (RULES_WITHOUT_EXAMPLES_SECTION.has(ruleName)) {
			continue;
		}

		const documentPath = path.join('docs/rules', `${ruleName}.md`);
		const documentContents = fs.readFileSync(documentPath, 'utf8');

		// Check for examples.
		t.true(documentContents.includes('## Examples'), `${ruleName} includes '## Examples' examples section`);
	}
});

test('Plugin should have metadata', t => {
	t.is(typeof eslintPluginUnicorn.meta.name, 'string');
	t.is(typeof eslintPluginUnicorn.meta.version, 'string');
});

/// function getCompactConfig(config) {
// 	const compat = new eslintrc.FlatCompat({
// 		baseDirectory: process.cwd(),
// 		resolvePluginsRelativeTo: process.cwd(),
// 	});

// 	const result = {plugins: undefined};

// 	for (const part of compat.config(config)) {
// 		for (const [key, value] of Object.entries(part)) {
// 			if (key === 'languageOptions') {
// 				const languageOptions = {...result[key], ...value};
// 				// ESLint uses same `ecmaVersion` and `sourceType` as we recommended in the new configuration system
// 				// https://eslint.org/docs/latest/use/configure/configuration-files-new#configuration-objects
// 				delete languageOptions.ecmaVersion;
// 				delete languageOptions.sourceType;
// 				languageOptions.globals = {
// 					...languageOptions.globals,
// 					// When use `env.es*: true` in legacy config, `es5` globals are not included
// 					...globals.es5,
// 					// `Intl` was added to ESLint https://github.com/eslint/eslint/pull/18318
// 					// But `@eslint/eslintrc` choose not to update `globals` https://github.com/eslint/eslintrc/pull/164
// 					Intl: false,
// 					Iterator: false,
// 				};
// 				result[key] = languageOptions;
// 			} else if (key === 'plugins') {
// 				result[key] = undefined;
// 			} else {
// 				result[key] = value;
// 			}
// 		}
// 	}

// 	return result;
// }

// TODO: Fix.
// test('flat configs', t => {
// 	t.deepEqual(
// 		{...getCompactConfig(eslintPluginUnicorn.configs.recommended), name: 'unicorn/recommended'},
// 		{...eslintPluginUnicorn.configs.recommended, plugins: undefined},
// 	);
// 	t.deepEqual(
// 		{...getCompactConfig(eslintPluginUnicorn.configs.all), name: 'unicorn/all'},
// 		{...eslintPluginUnicorn.configs.all, plugins: undefined},
// 	);
// });

test('rule.meta.docs.recommended should be synchronized with presets', t => {
	for (const [name, rule] of Object.entries(eslintPluginUnicorn.rules)) {
		if (deprecatedRules.includes(name)) {
			continue;
		}

		const {recommended} = rule.meta.docs;
		t.true(typeof recommended === 'boolean' || recommended === 'unopinionated', `meta.docs.recommended in '${name}' rule should be a boolean or 'unopinionated'.`);
		const shouldEnableJavaScriptPreset = isJavaScriptRule(rule);
		if (shouldEnableJavaScriptPreset) {
			const recommendedSeverity = eslintPluginUnicorn.configs.recommended.rules[`unicorn/${name}`];
			t.is(recommendedSeverity, recommended ? 'error' : 'off', `'${name}' rule should have the correct severity in the recommended config.`);
		}

		const unopinionatedSeverity = eslintPluginUnicorn.configs.unopinionated.rules[`unicorn/${name}`];
		if (recommended === 'unopinionated' && shouldEnableJavaScriptPreset) {
			t.is(unopinionatedSeverity, 'error', `'${name}' rule should set to 'error' in the unopinionated config.`);
		} else {
			t.is(unopinionatedSeverity, 'off', `'${name}' rule should set to 'off' in the unopinionated config.`);
		}
	}
});
