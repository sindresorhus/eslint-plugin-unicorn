import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: ['&& ready', '? 1 : 2', 'as boolean', 'satisfies boolean'].map(wrapper => ({
		code: `function* foo(array) { yield !\narray.every(value => value) ${wrapper}; }`,
		languageOptions: {parser: parsers.typescript},
	})),
	invalid: [
		...[
			'return !\narray.every(value => value)',
			'return !\narray.every(value => value) && ready',
			'throw !\narray.every(value => value) && ready',
		].map(expression => ({
			code: `<template><button @click="() => { ${expression}; }"></button></template>`,
			languageOptions: {parser: parsers.vue},
			errors: 1,
		})),
		...['return', 'throw'].map(keyword => ({
			code: `function foo(array, ready) { ${keyword} !\narray.every(value => value) && ready; }`,
			output: `function foo(array, ready) { ${keyword} ( \narray.some(value => !value) && ready); }`,
			errors: 1,
		})),
		{
			code: 'function* foo(array) { yield (!\narray.every(value => value)) as boolean; }',
			output: 'function* foo(array) { yield (\narray.some(value => !value)) as boolean; }',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'function* foo(array) { yield <boolean>!\narray.every(value => value); }',
			output: 'function* foo(array) { yield <boolean>\narray.some(value => !value); }',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

test.vue({
	valid: [],
	invalid: [
		...[
			'<template><button @click="setup()\n![1].every(value => value > 0)"></button></template>',
			'<template><button @click="setup()\n!([1].every(value => value > 0))"></button></template>',
			'<template><div>{{ (() => { setup()\n![1].every(value => value > 0) })() }}</div></template>',
			'<template><button @click="return!array.some(value => value)"></button></template>',
		].map(code => ({code, errors: 1})),
		{
			code: '<template><button @click="() => !array.every(value => value)"></button></template>',
			output: '<template><button @click="() => array.some(value => !value)"></button></template>',
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [
		'array.some(element => test(element));',
		'array.every(element => test(element));',
		'!array.some(Boolean);',
		'!array.every(Boolean);',
		'!array["some"](element => test(element));',
		'!array.some(...predicates);',
		'!array?.some(element => test(element));',
		'!array.some?.(element => test(element));',
		'!"foo".some(element => test(element));',
		'!new Collection().some(element => test(element));',
		'!array.some(element => { return; });',
		'!array.some(element => { if (foo) { return true; } return test(element); });',
		'!array.some(async element => test(element));',
		'!array.some(function * (element) { return test(element); });',
		outdent`
			function * foo() {
				yield!
					array.some(element => test(element));
			}
		`,
		{
			code: '!array.some((element): boolean => test(element));',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some((element): element is string => typeof element === "string");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(function <T>(element) { return test(element); });',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some<string>(element => test(element));',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'!array.some(element => test(element));',
		'!array.every(element => test(element));',
		'!array.some(element => !test(element));',
		'!array.every(element => !test(element));',
		'!array.some(element => !({}));',
		'!array.some(element => !((foo, bar)));',
		'!array.some((element) => (test(element)));',
		'!array.some(element => ({}));',
		'!array.some(element => element.foo && element.bar);',
		'!array.some(element => element.foo ? element.bar : element.baz);',
		'!array.some(element => /* before */ test(element));',
		'!array.some(element => test(element) /* after */);',
		'!array.some(element => { return test(element); });',
		'!array.some(element => { return !({}); });',
		'!array.every(function (element) { return test(element); });',
		'!array.some(function (element) { return !test(element); }, thisArgument);',
		'if (!array.some(element => test(element))) {}',
		'const isMissing = !array.some(element => test(element));',
		'Boolean(!array.every(element => test(element)));',
		'foo(!array.some(element => test(element)));',
		'!((array.some(element => test(element))));',
		outdent`
			foo
			!array.some(element => test(element))
		`,
		outdent`
			foo()
			![].some(element => test(element))
		`,
		outdent`
			function foo() {
				return!array.some(element => test(element));
			}
		`,
		outdent`
			function foo() {
				return!
					array.some(element => test(element));
			}
		`,
		outdent`
			function foo() {
				throw!array.some(element => test(element));
			}
		`,
		outdent`
			function foo() {
				throw!
					array.some(element => test(element));
			}
		`,
		{
			code: '!array.some(element => element!.enabled);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(element => (element as Item).enabled);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(element => (element satisfies Item).enabled);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(element => element as unknown);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '!array.some(element => element satisfies unknown);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<template><div v-if="!array.some(element => test(element))"></div></template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<template><div v-if="![].some(element => test(element))"></div></template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<template><div v-if="!(array.some(element => test(element)))"></div></template>',
			languageOptions: {parser: parsers.vue},
		},
		// A typed array shares `Array#some()` and `Array#every()`
		{
			code: 'function f(array: Int8Array) { return !array.some(element => test(element)); }',
			languageOptions: {parser: parsers.typescript},
		},
		'!array.some(element => !{foo: element}.foo);',
		{
			code: '<template><div v-if="!array.some(element => (test(element)))"></div></template>',
			languageOptions: {parser: parsers.vue},
		},
		'!array.some(element => test(/* comment */ element));',
		'! /* comment */ array.some(element => test(element));',
		{
			code: '<template>{{ ! /* comment */ array.some(element => test(element)) }}</template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<template><div :class="!array.some(element => !/* comment */element)" /></template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<template>{{ !array.every(element => test(/* comment */ element)) }}</template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<template>{{ !array.every(element => (/* keep */ element)) }}</template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<template>{{ !array.some(element => (((element /* keep */)))) }}</template>',
			languageOptions: {parser: parsers.vue},
		},
		'!array.every(element => ((/* before */ element /* after */)));',
		{
			code: '<template>{{ !array.every(element => /* before */ (element) /* after */) }}</template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<template>{{ !array.some(element => { /* keep */ return test(element); }) }}</template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: '<template>{{ !array.some(element => { return test(/* keep */ element); }) }}</template>',
			languageOptions: {parser: parsers.vue},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'previous()\n![].some(item => // keep\ncheck(item));',
			output: 'previous()\n;[].every(item => // keep\n!check(item));',
			errors: [{messageId: 'no-negated-array-predicate'}],
		},
		// TypeScript: the `!` is inside the non-null assertion
		{
			code: 'const a = !foo.every(x => x.b)!;',
			output: 'const a = foo.some(x => !x.b)!;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'const a = !foo.some(x => x.b)!;',
			output: 'const a = foo.every(x => !x.b)!;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'const a = !(foo.every(x => x.b) as boolean);',
			output: 'const a = (foo.some(x => !x.b) as boolean);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: '<script>const value = ![].some(element => test(element));</script><template>{{ !array.every(element => test(/* keep */ element)) }}</template>',
			output: '<script>const value = [].every(element => !test(element));</script><template>{{ !array.every(element => test(/* keep */ element)) }}</template>',
			filename: 'file.vue',
			languageOptions: {parser: parsers.vue},
			errors: [
				{messageId: 'no-negated-array-predicate'},
				{messageId: 'no-negated-array-predicate'},
			],
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		{
			code: '{!array.some(element => test(/* keep */ element))}',
			filename: 'file.svelte',
			languageOptions: {parser: parsers.svelte},
		},
		{
			code: '<!-- keep -->{!array.some(element => test(element))}',
			filename: 'file.svelte',
			languageOptions: {parser: parsers.svelte},
		},
	],
});

test({
	valid: [],
	invalid: [
		...[
			['!{array: [1]}.array.some(value => value);', '({array: [1]}.array.every(value => !value));'],
			['const value = !{array: [1]}.array.some(value => value);', 'const value = {array: [1]}.array.every(value => !value);'],
			['const read = () => !{array: [1]}.array.some(value => value);', 'const read = () => ({array: [1]}.array.every(value => !value));'],
			['(!{array: [1]}.array.some(value => value));', '({array: [1]}.array.every(value => !value));'],
			['!({array: [1]}.array.some(value => value));', '({array: [1]}.array.every(value => !value));'],
			['setup()\n!{array: [1]}.array.some(value => value);', 'setup()\n;({array: [1]}.array.every(value => !value));'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: '<template><button @click="setup()\n!{array:[1]}.array.some(value => value)"></button></template>',
			languageOptions: {parser: parsers.vue},
			errors: 1,
		},
	],
});
