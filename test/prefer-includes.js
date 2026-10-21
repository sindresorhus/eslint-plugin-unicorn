import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {transpileModule, ScriptTarget} from 'typescript';
import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';
import tests, {testTypeAwareSearches} from './shared/simple-array-search-rule-tests.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

test({
	valid: [],
	invalid: [
		['getValues(/* keep */).indexOf(value) !== -1;', 'getValues(/* keep */).includes(value);'],
		['values.indexOf(getValue(/* keep */)) === -1;', '!values.includes(getValue(/* keep */));'],
		['values.indexOf((/* keep */ value), 0) >= 0;', 'values.includes((/* keep */ value));'],
		['values.indexOf(value, getStart(/* keep */)) !== -1;', 'values.includes(value, getStart(/* keep */));'],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-includes'}]})),
});

test({
	valid: [],
	invalid: [
		{
			code: '(values as /* keep */ string[]).indexOf(value) !== -1;',
			output: '(values as /* keep */ string[]).includes(value);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'values.indexOf(getValue(\r\n  // keep\r\n)) === -1;',
			output: '!values.includes(getValue(\r\n  // keep\r\n));',
			errors: [{messageId: 'prefer-includes'}],
		},
		...[
			'values./* keep */indexOf(value) !== -1;',
			'values.indexOf(value, (/* keep */ 0)) !== -1;',
			'(values.indexOf(value) /* keep */) !== -1;',
		].map(code => ({code, errors: [{messageId: 'prefer-includes'}]})),
	],
});

test.vue({
	valid: [],
	invalid: [
		...[
			['values.indexOf((/* keep */ value)) > -1', 'values.includes((/* keep */ value))'],
			['getValues(/* keep */).lastIndexOf(value) === -1', '!getValues(/* keep */).includes(value)'],
		].map(([code, output]) => ({
			code: `<template><div v-if="${code}"></div></template>`,
			output: `<template><div v-if="${output}"></div></template>`,
			errors: [{messageId: 'prefer-includes'}],
		})),
	],
});

const linterConfig = {
	plugins: {unicorn: {rules: {'prefer-includes': rule}}},
	rules: {'unicorn/prefer-includes': 'error'},
};

nodeTest('string RegExp searches retain results across constructors and comparison polarity', t => {
	for (const initializer of ['/a/', 'RegExp("a")', 'new RegExp("a", "i")']) {
		for (const method of ['indexOf', 'lastIndexOf']) {
			for (const found of [false, true]) {
				for (const [comparison, positive] of [['!== -1', true], ['>= 0', true], ['=== -1', false], ['< 0', false]]) {
					const code = outdent`
						const pattern = ${initializer};
						const value = ${found ? 'String(pattern)' : '"missing"'};
						value.${method}(pattern) ${comparison};
					`;
					const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
					t.assert.strictEqual(runInNewContext(code), positive === found);
					t.assert.strictEqual(output, code);
					t.assert.strictEqual(runInNewContext(output), positive === found);
					t.assert.strictEqual(fixed, false);
					t.assert.deepStrictEqual(messages, []);
				}
			}
		}
	}
});

nodeTest('known arrays retain RegExp identity search autofixes', t => {
	for (const initializer of ['[pattern]', 'Array.of(pattern)', 'Array.from([pattern])', 'new Array(pattern)']) {
		for (const method of ['indexOf', 'lastIndexOf']) {
			for (const [search, found, calls] of [
				['pattern', true, []],
				['/a/', false, []],
				['new RegExp("a")', false, []],
				['(calls.push("read"), pattern)', true, ['read']],
			]) {
				const code = outdent`
					const calls = [];
					const pattern = /a/;
					const values = ${initializer};
					const result = values.${method}(${search}) !== -1;
					JSON.stringify({result, calls});
				`;
				const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
				const expected = JSON.stringify({result: found, calls});
				t.assert.strictEqual(runInNewContext(code), expected);
				t.assert.strictEqual(runInNewContext(output), expected);
				t.assert.strictEqual(fixed, true);
				t.assert.deepStrictEqual(messages, []);
			}
		}
	}

	const code = 'new Uint8Array([1, 2]).indexOf(/a/) !== -1;';
	const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
	t.assert.strictEqual(runInNewContext(code), false);
	t.assert.strictEqual(runInNewContext(output), false);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

nodeTest('sequence search arguments preserve comparison results and evaluation order', t => {
	for (const receiver of ['"abb"', '["a", "b", "b"]']) {
		for (const method of ['indexOf', 'lastIndexOf']) {
			for (const needle of ['b', 'z']) {
				for (const [comparison, positive] of [
					['!== -1', true],
					['!= -1', true],
					['> -1', true],
					['>= 0', true],
					['=== -1', false],
					['== -1', false],
					['<= -1', false],
					['< 0', false],
				]) {
					const code = outdent`
						const calls = [];
						function getReceiver() { calls.push("receiver"); return ${receiver}; }
						const result = getReceiver(/* receiver */).${method}((calls.push("first"), calls.push(/* search */ "second"), "${needle}")) ${comparison};
						JSON.stringify({calls, result});
					`;
					const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
					const found = needle === 'b';
					const expected = JSON.stringify({calls: ['receiver', 'first', 'second'], result: positive === found});
					t.assert.strictEqual(runInNewContext(code), expected);
					t.assert.strictEqual(runInNewContext(output), expected);
					t.assert.strictEqual(fixed, true);
					t.assert.deepStrictEqual(messages, []);
					t.assert.ok(output.includes('/* receiver */'));
					t.assert.ok(output.includes('/* search */'));
				}
			}
		}
	}
});

nodeTest('sequence fromIndex arguments stay grouped after includes autofixes', t => {
	for (const receiver of ['"abb"', '["a", "b", "b"]']) {
		for (const fromIndex of [0, 2, 3, -1]) {
			for (const sequenceSearch of [false, true]) {
				const searchText = sequenceSearch ? '(calls.push("search"), "b")' : '"b"';
				const code = outdent`
					const calls = [];
					const result = ${receiver}.indexOf(${searchText}, (calls.push(/* keep */ "from"), ${fromIndex})) !== -1;
					JSON.stringify({calls, result});
				`;
				const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
				const expected = JSON.stringify({calls: sequenceSearch ? ['search', 'from'] : ['from'], result: fromIndex !== 3});
				t.assert.strictEqual(runInNewContext(code), expected);
				t.assert.strictEqual(runInNewContext(output), expected);
				t.assert.strictEqual(fixed, true);
				t.assert.deepStrictEqual(messages, []);
				t.assert.ok(output.includes('/* keep */'));
			}
		}
	}
});

test({
	valid: [
		'values.lastIndexOf((read(), needle), (readIndex(), 0)) !== -1;',
		'values.indexOf((read(), needle), 0, extra) !== -1;',
	],
	invalid: [
		{
			code: 'values.indexOf(((read(), needle)), ((readIndex(), 2))) !== -1;',
			output: 'values.includes((read(), needle), (readIndex(), 2));',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'values.indexOf((read(), needle), 0) === -1;',
			output: '!values.includes((read(), needle));',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'values.indexOf((read(), needle), (readIndex(), 0)) < 0;',
			output: '!values.includes((read(), needle), (readIndex(), 0));',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'values.indexOf((read(), /* keep */ needle)) !== -1;',
			output: 'values.includes((read(), /* keep */ needle));',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'values.indexOf(needle, (readIndex(), /* keep */ 2)) !== -1;',
			output: 'values.includes(needle, (readIndex(), /* keep */ 2));',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: '(values as string[]).indexOf((read(), needle as string), (readIndex(), 2 satisfies number)) !== -1;',
			output: '(values as string[]).includes((read(), needle as string), (readIndex(), 2 satisfies number));',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'values!.lastIndexOf((read(), needle!)) == -1;',
			output: '!values!.includes((read(), needle!));',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'const view = <div>{values.indexOf((read(), needle)) !== -1}</div>;',
			output: 'const view = <div>{values.includes((read(), needle))}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: '<template><div v-if="values.indexOf((read(), needle)) !== -1"></div></template>',
			output: '<template><div v-if="values.includes((read(), needle))"></div></template>',
			languageOptions: {parser: parsers.vue},
			errors: [{messageId: 'prefer-includes'}],
		},
	],
});

nodeTest('some searches with side effects stay suggestions', t => {
	for (const [code, original, suggested] of [
		[
			'let calls = 0; function getValue() { calls++; return calls + 1; } const found = [1, 2].some(item => item === getValue()); JSON.stringify({found, calls});',
			'{"found":false,"calls":2}',
			'{"found":true,"calls":1}',
		],
		[
			'let value = 1; const found = [].some(item => item === (value += 1)); JSON.stringify({found, value});',
			'{"found":false,"value":1}',
			'{"found":false,"value":2}',
		],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(runInNewContext(output), original);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions.length, 1);
		t.assert.strictEqual(messages[0].suggestions[0].messageId, 'prefer-includes-over-some/suggestion');
		const {range, text} = messages[0].suggestions[0].fix;
		const suggestedCode = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.strictEqual(runInNewContext(suggestedCode), suggested);
	}
});

nodeTest('some searches without side effects are autofixed', t => {
	for (const value of [
		'0',
		'-0',
		'+2',
		'-(-2)',
		'1e999',
		'-1e999',
		'"item"',
		'true',
		'false',
		'null',
		'2n',
		'undefined',
		'`item`',
		'/item/u',
		'target',
		'object.id',
		'object?.id',
		'object.missing',
	]) {
		for (const values of ['[]', '[0, 2, "item", true, false, null, 2n, 1e999, undefined]']) {
			const setup = 'const target = 2; const object = {id: "item"};';
			const code = `${setup} ${values}.some(item => item === ${value});`;
			const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
			t.assert.strictEqual(output, `${setup} ${values}.includes(${value});`);
			t.assert.strictEqual(fixed, true);
			t.assert.deepStrictEqual(messages, []);
			t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
		}
	}
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		...[
			// `indexOf()` never returns less than `-1`
			'str.indexOf(\'foo\') < -1',
			'str.indexOf(\'foo\') <= -2',
			'str.indexOf(\'foo\') !== -n',
			'str.indexOf(\'foo\') !== 1',
			'str.indexOf(\'foo\') === -2',
			'!str.indexOf(\'foo\') === 1',
			'!str.indexOf(\'foo\') === -n',
			'null.indexOf(\'foo\') !== 1',
			'something.indexOf(foo, 0, another) !== -1',
			'_.indexOf(foo, bar) !== -1',
			'lodash.indexOf(foo, bar) !== -1',
			'underscore.indexOf(foo, bar) !== -1',
		].flatMap(code => [code, code.replace('.indexOf', '.lastIndexOf'), {code: `<template><div v-if="${code}"></div></template>`, languageOptions: {parser: parsers.vue}}]),
		// `lastIndexOf` searches backward from `fromIndex`, so it is not equivalent to `.includes()` (forward)
		'foo.lastIndexOf(bar, 0) !== -1',
		'foo.lastIndexOf(bar, 1) !== -1',
		// A spread can pass a `fromIndex`
		'values.lastIndexOf(...args) !== -1',
		'values.lastIndexOf(value, ...rest) === -1',
		'str.includes(\'foo\')',
		'\'foobar\'.includes(\'foo\')',
		'[1,2,3].includes(4)',
		'f(0) < 0',
		// `indexOf()` compares with `===` and never finds `NaN`, while `.includes()` uses SameValueZero
		'array.indexOf(NaN) !== -1',
		'array.indexOf(NaN) === -1',
		'array.lastIndexOf(NaN) !== -1',
		'str.indexOf(NaN) < 0',
	],
	invalid: [
		...[
			'\'foobar\'.indexOf(\'foo\') !== -1',
			'str.indexOf(\'foo\') != -1',
			'str.indexOf(\'foo\') > -1',
			// `indexOf()` only returns `-1` or a non-negative index, so `<= -1` is `=== -1`
			'str.indexOf(\'foo\') <= -1',
			'str.indexOf(\'foo\') == -1',
			'\'foobar\'.indexOf(\'foo\') >= 0',
			'[1,2,3].indexOf(4) !== -1',
			'str.indexOf(\'foo\') < 0',
			'\'\'.indexOf(\'foo\') < 0',
			'(a || b).indexOf(\'foo\') === -1',
		].flatMap(code => [code, code.replace('.indexOf', '.lastIndexOf'), {code: `<template><div v-if="${code}"></div></template>`, languageOptions: {parser: parsers.vue}}]),
		// `indexOf` with `fromIndex` maps cleanly to `.includes()` (both search forward); `lastIndexOf` does not
		'foo.indexOf(bar, 0) !== -1',
		'foo.indexOf(bar, 1) !== -1',
		'values.indexOf(...args) !== -1',
		{
			code: outdent`
				<script setup lang="ts">
				console.log([].indexOf(1) != -1);
				</script>
			`,
			languageOptions: {parser: parsers.vue},
		},
	],
});

const {snapshot, typescript} = tests({
	method: 'some',
	replacement: 'includes',
});

test.snapshot(snapshot);
test.typescript(typescript);

testTypeAwareSearches({
	method: 'some', replacement: 'includes', rule, test: nodeTest,
});

test({
	valid: [
		'const array = [true, false, true]; array.some(value => value);',
		'const array = [true, false, true]; array.some(value => Boolean(value));',
		typeAware('const array: number[] = [1, 2, 3]; array.some(value => value);'),
		typeAware('const array: number[] = [1, 2, 3]; array.some(value => Boolean(value));'),
		typeAware('const array: unknown[] = [true, false, true]; array.some(value => value);'),
		typeAware('const array: unknown[] = [true, false, true]; array.some(value => Boolean(value));'),
		typeAware('const array: Boolean[] = [true, false, true]; array.some(value => value);'),
		typeAware('const array: Array<boolean | undefined> = [true, false, undefined]; array.some(value => value);'),
		typeAware('const array: Array<boolean | undefined> = [true, false, undefined]; array.some(value => Boolean(value));'),
		typeAware('const array: false[] = [false]; array.some(value => value);'),
		typeAware('const array: false[] = [false]; array.some(value => Boolean(value));'),
		typeAware('declare const array: false[] | boolean[]; array.some(value => value);'),
		typeAware('declare const array: false[] | boolean[]; array.some(value => Boolean(value));'),
		typeAware('declare const array: true[] | false[]; array.some(value => value);'),
		typeAware('declare const array: true[] | false[]; array.some(value => Boolean(value));'),
		typeAware('const collection: {some(callback: (value: boolean) => boolean): boolean} = {} as never; collection.some(value => value);'),
		typeAware('const collection: {some(callback: (value: boolean) => boolean): boolean} = {} as never; collection.some(value => Boolean(value));'),
		typeAware('export {}; type Array<T> = {some(callback: (value: T) => boolean): boolean}; declare const collection: Array<boolean>; collection.some(value => value);'),
		typeAware('export {}; type Array<T> = {some(callback: (value: T) => boolean): boolean}; declare const collection: Array<boolean>; collection.some(value => Boolean(value));'),
	],
	invalid: [
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(value => value);'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		// A comment inside the callback is preserved by not fixing
		{
			code: 'foo.some(bar => /* keep */ bar === baz)',
			errors: 1,
		},
		{
			code: 'foo.some(bar => bar /* keep */ === baz)',
			errors: 1,
		},
		{
			code: 'foo.some(bar => bar === /* keep */ baz)',
			errors: 1,
		},
		{
			code: 'foo.some(bar => { /* keep */ return bar === baz; })',
			errors: 1,
		},
		// A comment in the call is preserved by not fixing
		{
			code: 'foo.indexOf(/* keep */ x) !== -1',
			errors: 1,
		},
		{
			code: 'foo.indexOf(x /* keep */) !== -1',
			errors: 1,
		},
		{
			code: 'foo.indexOf(x, /* keep */ 0) !== -1',
			errors: 1,
		},
		{
			// The comment can also be outside the call
			code: 'foo.indexOf(x) /* keep */ !== -1',
			errors: 1,
		},
		{
			code: 'foo.indexOf(x) !== /* keep */ -1',
			errors: 1,
		},
		{
			code: 'foo.indexOf(x)\n// keep\n!== -1',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(value => {return value;});'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(function (value) {return value;});'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(value => Boolean(value));'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(function (value) {return Boolean(value);});'),
			output: 'const array: boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: Array<boolean> = [true, false, true]; array.some(value => value);'),
			output: 'const array: Array<boolean> = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: readonly boolean[] = [true, false, true]; array.some(value => value);'),
			output: 'const array: readonly boolean[] = [true, false, true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: true[] = [true]; array.some(value => value);'),
			output: 'const array: true[] = [true]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: [true, false] = [true, false]; array.some(value => value);'),
			output: 'const array: [true, false] = [true, false]; array.includes(true);',
			errors: 1,
		},
		{
			...typeAware('const array: boolean[] = [true, false, true]; array.some(value => Boolean(/* keep */ value));'),
			errors: 1,
		},
	],
});

