import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['function f() {return(text.replaceAll("a", "x")).replaceAll("b", (/* keep */ "x"));}', 'function f() {return text.replaceAll(/[ab]/g, (/* keep */ "x"));}'],
		['function f() {throw(text.replaceAll("a", "x")).replaceAll("b", (/* keep */ "x"));}', 'function f() {throw text.replaceAll(/[ab]/g, (/* keep */ "x"));}'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [
		['getText(/* keep */).replaceAll("a", "x").replaceAll("b", "x");', 'getText(/* keep */).replaceAll(/[ab]/g, "x");'],
		['text.replaceAll("a", "x").replaceAll("b", (/* keep */ "x"));', 'text.replaceAll(/[ab]/g, (/* keep */ "x"));'],
		['(/* keep */ text).replaceAll("a", "x").replaceAll("b", "x");', '(/* keep */ text).replaceAll(/[ab]/g, "x");'],
		['({/* keep */ text: "ab"}.text.replaceAll("a", "x")).replaceAll("b", "x");', '({/* keep */ text: "ab"}.text).replaceAll(/[ab]/g, "x");'],
		['const result = ({/* keep */ text: "ab"}.text.replaceAll("a", "x")).replaceAll("b", "x");', 'const result = {/* keep */ text: "ab"}.text.replaceAll(/[ab]/g, "x");'],
		['function read() {\r\n  return (text // keep\r\n  ).replaceAll("a", "x").replaceAll("b", "x");\r\n}', 'function read() {\r\n  return (text // keep\r\n  ).replaceAll(/[ab]/g, "x");\r\n}'],
		['text.replaceAll("a", "x").replaceAll("b", ("x" // keep\r\n));', 'text.replaceAll(/[ab]/g, ("x" // keep\r\n));'],
		['before()\n;(/* keep */ text).replaceAll("a", "x").replaceAll("b", "x");', 'before()\n;(/* keep */ text).replaceAll(/[ab]/g, "x");'],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-single-replace'}]})),
});

test({
	valid: [],
	invalid: [
		['(text as /* keep */ string).replaceAll("a", "x").replaceAll("b", "x");', '(text as /* keep */ string).replaceAll(/[ab]/g, "x");'],
		['values[/* keep */ index]!.replaceAll("a", "x").replaceAll("b", "x");', 'values[/* keep */ index]!.replaceAll(/[ab]/g, "x");'],
	].map(([code, output]) => ({
		code, output, languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'prefer-single-replace'}],
	})),
});

test({
	valid: [],
	invalid: [
		'text.replaceAll(/* keep */ "a", "x").replaceAll("b", "x");',
		'text.replaceAll("a", (/* keep */ "x")).replaceAll("b", "x");',
		'text.replaceAll("a", "x").replaceAll(/* keep */ "b", "x");',
		'text.replaceAll("a", "x").replaceAll("b", /* keep */ "x");',
		'text.replaceAll("a", "x").replaceAll("b", "x" /* keep */);',
		'(/* keep */ text.replaceAll("a", "x")).replaceAll("b", "x");',
		'(text.replaceAll("a", "x") /* keep */).replaceAll("b", "x");',
		'getText(/* copied */).replaceAll("a", "x") /* keep */ .replaceAll("b", "x");',
	].map(code => ({code, errors: [{messageId: 'prefer-single-replace'}]})),
});

