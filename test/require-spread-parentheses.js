import {test as nodeTest} from 'node:test';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);
const jsxLanguageOptions = {parserOptions: {ecmaFeatures: {jsx: true}}};

test.snapshot({
	valid: [
		'const object = {a, ...(x && y)};',
		'const array = [a, ...((x ? y : z))];',
		'fn(...(first + second));',
		'fn(...source?.values());',
		'const object = {...{value: first + second}};',
		'const [first, ...rest] = values;',
		'const object = {...(first, second)};',
		'const object = {...(await load())};',
		'fn(...(args ??= fallback));',
		{code: '<Component {...(condition ? first : second)} />;', languageOptions: jsxLanguageOptions},
		{code: 'fn(...(source as string[]));', languageOptions: {parser: parsers.typescript}},
		{code: '<Component {...await load()} />;', languageOptions: jsxLanguageOptions},
		{code: 'function* render() { return <Component {...yield props} />; }', languageOptions: jsxLanguageOptions},
		{code: '<template><Component :items="[...&#40;primary || fallback&#41;]" /></template>', languageOptions: {parser: parsers.vue}},
	],
	invalid: [
		'const object = {a, ...x && y};',
		'const array = [a, ...x ? y : z];',
		'fn?.(...first ?? second);',
		'new Example(...first + second);',
		'fn(...(first) || (second));',
		'fn(...// choose\r\n  first ?? /* fallback */ second /* keep */);',
		'fn(.../** @type {string} */ /* keep */ first + second);',
		{code: '<Component {...condition && props} />;', languageOptions: jsxLanguageOptions},
		{code: 'fn(...(first as string[]) ?? second!);', languageOptions: {parser: parsers.typescript}},
		'fn(...args = load());',
		'fn(...args ??= fallback);',
		{code: 'const letters = [...prefix + suffix as string];', languageOptions: {parser: parsers.typescript}},
		{code: 'fn(...source satisfies string[]);', languageOptions: {parser: parsers.typescript}},
		'const object = {...await load()};',
		'function* collect() { return [...yield* source]; }',
		'function* collect() { return fn(...yield); }',
		{code: 'fn(...<string[]>source);', languageOptions: {parser: parsers.typescript}},
		{code: '<Component {...record(), props} />;', languageOptions: {...jsxLanguageOptions, parser: parsers.typescript}},
		{
			code: '<script setup>const items = [...primary ?? fallback];</script>\n<template><Component :items="[...primary ?? fallback]" /></template>',
			languageOptions: {parser: parsers.vue},
		},
		{code: '<template><Component v-bind="{...flag &amp;&amp; props}" /></template>', languageOptions: {parser: parsers.vue}},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'fn(... items ?? fallback);',
			output: 'fn(... (items ?? fallback));',
			errors: 1,
		},
		{
			code: 'const values = [...\n// @ts-expect-error: Intentionally non-iterable.\n1 + 2];',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'const values = [\n// @ts-expect-error: Intentionally non-iterable.\n...1 + 2];',
			output: 'const values = [\n// @ts-expect-error: Intentionally non-iterable.\n...(1 + 2)];',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'const values = [...\n/* explanation */\n/* @ts-ignore */\n1 + 2];',
			errors: 1,
		},
	],
});

nodeTest('fixes both spread arguments when their fixes overlap', t => {
	const linter = new Linter();
	const {output, messages} = linter.verifyAndFix('fn(...condition ? [...first || second] : third);', {
		plugins: {unicorn: {rules: {'require-spread-parentheses': rule}}},
		rules: {'unicorn/require-spread-parentheses': 'error'},
	});

	t.assert.strictEqual(output, 'fn(...(condition ? [...(first || second)] : third));');
	t.assert.deepStrictEqual(messages, []);
});