// `some(x => x === NaN)` is always `false`, `includes(NaN)` uses SameValueZero
test({
	valid: [
		'array.indexOf(Number.NaN) !== -1',
		'const notANumber = NaN; array.indexOf(notANumber) !== -1',
		'array.indexOf(Math.sqrt(-1)) !== -1',
		'array.some(element => element === NaN);',
		'array.some(element => NaN === element);',
		'array.some(function (element) { return element === NaN; });',
		'array.some(element => element === Number.NaN);',
		'const notANumber = 0 / 0; array.some(element => element === notANumber);',
	],
	invalid: [
		// A shadowed `NaN` is an ordinary value, so the rewrite still holds
		{
			code: 'function f(NaN) { return array.some(element => element === NaN); }',
			output: 'function f(NaN) { return array.includes(NaN); }',
			errors: 1,
		},
		{
			code: 'function f(NaN) { return array.indexOf(NaN) !== -1; }',
			output: 'function f(NaN) { return array.includes(NaN); }',
			errors: 1,
		},
	],
});

// `indexOf()` only returns `-1` or a non-negative index, so `<= -1` is a non-existence check
test({
	valid: [],
	invalid: [
		{
			code: 'str.lastIndexOf(\'foo\') <= -1',
			output: '!str.includes(\'foo\')',
			errors: 1,
		},
		// No argument searches for `undefined`
		{
			code: 'str.indexOf() !== -1',
			output: 'str.includes()',
			errors: 1,
		},
	],
});

