import test from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta, 'no-immediate-mutation');

const checkConditionalsOptions = [{checkConditionals: true}];

// Consecutive declaration and initialization
ruleTest({
	valid: [
		'let foo = 1;',
		'let [foo] = string.split(\',\', 1);',
		'let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; someOtherStatement(); foo = 1;',
		'let r; someOtherStatement(); let g, b; [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; ; foo = 1;',
		'let foo; { foo = 1; }',
		'let foo; if (enabled) { foo = 1; }',
		{code: 'let foo; if (enabled) { foo = 1; }', options: checkConditionalsOptions},
		'let foo; enabled && (foo = 1);',
		'let foo; consume(foo = 1);',
		'let foo; foo += 1;',
		'let foo; foo ??= 1;',
		'let foo; other = 1;',
		'let foo; foo.bar = 1;',
		'let foo; [foo, other] = values;',
		'let foo; [foo, foo] = values;',
		'let foo; [] = values;',
		'let foo; [,] = values;',
		'let foo; ({foo} = object);',
		'let foo; [[foo]] = values;',
		'let foo; [foo = 1] = values;',
		'let foo; [...foo] = values;',
		'let foo; [foo.bar] = values;',
		'let foo; foo = foo ?? 1;',
		'let foo; foo = () => foo;',
		'let foo; [foo] = [foo];',
		'let foo, bar; [foo, bar] = [bar, foo];',
		'let foo, bar = 1; foo = 2;',
		'var foo; var foo; foo = 1;',
		'function run(foo) { var foo; foo = 1; }',
		'export let foo; foo = 1;',
		'for (let foo; enabled;) { foo = 1; }',
		{code: 'declare let foo; foo = 1;', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		{
			code: 'let foo;\nfoo = 1;',
			output: 'let foo = 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\n[foo] = string.split(\',\', 1);',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [foo] = string.split(\',\', 1);'}],
			}],
		},
		{
			code: 'let r, g, b;\n[r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));'}],
			}],
		},
		{
			code: 'let r, g, b, foo;\n[r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo;\nlet [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));'}],
			}],
		},
		{
			code: 'let foo;\nfoo = getValue();',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = getValue();'}],
			}],
		},
		{
			code: 'let first, foo, last;\nfoo = last;',
			output: 'let first, last;\nlet foo = last;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo: number;\nfoo = 1;',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: number = 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = 1;\nfoo = "x";'}],
			}],
		},
		{
			code: 'var foo;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'var foo = 1;\nfoo = "x";'}],
			}],
		},
		{
			code: 'let foo;\n[foo] = [1];\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [foo] = [1];\nfoo = "x";'}],
			}],
		},
		{
			code: 'let foo;\nfoo = 1;',
			filename: 'example.ts',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = 1;'}],
			}],
		},
		{
			code: 'let foo: number | string;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: number | string = 1;\nfoo = "x";',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
	],
});

ruleTest.snapshot({
	valid: [],
	invalid: [
		'var foo;\nfoo = 1;',
		'var r, g, b;\n[b, r, g] = values;',
		'let first, foo, last;\nfoo = 1;',
		'let r, keep, g, b;\n[g, , b, r] = values;',
		'let foo;\n((foo)) = ((1));',
		'let foo;\n((foo = (first, second)));',
		'let foo;\n[foo] = ((values));',
		'let foo;\nfoo = (other => other)(1);',
		'let foo;\nfoo = (foo => foo)(1);',
		'let foo;\nfoo = () => 1;',
		'let foo;\nfoo = other?.value;',
		'let foo;\nfoo = other?.getValue();',
		{code: 'let foo;\nfoo = <Component />;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'let foo;\nfoo = 1;\nfoo = 2;',
		'let foo\nfoo = 1\n;[1].map(callback)',
		'let foo;\nfoo = 1;\n[1].map(callback);',
		'function run() {\n\tlet foo;\n\tfoo = 1;\n}',
		'function run() {\r\n  let foo, other;\r\n  foo = 1;\r\n}',
		'let foo;\nfoo = 1; // Keep this comment.',
		'let foo; // Keep this comment.\nfoo = 1;',
		'let /* Keep this comment. */ foo;\nfoo = 1;',
		'let foo;\n/* Keep this comment. */ foo = 1;',
		'let foo;\nfoo = /* Keep this comment. */ 1;',
		'let foo;\nfoo = getValue(/* Keep this comment. */);',
		{code: 'let foo;\nfoo = 1;', options: checkConditionalsOptions},
		{code: 'let foo: number;\nfoo = value as number;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number, other: string;\nfoo = value!;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo;\nfoo = value satisfies number;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number, bar: string;\n[foo, bar] = values;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number;\n[foo] = getValues();', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo;\n[foo] = values as number[];', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo!: number;\nfoo = 1;', languageOptions: {parser: parsers.typescript}},
	],
});

test('combines consecutive initialization and mutation across autofix passes', t => {
	const linter = new Linter();
	const code = 'let array;\narray = [1];\narray.push(2);\nif (enabled) { array.push(3); }';
	for (const [checkConditionals, output] of [
		[false, 'let array = [1, 2];\nif (enabled) { array.push(3); }'],
		[true, 'let array = [1, 2, ...((enabled) ? [3] : [])];'],
	]) {
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': ['error', {checkConditionals}]},
		});

		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
	}
});
