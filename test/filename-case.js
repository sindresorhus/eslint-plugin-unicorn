import path from 'node:path';
import test from 'ava';
import {Linter} from 'eslint';
import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import html from '@html-eslint/eslint-plugin';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

function testCase(filename, chosenCase, errorMessage) {
	return testCaseWithOptions(
		filename,
		errorMessage,
		[{case: chosenCase}],
	);
}

function testManyCases(filename, chosenCases, errorMessage) {
	return testCaseWithOptions(
		filename,
		errorMessage,
		[{cases: chosenCases}],
	);
}

function testCaseWithOptions(filename, errorMessage, options = []) {
	const testCase = {
		code: `/* Filename: ${filename} */`,
		options,
		errors: errorMessage && [
			{
				message: errorMessage,
			},
		],
	};

	if (filename !== undefined) {
		testCase.filename = filename;
	}

	return testCase;
}

const outsideCwd = path.join(path.dirname(process.cwd()), 'Src', 'fooBar.js');
const cwd = process.cwd();

test('checks relative directory names from ESLint cwd', t => {
	const linter = new Linter({
		configType: 'flat',
		cwd: path.join(process.cwd(), 'test'),
	});
	const messages = linter.verify('const value = 1;', {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: {
			unicorn,
		},
		rules: {
			'unicorn/filename-case': 'error',
		},
	}, {
		filename: 'src/FooBar/file.js',
	});

	t.deepEqual(
		messages.map(({message}) => message),
		[
			'Directory name `FooBar` is not in kebab case. Rename it to `foo-bar`.',
		],
	);
});

test('checks filenames of non-JavaScript files', t => {
	const linter = new Linter({configType: 'flat'});

	const languageCases = [
		{
			language: 'css/css', plugin: css, extension: 'css', code: '.a { color: red; }',
		},
		{
			language: 'json/json', plugin: json, extension: 'json', code: '{"a": 1}',
		},
		{
			language: 'markdown/gfm', plugin: markdown, extension: 'md', code: '# Title',
		},
		{
			language: 'html/html', plugin: html, extension: 'html', code: '<p>Hello</p>',
		},
	];

	for (const {language, plugin, extension, code} of languageCases) {
		const pluginName = language.split('/', 1)[0];
		const config = {
			files: ['**'],
			language,
			plugins: {[pluginName]: plugin, unicorn},
			rules: {'unicorn/filename-case': 'error'},
		};

		t.deepEqual(
			linter.verify(code, config, {filename: `Foo_Bar.${extension}`}).map(({message}) => message),
			[`Filename is not in kebab case. Rename it to \`foo-bar.${extension}\`.`],
			`reports a badly-cased ${language} filename`,
		);

		t.deepEqual(
			linter.verify(code, config, {filename: `foo-bar.${extension}`}).map(({message}) => message),
			[],
			`accepts a well-cased ${language} filename`,
		);
	}
});