test({
	valid: [
		'value.indexOf(/a/) !== -1;',
		'value.lastIndexOf(new RegExp("a")) === -1;',
		'"/a/".indexOf((/a/)) >= 0;',
		'"/a/".indexOf((read(), /a/), 0) !== -1;',
		'const pattern = /a/; const alias = pattern; "/a/".indexOf(alias) !== -1;',
		'"/a/".indexOf(/* keep */ /a/) !== -1;',
		'function check(value: string, pattern: RegExp) { return value.indexOf(pattern) !== -1; }',
		'function check(values: Uint8Array, pattern: RegExp) { return values.indexOf(pattern) < 0; }',
		'(value as string).indexOf((/a/ as RegExp)) !== -1;',
		'value!.lastIndexOf((/a/ satisfies RegExp)) === -1;',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	invalid: [
		{
			code: 'const pattern = /a/; [pattern].indexOf(pattern) !== -1;',
			output: 'const pattern = /a/; [pattern].includes(pattern);',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'const pattern = /a/; Array.of(pattern).lastIndexOf(pattern) < 0;',
			output: 'const pattern = /a/; !Array.of(pattern).includes(pattern);',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'function check(values: RegExp[], pattern: RegExp) { return values.indexOf(pattern) !== -1; }',
			output: 'function check(values: RegExp[], pattern: RegExp) { return values.includes(pattern); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'function check(values: readonly RegExp[], pattern: RegExp) { return values.lastIndexOf(pattern) === -1; }',
			output: 'function check(values: readonly RegExp[], pattern: RegExp) { return !values.includes(pattern); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			...typeAware('function check(values: Uint8Array, pattern: RegExp) { return values.indexOf(pattern) < 0; }'),
			output: 'function check(values: Uint8Array, pattern: RegExp) { return !values.includes(pattern); }',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'const pattern = /a/; (values as RegExp[]).indexOf((pattern as RegExp)) !== -1;',
			output: 'const pattern = /a/; (values as RegExp[]).includes(pattern as RegExp);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: '"a".indexOf(String(/a/)) === -1;',
			output: '!"a".includes(String(/a/));',
			errors: [{messageId: 'prefer-includes'}],
		},
	],
});

test({
	valid: [
		typeAware('function getPattern() { return /a/; } const value = "/a/"; value.indexOf(getPattern()) !== -1;'),
		{
			code: 'const view = <div>{value.indexOf(/a/) !== -1}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: '<template><div v-if="value.lastIndexOf(/a/) === -1"></div></template>',
			languageOptions: {parser: parsers.vue},
		},
	],
	invalid: [
		{
			...typeAware('function getValues() { return [/a/]; } getValues().indexOf(/a/) !== -1;'),
			output: 'function getValues() { return [/a/]; } getValues().includes(/a/);',
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: 'const pattern = /a/; const view = <div>{[pattern].indexOf(pattern) !== -1}</div>;',
			output: 'const pattern = /a/; const view = <div>{[pattern].includes(pattern)}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			errors: [{messageId: 'prefer-includes'}],
		},
		{
			code: '<template><div v-if="[pattern].indexOf(/a/) !== -1"></div></template>',
			output: '<template><div v-if="[pattern].includes(/a/)"></div></template>',
			languageOptions: {parser: parsers.vue},
			errors: [{messageId: 'prefer-includes'}],
		},
	],
});

// Erased type assertions must not expose a unary left operand of exponentiation.
test({
	valid: [],
	invalid: [{
		code: 'array.indexOf(value) < 0 as any ** 2;',
		languageOptions: {parser: parsers.typescript},
		output: '(!array.includes(value)) as any ** 2;',
		errors: 1,
	}],
});

test({
	valid: [],
	invalid: [
		...[
			['setup()\narray.indexOf(value) < 0 as any ** 2;', 'setup()\n;(!array.includes(value)) as any ** 2;'],
			['(array.indexOf(value) < 0) as any ** 2;', '(!array.includes(value)) as any ** 2;'],
			['array.lastIndexOf(value) < 0 satisfies boolean as any ** 2;', '(!array.includes(value)) satisfies boolean as any ** 2;'],
		].map(([code, output]) => ({
			code, output, languageOptions: {parser: parsers.typescript}, errors: 1,
		})),
		{
			code: 'array.indexOf(/* keep */ value) < 0 as any ** 2;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

nodeTest('negated index checks retain grouping after TypeScript assertions are erased', t => {
	for (const value of [1, 2]) {
		for (const expression of ['array.indexOf(value) < 0 as any ** 2', '(array.indexOf(value) < 0 as any) ** 2']) {
			const code = `const array = [1]; const value = ${value}; const setup = () => undefined;\nsetup()${expression.startsWith('(') ? ';' : ''}\n${expression};`;
			const config = {...linterConfig, languageOptions: {parser: typescriptEslintParser}};
			const {output, fixed, messages} = linter.verifyAndFix(code, config);
			const execute = source => runInNewContext(transpileModule(source, {compilerOptions: {target: ScriptTarget.ESNext}}).outputText);
			t.assert.strictEqual(fixed, true);
			t.assert.deepStrictEqual(messages, []);
			t.assert.strictEqual(execute(output), execute(code));
		}
	}
});

// Parentheses around the old call can hide an object-derived receiver prefix.
test({
	valid: [],
	invalid: [{
		code: '({array: [1]}.array.indexOf(1)) >= 0;',
		output: '({array: [1]}.array).includes(1);',
		errors: 1,
	}, {
		code: 'const found = ({array: [1]}.array.indexOf(1)) >= 0;',
		output: 'const found = {array: [1]}.array.includes(1);',
		errors: 1,
	}, {
		code: 'array.indexOf(value) < 0 as boolean;',
		output: '!array.includes(value) as boolean;',
		languageOptions: {parser: parsers.typescript},
		errors: 1,
	}],
});

// Type wrappers alone do not require grouping around a generated negation.
test({
	valid: [],
	invalid: [
		['array.indexOf(value) < 0 satisfies boolean;', '!array.includes(value) satisfies boolean;'],
		['setup()\narray.indexOf(value) < 0 as boolean;', 'setup()\n!array.includes(value) as boolean;'],
		['(array.indexOf(value) < 0 as any) ** 2;', '((!array.includes(value)) as any) ** 2;'],
	].map(([code, output]) => ({
		code, output, languageOptions: {parser: parsers.typescript}, errors: 1,
	})),
});

test.vue({
	valid: [],
	invalid: [
		...[
			'array /* keep */ .indexOf(value) > -1',
			'array /* keep */ .lastIndexOf(value) === -1',
			'array.indexOf(/* keep */ value) > -1',
			'array.indexOf(value) /* keep */ > -1',
		].map(expression => ({
			code: `<template><div v-if="${expression}"></div></template>`,
			errors: [{messageId: 'prefer-includes'}],
		})),
		{
			code: '<template><div v-if="/* keep */ array.indexOf(value) > -1"></div></template>',
			output: '<template><div v-if="/* keep */ array.includes(value)"></div></template>',
			errors: [{messageId: 'prefer-includes'}],
		},
	],
});