test.snapshot({
	valid: [
		// Not a chain
		'string.replaceAll(\'a\', \'-\');',
		'string.replace(/a/g, \'-\');',

		// Different replacements
		'string.replaceAll(\'a\', \'-\').replaceAll(\'b\', \'+\');',

		// Multi-character string search
		'string.replaceAll(\'ab\', \'-\').replaceAll(\'c\', \'-\');',

		// `String#replace()` with a string only replaces the first occurrence
		'string.replace(\'a\', \'-\').replace(\'b\', \'-\');',

		// Non-global regex
		'string.replace(/a/, \'-\').replace(/b/, \'-\');',

		// Unsafe flags
		'string.replaceAll(/a/gi, \'-\').replaceAll(/b/gi, \'-\');',
		'string.replaceAll(/a/gy, \'-\').replaceAll(/b/gy, \'-\');',
		'string.replaceAll(/a/gu, \'-\').replaceAll(/b/gu, \'-\');',

		// Regex that is not a single literal character
		'string.replace(/ab/g, \'-\').replace(/c/g, \'-\');',
		'string.replace(/./g, \'-\').replace(/a/g, \'-\');',
		String.raw`string.replace(/\d/g, '-').replace(/a/g, '-');`,
		'string.replace(/[ab]/g, \'-\').replace(/c/g, \'-\');',

		// Non-string replacement (could be side-effecting / re-evaluated)
		'string.replaceAll(\'a\', x).replaceAll(\'b\', x);',
		'string.replaceAll(\'a\', () => \'-\').replaceAll(\'b\', () => \'-\');',

		// Replacement reintroduces a searched character
		'string.replaceAll(\'a\', \'a\').replaceAll(\'b\', \'a\');',
		'string.replaceAll(\'a\', \'ab\').replaceAll(\'b\', \'ab\');',

		// Position-dependent replacement patterns (`$\`` prematch, `$'` postmatch)
		'string.replaceAll(\'a\', \'$`\').replaceAll(\'b\', \'$`\');',
		'string.replaceAll(\'a\', "$\'").replaceAll(\'b\', "$\'");',

		// `$&` reintroduces the match, which a later pass for the same character replaces again
		'string.replaceAll(\'a\', \'$&x\').replaceAll(\'a\', \'$&x\');',
		'string.replace(/a/g, \'$&x\').replaceAll(\'b\', \'$&x\').replace(/[a]/g, \'$&x\');',

		// Computed member
		'string[\'replaceAll\'](\'a\', \'-\')[\'replaceAll\'](\'b\', \'-\');',

		// Optional chaining
		'string?.replaceAll(\'a\', \'-\')?.replaceAll(\'b\', \'-\');',

		// Astral character is two UTF-16 code units
		'string.replaceAll(\'😀\', \'-\').replaceAll(\'b\', \'-\');',

		// A regular expression that the regex parser does not support
		'string.replace(/(?i:a)/g, \'-\').replace(/b/g, \'-\');',
	],
	invalid: [
		// Basic
		'string.replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\');',
		'string.replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\').replaceAll(\'c\', \'-\');',

		// Mixed `replace(/x/g)` and `replaceAll('x')`
		'string.replace(/a/g, \'-\').replaceAll(\'b\', \'-\');',
		'string.replaceAll(\'a\', \'-\').replace(/b/g, \'-\');',

		// Escaped regex character
		String.raw`string.replace(/\./g, '-').replaceAll('a', '-');`,

		// Characters that need escaping inside a character class
		'string.replaceAll(\']\', \'_\').replaceAll(\'^\', \'_\').replaceAll(\'-\', \'_\');',
		String.raw`string.replaceAll('\\', '_').replaceAll('a', '_');`,
		'string.replaceAll(\'/\', \'_\').replaceAll(\'a\', \'_\');',
		String.raw`string.replaceAll('\n', '_').replaceAll('a', '_');`,
		String.raw`string.replaceAll('\u2028', '_').replaceAll('a', '_');`,
		String.raw`string.replaceAll('\u2029', '_').replaceAll('a', '_');`,
		String.raw`string.replace(/\u2028/g, '_').replace(/\u2029/g, '_');`,

		// `^` is only escaped when it would be the first class character
		'string.replaceAll(\'^\', \'_\').replaceAll(\'a\', \'_\');',
		'string.replaceAll(\'a\', \'_\').replaceAll(\'^\', \'_\');',

		// `-` is only escaped when it would form a range
		'string.replaceAll(\'a\', \'_\').replaceAll(\'-\', \'_\').replaceAll(\'b\', \'_\');',
		'string.replaceAll(\'-\', \'_\').replaceAll(\'a\', \'_\');',

		// Empty replacement
		'string.replaceAll(\'a\', \'\').replaceAll(\'b\', \'\');',

		// `m`/`s` flags only affect `^`/`$`/`.`, so they are safe to drop
		'string.replace(/a/gm, \'-\').replace(/b/gm, \'-\');',
		'string.replace(/a/gs, \'-\').replaceAll(\'b\', \'-\');',

		// `$&` is the matched character in both forms when no character repeats
		String.raw`string.replace(/\[/g, '\\$&').replace(/\]/g, '\\$&');`,

		// Duplicate characters are deduped
		'string.replaceAll(\'a\', \'-\').replaceAll(\'a\', \'-\');',

		// Parenthesized base
		'(foo + bar).replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\');',

		// Boundary: only the same-replacement run collapses
		'string.replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\').replaceAll(\'c\', \'+\');',

		// Comment inside the chain (reported, not fixed)
		'string.replaceAll(\'a\', \'-\')/* comment */.replaceAll(\'b\', \'-\');',

		// TypeScript
		{code: '(string as string).replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\');', languageOptions: {parser: parsers.typescript}},

		// Control characters are escaped in the character class
		String.raw`string.replaceAll('\x01', '-').replaceAll('\x7F', '-');`,
	],
});