ruleTest({
	valid: [
		testCase('src/foo/bar.js', 'camelCase'),
		testCase('src/foo/fooBar.js', 'camelCase'),
		testCase('src/foo/bar.test.js', 'camelCase'),
		testCase('src/foo/fooBar.test.js', 'camelCase'),
		testCase('src/foo/fooBar.test-utils.js', 'camelCase'),
		testCase('src/foo/fooBar.test_utils.js', 'camelCase'),
		testCase('src/foo/.test_utils.js', 'camelCase'),
		testCase('src/foo/innerHTML.js', 'camelCaseWithAcronyms'),
		testCase('src/foo/getDOMRangeRect.js', 'camelCaseWithAcronyms'),
		testCase('src/foo/apiURL.js', 'camelCaseWithAcronyms'),
		testCase('src/foo/getHTML5Parser.js', 'camelCaseWithAcronyms'),
		testCase('src/foo/domSelection.js', 'camelCaseWithAcronyms'),
		testCase('src/getDOMRangeRect/file.js', 'camelCaseWithAcronyms'),
		testCase('src/foo/foo.js', 'snakeCase'),
		testCase('src/foo/foo_bar.js', 'snakeCase'),
		testCase('src/foo/foo.test.js', 'snakeCase'),
		testCase('src/foo/foo_bar.test.js', 'snakeCase'),
		testCase('src/foo/foo_bar.test_utils.js', 'snakeCase'),
		testCase('src/foo/foo_bar.test-utils.js', 'snakeCase'),
		testCase('src/foo/.test-utils.js', 'snakeCase'),
		testCase('src/foo/foo.js', 'kebabCase'),
		testCase('src/foo/foo-bar.js', 'kebabCase'),
		testCase('src/foo/foo.test.js', 'kebabCase'),
		testCase('src/foo/foo-bar.test.js', 'kebabCase'),
		testCase('src/foo/foo-bar.test-utils.js', 'kebabCase'),
		testCase('src/foo/foo-bar.test_utils.js', 'kebabCase'),
		testCase('src/foo/.test_utils.js', 'kebabCase'),
		testCase('Src/Foo/Foo.js', 'pascalCase'),
		testCase('Src/Foo/FooBar.js', 'pascalCase'),
		testCase('Src/Foo/FAQPage.js', 'pascalCase'),
		testCase('Src/Foo/DIYWidget.js', 'pascalCase'),
		testCase('Src/Foo/URL2Path.js', 'pascalCase'),
		testCase('Src/Foo/FAQI18n.js', 'pascalCase'),
		testCase('Src/Foo/URL2I18n.js', 'pascalCase'),
		testCase('Src/FAQPage/Foo.js', 'pascalCase'),
		testCase('Src/URL2Path/Foo.js', 'pascalCase'),
		testCase('Src/URL2I18n/Foo.js', 'pascalCase'),
		testCase('Src/Foo/Foo.test.js', 'pascalCase'),
		testCase('Src/Foo/FooBar.test.js', 'pascalCase'),
		testCase('Src/Foo/FooBar.test-utils.js', 'pascalCase'),
		testCase('Src/Foo/FooBar.test_utils.js', 'pascalCase'),
		testCase('Src/Foo/.test_utils.js', 'pascalCase'),
		testCase('spec/iss47Spec.js', 'camelCase'),
		testCase('spec/iss47Spec100.js', 'camelCase'),
		testCase('spec/i18n.js', 'camelCase'),
		testCase('spec/iss47-spec.js', 'kebabCase'),
		testCase('spec/iss-47-spec.js', 'kebabCase'),
		testCase('spec/iss47-100spec.js', 'kebabCase'),
		testCase('spec/i18n.js', 'kebabCase'),
		testCase('spec/iss47_spec.js', 'snakeCase'),
		testCase('spec/iss_47_spec.js', 'snakeCase'),
		testCase('spec/iss47_100spec.js', 'snakeCase'),
		testCase('spec/i18n.js', 'snakeCase'),
		testCase('Spec/Iss47Spec.js', 'pascalCase'),
		testCase('Spec/Iss47.100spec.js', 'pascalCase'),
		testCase('Spec/I18n.js', 'pascalCase'),
		testCase(undefined, 'camelCase'),
		testCase(undefined, 'snakeCase'),
		testCase(undefined, 'kebabCase'),
		testCase(undefined, 'pascalCase'),
		testCase('src/foo/_fooBar.js', 'camelCase'),
		testCase('src/foo/___fooBar.js', 'camelCase'),
		testCase('src/foo/_foo_bar.js', 'snakeCase'),
		testCase('src/foo/___foo_bar.js', 'snakeCase'),
		testCase('src/foo/_foo-bar.js', 'kebabCase'),
		testCase('src/foo/___foo-bar.js', 'kebabCase'),
		testCase('Src/Foo/_FooBar.js', 'pascalCase'),
		testCase('Src/Foo/___FooBar.js', 'pascalCase'),
		testCase('src/foo/$foo.js'),
		testCase('src/foo/$userId.tsx'),
		testCase('src/foo/$foo_bar.js'),
		testCase('src/foo/$fooBar.js'),
		testManyCases('src/foo/foo-bar.js'),
		testManyCases('src/foo/foo-bar.js', {}),
		testManyCases('src/foo/fooBar.js', {camelCase: true}),
		testManyCases('src/foo/innerHTML.js', {camelCaseWithAcronyms: true}),
		testManyCases('src/foo/innerHTML.js', {camelCaseWithAcronyms: true, kebabCase: true}),
		testManyCases('Src/Foo/FooBar.js', {kebabCase: true, pascalCase: true}),
		testManyCases('src/foo/$idCertidao.tsx', {kebabCase: true, pascalCase: true}),
		testManyCases('src/foo/___foo_bar.js', {snakeCase: true, pascalCase: true}),
		testCaseWithOptions('src/foo/bar.js'),
		testCase('src/foo/[fooBar].js', 'camelCase'),
		testCase('src/foo/{foo_bar}.js', 'snakeCase'),
		testCaseWithOptions(undefined, undefined, [
			{case: 'kebabCase', ignore: [String.raw`FOOBAR\.js`]},
		]),
		testCaseWithOptions(undefined, undefined, [
			{case: 'kebabCase', ignore: [/FOOBAR\.js/u]},
		]),
		testCaseWithOptions('src/foo/index.js', undefined, [
			{case: 'kebabCase', ignore: [String.raw`FOOBAR\.js`]},
		]),
		testCaseWithOptions('src/foo/index.js', undefined, [
			{case: 'kebabCase', ignore: [/FOOBAR\.js/u]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'kebabCase', ignore: [String.raw`FOOBAR\.js`]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'kebabCase', ignore: [/FOOBAR\.js/u]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'camelCase', ignore: [String.raw`FOOBAR\.js`]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'camelCase', ignore: [/FOOBAR\.js/u]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'snakeCase', ignore: [String.raw`FOOBAR\.js`]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'pascalCase', ignore: [String.raw`FOOBAR\.js`]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'pascalCase', ignore: [/FOOBAR\.js/u]},
		]),
		testCaseWithOptions('src/foo/BARBAZ.js', undefined, [
			{case: 'kebabCase', ignore: [String.raw`FOOBAR\.js`, String.raw`BARBAZ\.js`]},
		]),
		testCaseWithOptions('src/foo/BARBAZ.js', undefined, [
			{case: 'kebabCase', ignore: [String.raw`FOOBAR\.js`, /BARBAZ\.js/u]},
		]),
		testCaseWithOptions('src/foo/[FOOBAR].js', undefined, [
			{case: 'camelCase', ignore: [String.raw`\[FOOBAR\]\.js`]},
		]),
		testCaseWithOptions('src/foo/[FOOBAR].js', undefined, [
			{case: 'camelCase', ignore: [/\[FOOBAR]\.js/]},
		]),
		testCaseWithOptions('src/foo/{FOOBAR}.js', undefined, [
			{case: 'snakeCase', ignore: [String.raw`\{FOOBAR\}\.js`]},
		]),
		testCaseWithOptions('src/foo/{FOOBAR}.js', undefined, [
			{case: 'snakeCase', ignore: [/{FOOBAR}\.js/]},
		]),
		testCaseWithOptions('src/foo/foo.js', undefined, [
			{case: 'kebabCase', ignore: ['^(F|f)oo']},
		]),
		testCaseWithOptions('src/foo/foo-bar.js', undefined, [
			{case: 'kebabCase', ignore: ['^(F|f)oo']},
		]),
		testCaseWithOptions('src/foo/fooBar.js', undefined, [
			{case: 'kebabCase', ignore: ['^(F|f)oo']},
		]),
		testCaseWithOptions('src/foo/foo_bar.js', undefined, [
			{case: 'kebabCase', ignore: ['^(F|f)oo']},
		]),
		testCaseWithOptions('src/foo/foo_bar.js', undefined, [
			{case: 'kebabCase', ignore: [/foo/iu]},
		]),
		testCaseWithOptions('src/foo/FOO_bar.js', undefined, [
			{case: 'kebabCase', ignore: [/foo/iu]},
		]),
		testCaseWithOptions('src/foo/foo-bar.js', undefined, [
			{case: 'kebabCase', ignore: [String.raw`\.(web|android|ios)\.js$`]},
		]),
		testCaseWithOptions('src/foo/FooBar.web.js', undefined, [
			{case: 'kebabCase', ignore: [String.raw`\.(web|android|ios)\.js$`]},
		]),
		testCaseWithOptions('src/foo/FooBar.android.js', undefined, [
			{case: 'kebabCase', ignore: [String.raw`\.(web|android|ios)\.js$`]},
		]),
		testCaseWithOptions('src/foo/FooBar.ios.js', undefined, [
			{case: 'kebabCase', ignore: [String.raw`\.(web|android|ios)\.js$`]},
		]),
		testCaseWithOptions('src/foo/FooBar.something.js', undefined, [
			{case: 'kebabCase', ignore: [/\.(?:web|android|ios|something)\.js$/u]},
		]),
		testCaseWithOptions('src/foo/FooBar.js', undefined, [
			{case: 'kebabCase', ignore: ['^(F|f)oo']},
		]),
		testCaseWithOptions('src/foo/FooBar.js', undefined, [
			{case: 'kebabCase', ignore: [/^[Ff]oo/u]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'kebabCase', ignore: ['^FOO', String.raw`BAZ\.js$`]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{case: 'kebabCase', ignore: [/^FOO/, /BAZ\.js$/u]},
		]),
		testCaseWithOptions('src/foo/BARBAZ.js', undefined, [
			{case: 'kebabCase', ignore: ['^FOO', String.raw`BAZ\.js$`]},
		]),
		testCaseWithOptions('src/foo/BARBAZ.js', undefined, [
			{case: 'kebabCase', ignore: [/^FOO/, /BAZ\.js$/]},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{
				cases: {
					kebabCase: true,
					camelCase: true,
					snakeCase: true,
					pascalCase: true,
				},
				ignore: [String.raw`FOOBAR\.js`],
			},
		]),
		testCaseWithOptions('src/foo/FOOBAR.js', undefined, [
			{
				cases: {
					kebabCase: true,
					camelCase: true,
					snakeCase: true,
					pascalCase: true,
				},
				ignore: [/FOOBAR\.js/u],
			},
		]),
		testCaseWithOptions('src/foo/BaRbAz.js', undefined, [
			{
				cases: {
					kebabCase: true,
					camelCase: true,
					snakeCase: true,
					pascalCase: true,
				},
				ignore: [String.raw`FOOBAR\.js`, String.raw`BaRbAz\.js`],
			},
		]),
		testCaseWithOptions('src/foo/BaRbAz.js', undefined, [
			{
				cases: {
					kebabCase: true,
					camelCase: true,
					snakeCase: true,
					pascalCase: true,
				},
				ignore: [/FOOBAR\.js/u, /BaRbAz\.js/u],
			},
		]),
		// Ignored
		...[
			'index.js',
			'index.mjs',
			'index.cjs',
			'index.ts',
			'index.tsx',
			'index.vue',
		].flatMap(filename => ['camelCase', 'camelCaseWithAcronyms', 'snakeCase', 'kebabCase', 'pascalCase'].map(chosenCase => testCase(filename, chosenCase))),
		testCaseWithOptions('index.tsx', undefined, [{case: 'pascalCase', multipleFileExtensions: false}]),
		testCaseWithOptions('Src/Index/index.tsx', undefined, [{case: 'pascalCase', multipleFileExtensions: false}]),
		testCaseWithOptions('src/foo/fooBar.test.js', undefined, [{case: 'camelCase', multipleFileExtensions: false}]),
		testCaseWithOptions('src/foo/fooBar.testUtils.js', undefined, [{case: 'camelCase', multipleFileExtensions: false}]),
		testCaseWithOptions('src/foo/foo_bar.test_utils.js', undefined, [{case: 'snakeCase', multipleFileExtensions: false}]),
		testCaseWithOptions('src/foo/foo.test.js', undefined, [{case: 'kebabCase', multipleFileExtensions: false}]),
		testCaseWithOptions('src/foo/foo-bar.test.js', undefined, [{case: 'kebabCase', multipleFileExtensions: false}]),
		testCaseWithOptions('src/foo/foo-bar.test-utils.js', undefined, [{case: 'kebabCase', multipleFileExtensions: false}]),
		testCaseWithOptions('src/foo/$userId.test.tsx', undefined, [{case: 'kebabCase', multipleFileExtensions: false}]),
		testCaseWithOptions('Src/Foo/Foo.Test.js', undefined, [{case: 'pascalCase', multipleFileExtensions: false}]),
		testCaseWithOptions('Src/Foo/FooBar.Test.js', undefined, [{case: 'pascalCase', multipleFileExtensions: false}]),
		testCaseWithOptions('Src/Foo/FooBar.TestUtils.js', undefined, [{case: 'pascalCase', multipleFileExtensions: false}]),
		testCaseWithOptions('Spec/Iss47.100Spec.js', undefined, [{case: 'pascalCase', multipleFileExtensions: false}]),
		{
			code: '/* eslint-disable rule-to-test/filename-case */\nconst value = 1;',
			filename: 'src/foo/foo_bar.js',
			options: [{case: 'kebabCase'}],
		},
		// Multiple filename parts - multiple file extensions
		testCaseWithOptions('src/foo/fooBar.Test.js', undefined, [{case: 'camelCase'}]),
		testCaseWithOptions('test/foo/fooBar.testUtils.js', undefined, [{case: 'camelCase'}]),
		testCaseWithOptions('test/foo/.testUtils.js', undefined, [{case: 'camelCase'}]),
		testCaseWithOptions('test/foo/foo_bar.Test.js', undefined, [{case: 'snakeCase'}]),
		testCaseWithOptions('test/foo/foo_bar.Test_Utils.js', undefined, [{case: 'snakeCase'}]),
		testCaseWithOptions('test/foo/.Test_Utils.js', undefined, [{case: 'snakeCase'}]),
		testCaseWithOptions('test/foo/foo-bar.Test.js', undefined, [{case: 'kebabCase'}]),
		testCaseWithOptions('test/foo/foo-bar.Test-Utils.js', undefined, [{case: 'kebabCase'}]),
		testCaseWithOptions('test/foo/.Test-Utils.js', undefined, [{case: 'kebabCase'}]),
		testCaseWithOptions('Test/Foo/FooBar.Test.js', undefined, [{case: 'pascalCase'}]),
		testCaseWithOptions('Test/Foo/FooBar.TestUtils.js', undefined, [{case: 'pascalCase'}]),
		testCaseWithOptions('Test/Foo/.TestUtils.js', undefined, [{case: 'pascalCase'}]),
		testCaseWithOptions('src/foo-bar/file.js'),
		testCaseWithOptions('src/$userId/page.js'),
		testCaseWithOptions('src/FooBar/file.js', undefined, [
			{checkDirectories: false},
		]),
		testCaseWithOptions('src/FooBar/file.js', undefined, [
			{case: 'kebabCase', checkDirectories: false},
		]),
		testCaseWithOptions('src/meta/BadName.js', undefined, [
			{case: 'kebabCase', ignore: [/^meta$/u]},
		]),
		testCaseWithOptions('src/meta/BadName.js', undefined, [
			{case: 'kebabCase', ignore: ['^meta$']},
		]),
		testCaseWithOptions(outsideCwd, undefined, [
			{case: 'camelCase'},
		]),
	],
	invalid: [
		{
			code: '// eslint-disable rule-to-test/filename-case\nconst value = 1;',
			filename: 'src/foo/foo_bar.js',
			options: [{case: 'kebabCase'}],
			errors: [
				{
					message: 'Filename is not in kebab case. Rename it to `foo-bar.js`.',
				},
			],
		},
		testCase(
			'src/foo/foo_bar.js',
			undefined,
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
		),
		testCase(
			'src/fooBar',
			undefined,
			'Filename is not in kebab case. Rename it to `foo-bar`.',
		),
		testCase(
			'src/foo/foo_bar.JS',
			'camelCase',
			'Filename is not in camel case. Rename it to `fooBar.js`.',
		),
		testCase(
			'src/foo/foo_bar.test.js',
			'camelCase',
			'Filename is not in camel case. Rename it to `fooBar.test.js`.',
		),
		testCase(
			'test/foo/foo_bar.test_utils.js',
			'camelCase',
			'Filename is not in camel case. Rename it to `fooBar.test_utils.js`.',
		),
		testCase(
			'test/foo/fooBar.js',
			'snakeCase',
			'Filename is not in snake case. Rename it to `foo_bar.js`.',
		),
		testCase(
			'test/foo/fooBar.test.js',
			'snakeCase',
			'Filename is not in snake case. Rename it to `foo_bar.test.js`.',
		),
		testCase(
			'test/foo/fooBar.testUtils.js',
			'snakeCase',
			'Filename is not in snake case. Rename it to `foo_bar.testUtils.js`.',
		),
		testCase(
			'test/foo/fooBar.js',
			'kebabCase',
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
		),
		testCase(
			'test/foo/fooBar.test.js',
			'kebabCase',
			'Filename is not in kebab case. Rename it to `foo-bar.test.js`.',
		),
		testCase(
			'test/foo/fooBar.testUtils.js',
			'kebabCase',
			'Filename is not in kebab case. Rename it to `foo-bar.testUtils.js`.',
		),
		testManyCases(
			'src/foo/Article.ts',
			{
				kebabCase: true,
			},
			'Filename is not in kebab case. Rename it to `article.ts`.',
		),
		testCase(
			'Test/Foo/fooBar.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `FooBar.js`.',
		),
		testCase(
			'Test/Foo/foo_bar.test.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `FooBar.test.js`.',
		),
		testCase(
			'Test/Foo/foo-bar.test-utils.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `FooBar.test-utils.js`.',
		),
		testCase(
			'Src/Foo/PageFAQ.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `PageFaq.js`.',
		),
		testCase(
			'Src/Foo/FAQ-Page.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `FaqPage.js`.',
		),
		testCase(
			'Src/Foo/FAQpage.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `FaQpage.js`.',
		),
		testCase(
			'Src/Foo/FAQPageFOO.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `FaqPageFoo.js`.',
		),
		testCase(
			'Src/FAQpage/Foo.js',
			'pascalCase',
			'Directory name `FAQpage` is not in pascal case. Rename it to `FaQpage`.',
		),
		testCase(
			'Src/Foo/URL2path.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `Url2path.js`.',
		),
		testCase(
			'Src/Foo/UIPath.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `UiPath.js`.',
		),
		testCase(
			'Src/Foo/UI2Path.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `Ui2Path.js`.',
		),
		testCase(
			'Src/Foo/FOO2.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `Foo2.js`.',
		),
		testCase(
			'src/foo/FAQPage.js',
			'camelCase',
			'Filename is not in camel case. Rename it to `faqPage.js`.',
		),
		testCase(
			'src/foo/innerHTML.js',
			'camelCase',
			'Filename is not in camel case. Rename it to `innerHtml.js`.',
		),
		testCase(
			'src/foo/HTMLParser.js',
			'camelCaseWithAcronyms',
			'Filename is not in camel case with acronyms. Rename it to `htmlParser.js`.',
		),
		testCase(
			'src/foo/XMLHttpRequest.js',
			'camelCaseWithAcronyms',
			'Filename is not in camel case with acronyms. Rename it to `xmlHttpRequest.js`.',
		),
		testCase(
			'src/foo/FAQPage.js',
			'camelCaseWithAcronyms',
			'Filename is not in camel case with acronyms. Rename it to `faqPage.js`.',
		),
		testCase(
			'src/foo/FAQPage.js',
			undefined,
			'Filename is not in kebab case. Rename it to `faq-page.js`.',
		),
		testCase(
			'src/foo/_FOO-BAR.js',
			'camelCase',
			'Filename is not in camel case. Rename it to `_fooBar.js`.',
		),
		testCase(
			'src/foo/___FOO-BAR.js',
			'camelCase',
			'Filename is not in camel case. Rename it to `___fooBar.js`.',
		),
		testCase(
			'src/foo/_FOO-BAR.js',
			'snakeCase',
			'Filename is not in snake case. Rename it to `_foo_bar.js`.',
		),
		testCase(
			'src/foo/___FOO-BAR.js',
			'snakeCase',
			'Filename is not in snake case. Rename it to `___foo_bar.js`.',
		),
		testCase(
			'src/foo/_FOO-BAR.js',
			'kebabCase',
			'Filename is not in kebab case. Rename it to `_foo-bar.js`.',
		),
		testCase(
			'src/foo/___FOO-BAR.js',
			'kebabCase',
			'Filename is not in kebab case. Rename it to `___foo-bar.js`.',
		),
		testCase(
			'Src/Foo/_FOO-BAR.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `_FooBar.js`.',
		),
		testCase(
			'Src/Foo/___FOO-BAR.js',
			'pascalCase',
			'Filename is not in pascal case. Rename it to `___FooBar.js`.',
		),
		testManyCases(
			'src/foo/foo_bar.js',
			undefined,
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
		),
		testManyCases(
			'src/foo/foo-bar.js',
			{
				camelCase: true,
				pascalCase: true,
			},
			'Filename is not in camel case or pascal case. Rename it to `fooBar.js` or `FooBar.js`.',
		),
		testManyCases(
			'src/foo-bar/file.js',
			{
				camelCase: true,
				pascalCase: true,
			},
			'Directory name `foo-bar` is not in camel case or pascal case. Rename it to `fooBar` or `FooBar`.',
		),
		testManyCases(
			'src/foo/_foo_bar.js',
			{
				camelCase: true,
				pascalCase: true,
				kebabCase: true,
			},
			'Filename is not in camel case, pascal case, or kebab case. Rename it to `_fooBar.js`, `_FooBar.js`, or `_foo-bar.js`.',
		),
		testManyCases(
			'src/foo/_FOO-BAR.js',
			{
				snakeCase: true,
			},
			'Filename is not in snake case. Rename it to `_foo_bar.js`.',
		),
		testCase(
			'src/FooBar/file.js',
			undefined,
			'Directory name `FooBar` is not in kebab case. Rename it to `foo-bar`.',
		),
		testCase(
			'src/_FOO-BAR/file.js',
			undefined,
			'Directory name `_FOO-BAR` is not in kebab case. Rename it to `_foo-bar`.',
		),
		testCase(
			'src/$UserId/fooBar.js',
			undefined,
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
		),
		testCaseWithOptions(
			'src/FooBar/foo_bar.js',
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
			[{case: 'kebabCase', checkDirectories: false}],
		),
		testCaseWithOptions(
			'src/foo-bar/foo_bar.js',
			'Filename is not in camel case or pascal case. Rename it to `fooBar.js` or `FooBar.js`.',
			[
				{
					cases: {
						camelCase: true,
						pascalCase: true,
					},
					checkDirectories: false,
				},
			],
		),
		testCase(
			'src/FooBar/foo_bar.js',
			undefined,
			'Directory name `FooBar` is not in kebab case. Rename it to `foo-bar`.',
		),
		testCase(
			'src/foo-bar/foo_bar.js',
			undefined,
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
		),
		testCase(
			'src/FooBar/index.js',
			undefined,
			'Directory name `FooBar` is not in kebab case. Rename it to `foo-bar`.',
		),
		testCase(
			path.join(cwd, 'src/FooBar/file.js'),
			undefined,
			'Directory name `FooBar` is not in kebab case. Rename it to `foo-bar`.',
		),
		testCase(
			outsideCwd,
			undefined,
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
		),
		testCase(
			'src/foo/[foo_bar].js',
			undefined,
			'Filename is not in kebab case. Rename it to `[foo-bar].js`.',
		),
		testCase(
			'src/foo/foo$Bar.js',
			undefined,
			'Filename is not in kebab case. Rename it to `foo$bar.js`.',
		),
		testCase(
			'src/foo/$userId.TSX',
			undefined,
			'File extension `.TSX` is not in lowercase. Rename it to `$userId.tsx`.',
		),
		testManyCases(
			'src/foo/{foo_bar}.js',
			{
				camelCase: true,
				pascalCase: true,
				kebabCase: true,
			},
			'Filename is not in camel case, pascal case, or kebab case. Rename it to `{fooBar}.js`, `{FooBar}.js`, or `{foo-bar}.js`.',
		),
		testCaseWithOptions(
			'src/foo/barBaz.js',
			'Filename is not in kebab case. Rename it to `bar-baz.js`.',
			[{case: 'kebabCase', ignore: [String.raw`FOOBAR\.js`]}],
		),
		testCaseWithOptions(
			'src/foo/barBaz.js',
			'Filename is not in kebab case. Rename it to `bar-baz.js`.',
			[{case: 'kebabCase', ignore: [String.raw`/FOOBAR\.js/`]}],
		),
		testCaseWithOptions(
			'src/foo/barBaz.js',
			'Filename is not in kebab case. Rename it to `bar-baz.js`.',
			[{case: 'kebabCase', ignore: [/FOOBAR\.js/u]}],
		),
		testCaseWithOptions(
			'src/foo/fooBar.js',
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
			[{case: 'kebabCase', ignore: [String.raw`FOOBAR\.js`]}],
		),
		testCaseWithOptions(
			'src/foo/fooBar.js',
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
			[{case: 'kebabCase', ignore: [/FOOBAR\.js/u]}],
		),
		testCaseWithOptions(
			'src/foo/fooBar.js',
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
			[{case: 'kebabCase', ignore: [String.raw`FOOBAR\.js`, String.raw`foobar\.js`]}],
		),
		testCaseWithOptions(
			'src/foo/fooBar.js',
			'Filename is not in kebab case. Rename it to `foo-bar.js`.',
			[{case: 'kebabCase', ignore: [/FOOBAR\.js/u, /foobar\.js/u]}],
		),
		testCaseWithOptions(
			'src/qux/FooBar.js',
			'Filename is not in camel case or snake case. Rename it to `fooBar.js` or `foo_bar.js`.',
			[
				{
					cases: {
						camelCase: true,
						snakeCase: true,
					},
					ignore: [String.raw`FOOBAR\.js`],
				},
			],
		),
		testCaseWithOptions(
			'src/qux/FooBar.js',
			'Filename is not in camel case or snake case. Rename it to `fooBar.js` or `foo_bar.js`.',
			[
				{
					cases: {
						camelCase: true,
						snakeCase: true,
					},
					ignore: [/FOOBAR\.js/u],
				},
			],
		),
		testCaseWithOptions(
			'src/qux/FooBar.js',
			'Filename is not in camel case or snake case. Rename it to `fooBar.js` or `foo_bar.js`.',
			[
				{
					cases: {
						camelCase: true,
						snakeCase: true,
					},
					ignore: [String.raw`BaRbAz\.js`],
				},
			],
		),
		testCaseWithOptions(
			'src/qux/FooBar.js',
			'Filename is not in camel case or snake case. Rename it to `fooBar.js` or `foo_bar.js`.',
			[
				{
					cases: {
						camelCase: true,
						snakeCase: true,
					},
					ignore: [/BaRbAz\.js/u],
				},
			],
		),
		testCaseWithOptions(
			'src/qux/FooBar.js',
			'Filename is not in camel case or snake case. Rename it to `fooBar.js` or `foo_bar.js`.',
			[
				{
					cases: {
						camelCase: true,
						snakeCase: true,
					},
					ignore: ['^foo'],
				},
			],
		),
		testCaseWithOptions(
			'src/qux/FooBar.js',
			'Filename is not in camel case or snake case. Rename it to `fooBar.js` or `foo_bar.js`.',
			[
				{
					cases: {
						camelCase: true,
						snakeCase: true,
					},
					ignore: [/^foo/],
				},
			],
		),
		testCaseWithOptions(
			'src/qux/FooBar.js',
			'Filename is not in camel case or snake case. Rename it to `fooBar.js` or `foo_bar.js`.',
			[
				{
					cases: {
						camelCase: true,
						snakeCase: true,
					},
					ignore: ['^foo', '^bar'],
				},
			],
		),
		testCaseWithOptions(
			'src/qux/FooBar.js',
			'Filename is not in camel case or snake case. Rename it to `fooBar.js` or `foo_bar.js`.',
			[
				{
					cases: {
						camelCase: true,
						snakeCase: true,
					},
					ignore: [/^foo/, /^bar/],
				},
			],
		),
		// #1136
		testManyCases(
			'src/foo/1_.js',
			{
				camelCase: true,
				pascalCase: true,
				kebabCase: true,
			},
			'Filename is not in camel case, pascal case, or kebab case. Rename it to `1.js`.',
		),
		// Multiple filename parts - single file extension
		testCaseWithOptions(
			'src/foo/foo_bar.test.js',
			'Filename is not in camel case. Rename it to `fooBar.test.js`.',
			[{case: 'camelCase', multipleFileExtensions: false}],
		),
		testCaseWithOptions(
			'test/foo/foo_bar.test_utils.js',
			'Filename is not in camel case. Rename it to `fooBar.testUtils.js`.',
			[{case: 'camelCase', multipleFileExtensions: false}],
		),
		testCaseWithOptions(
			'test/foo/fooBar.test.js',
			'Filename is not in snake case. Rename it to `foo_bar.test.js`.',
			[{case: 'snakeCase', multipleFileExtensions: false}],
		),
		testCaseWithOptions(
			'test/foo/fooBar.testUtils.js',
			'Filename is not in snake case. Rename it to `foo_bar.test_utils.js`.',
			[{case: 'snakeCase', multipleFileExtensions: false}],
		),
		testCaseWithOptions(
			'test/foo/fooBar.test.js',
			'Filename is not in kebab case. Rename it to `foo-bar.test.js`.',
			[{case: 'kebabCase', multipleFileExtensions: false}],
		),
		testCaseWithOptions(
			'test/foo/fooBar.testUtils.js',
			'Filename is not in kebab case. Rename it to `foo-bar.test-utils.js`.',
			[{case: 'kebabCase', multipleFileExtensions: false}],
		),
		testCaseWithOptions(
			'test/foo/.testUtils.js',
			'Filename is not in kebab case. Rename it to `.test-utils.js`.',
			[{case: 'kebabCase', multipleFileExtensions: false}],
		),
		testCaseWithOptions(
			'Test/Foo/foo_bar.test.js',
			'Filename is not in pascal case. Rename it to `FooBar.Test.js`.',
			[{case: 'pascalCase', multipleFileExtensions: false}],
		),
		testCaseWithOptions(
			'Test/Foo/foo-bar.test-utils.js',
			'Filename is not in pascal case. Rename it to `FooBar.TestUtils.js`.',
			[{case: 'pascalCase', multipleFileExtensions: false}],
		),
	],
});

ruleTest.snapshot({
	valid: [
		undefined,
		'src/foo-js/bar.js',
		'src/foo-js/bar.spec.js',
		'src/foo-js/.spec.js',
		'src/foo-js/bar',
		'foo.SPEC.js',
		'.SPEC.js',
	].map(filename => ({code: `const filename = ${JSON.stringify(filename)};`, filename})),
	invalid: [
		{
			code: 'foo();\n'.repeat(10),
			filename: 'src/foo/foo_bar.mJS',
			options: [
				{
					cases: {
						camelCase: true,
						kebabCase: true,
					},
				},
			],
		},
		...[
			'foo.JS',
			'foo.Js',
			'foo.jS',
			'index.JS',
			'foo..JS',
			// Valid stem + middle segment + uppercase primary extension: only the extension is flagged
			'foo.SPEC.JS',
		].map(filename => ({code: `/* Filename ${filename} */`, filename})),
	],
});
