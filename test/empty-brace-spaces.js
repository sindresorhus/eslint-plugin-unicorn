import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const SPACES_PLACEHOLDER = '/* */';
const cases = [
	'{/* */}',
	'function foo(){/* */}',
	'if(foo) {/* */}',
	'if(foo) {} else if (bar) {/* */}',
	'if(foo) {} else {/* */}',
	'for(;;){/* */}',
	'for(foo in bar){/* */}',
	'for(foo of bar){/* */}',
	'switch (foo) {case bar: {/* */}}',
	'switch (foo) {default: {/* */}}',
	'try {/* */} catch(foo){}',
	'try {} catch(bar){/* */}',
	'try {} catch(foo){} finally {/* */}',
	'do {/* */} while (foo)',
	'while (foo){/* */}',
	'foo = () => {/* */}',
	'foo = function (){/* */}',
	'foo = {/* */}',
	'class Foo {bar() {/* */}}',
	'foo = class {bar() {/* */}}',
	'class Foo {static  {/* */}}',
];
const classBodyCases = [
	'class Foo {/* */}',
	'foo = class {/* */}',
];
const allCases = [...cases, ...classBodyCases];

const ignoredCases = [
	'switch (foo) {/* */}',
	'const {/* */} = foo',
	'import {/* */} from "foo"',
];

test({
	valid: [
		...[
			'',
			'/* comment */',
			'\n\t// comment \n',
		].flatMap(body => allCases.map(code => code.replace(SPACES_PLACEHOLDER, () => body))),
		// Not empty
		...cases.map(code => code.replace(SPACES_PLACEHOLDER, 'unicorn')),
		...classBodyCases.map(code => code.replace(SPACES_PLACEHOLDER, 'baz() {}')),
		// `with`
		{
			code: 'with (foo) {}',
			languageOptions: {sourceType: 'script'},
		},
		// We don't check these cases
		...ignoredCases.map(code => code.replace(SPACES_PLACEHOLDER, () => ' '.repeat(3))),
	],
	invalid: [
		...[
			' ',
			'\t',
			' \t \t ',
			'\n\n',
			'\r\n',
		].flatMap(spaces => allCases.map(code => ({
			code: code.replace(SPACES_PLACEHOLDER, () => spaces),
			output: code.replace(SPACES_PLACEHOLDER, ''),
			errors: 1,
		}))),
		// `with`
		{
			code: `with (foo) {${' '.repeat(5)}}`,
			output: 'with (foo) {}',
			errors: 1,
			languageOptions: {sourceType: 'script'},
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		outdent`
			try {
				foo();
			} catch (error) {
				\u0020\u0020\u0020\u0020\u0020\u0020\u0020
			}
		`,
	],
});

const enableBabelPlugins = plugins => ({
	parserOptions: {
		babelOptions: {
			parserOpts: {
				plugins,
			},
		},
	},
});
const enableBabelPlugin = plugin => enableBabelPlugins([plugin]);

test.snapshot({
	valid: [languages.json, languages.jsonc, languages.json5].flatMap(language => ['{"object": {}}', '[]', '{"value": [1]}'].map(code => ({code, language}))),
	invalid: [languages.json, languages.jsonc, languages.json5].flatMap(language => ['{"object": { }}', '[ ]', '{"array": [\r\n  ], "object": {\n\t}}'].map(code => ({code, language}))),
});

test.snapshot({
	valid: [languages.jsonc, languages.json5].flatMap(language => ['{ /* comment */ }', '[ /* comment */ ]', '{ // comment\n}'].map(code => ({code, language}))),
	invalid: [],
});

test.snapshot({
	valid: ['a {}', 'a { /* comment */ }', '@media screen { a {} }', 'a { --value: { }; }'].map(code => ({code, language: languages.css})),
	invalid: ['a { }', '@media screen {\n}', '@keyframes animation { from { } }', 'a {\r\n  }'].map(code => ({code, language: languages.css})),
});

test.snapshot({
	valid: [
		'value: {}',
		'value: []',
		'value:\n  child: true',
		'value:\n  - true',
		'value: { # Keep comment\n}',
		'value: [ # Keep comment\n]',
	].map(code => ({code, language: languages.yaml})),
	invalid: [
		'value: { }',
		'value: [ ]',
		'value: {nested: [\r\n  ]}',
		'value: &anchor { }',
	].map(code => ({code, language: languages.yaml})),
});

test.snapshot({
	valid: [
		'value = {}',
		'value = []',
		'value = [ # Keep comment\n]',
		'value = {nested = [1]}',
		'[table]',
	].map(code => ({code, language: languages.toml})),
	invalid: [
		'value = { }',
		'value = [ ]',
		'value = {nested = [\r\n  ]}',
		'value = [{ }, [ ]]',
	].map(code => ({code, language: languages.toml})),
});