test({
	valid: [],
	invalid: [
		['({text: "ab"}.text.replaceAll("a", "x")).replaceAll("b", "x");', '({text: "ab"}.text).replaceAll(/[ab]/g, "x");'],
		['const text = ({text: "ab"}.text.replaceAll("a", "x")).replaceAll("b", "x");', 'const text = {text: "ab"}.text.replaceAll(/[ab]/g, "x");'],
		['({text: "ab"}.text).replaceAll("a", "x").replaceAll("b", "x");', '({text: "ab"}.text).replaceAll(/[ab]/g, "x");'],
		['const read = () => ({text: "ab"}.text.replaceAll("a", "x")).replaceAll("b", "x");', 'const read = () => ({text: "ab"}.text).replaceAll(/[ab]/g, "x");'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

nodeTest('merged replacement chains preserve object-prefix grouping', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-single-replace': rule}}},
		rules: {'unicorn/prefer-single-replace': 'error'},
	};
	const code = '({text: "abba"}.text.replaceAll("a", "x")).replaceAll("b", "x");';
	const {output, messages, fixed} = linter.verifyAndFix(code, config);
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
	t.assert.strictEqual(runInNewContext(output), 'xxxx');
	t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
});

nodeTest('commented replacement chains preserve results and evaluate the receiver once', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-single-replace': rule}}},
		rules: {'unicorn/prefer-single-replace': 'error'},
	};
	for (const code of [
		'getText(/* receiver */).replaceAll("a", "x").replaceAll("b", "x");',
		'getText(/* receiver */).replace(/a/g, "x").replaceAll("b", (/* replacement */ "x"));',
	]) {
		const {output, messages, fixed} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		for (const source of [code, output]) {
			let calls = 0;
			const result = runInNewContext(source, {
				getText() {
					calls++;
					return 'abba';
				},
			});
			t.assert.strictEqual(result, 'xxxx');
			t.assert.strictEqual(calls, 1);
		}

		for (const marker of ['/* receiver */', '/* replacement */']) {
			t.assert.strictEqual(output.split(marker).length, code.split(marker).length);
		}
	}
});

nodeTest('replacement chains preserve compact keyword boundaries and evaluate the receiver once', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-single-replace': rule}}},
		rules: {'unicorn/prefer-single-replace': 'error'},
	};
	const expression = '(getText(/* keep */).replaceAll("a", "x")).replaceAll("b", "x")';
	for (const [body, expected] of [
		[`return${expression};`, 'xxxx'],
		[`try {throw${expression};} catch (value) {return value;}`, 'xxxx'],
		[`return typeof${expression};`, 'string'],
		[`return void${expression};`, undefined],
		[`function* values() {yield${expression};} return values().next().value;`, 'xxxx'],
		[`switch ("xxxx") {case${expression}: return true; default: return false;}`, true],
		[`for (const value of${expression} ? [true] : [false]) {return value;}`, true],
		[`for (const key in${expression} ? {matched: true} : {}) {return key;}`, 'matched'],
	]) {
		const code = `function read() {${body}} read();`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output.split('/* keep */').length, 2);
		for (const source of [code, output]) {
			let evaluations = 0;
			const result = runInNewContext(source, {
				getText() {
					evaluations++;
					return 'abba';
				},
			});
			t.assert.strictEqual(result, expected);
			t.assert.strictEqual(evaluations, 1);
		}
	}
});

nodeTest('replacement chains preserve compact await boundaries', async t => {
	const code = 'async function read() {return await(getText(/* keep */).replaceAll("a", "x")).replaceAll("b", "x");} read();';
	const linter = new Linter();
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'prefer-single-replace': rule}}},
		rules: {'unicorn/prefer-single-replace': 'error'},
	});
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
	await Promise.all([code, output].map(async source => {
		t.assert.strictEqual(await runInNewContext(source, {getText: () => 'abba'}), 'xxxx');
	}));
});
