import {Linter} from 'eslint';
import test from 'ava';
import * as rules from '../../rules/index.js';
import {toEslintRules} from '../../rules/rule/index.js';
import parsers from '../utils/parsers.js';

/*
Every array rule resolves its receiver through one of three policies. Each rule's own test file covers its behavior in depth; this file pins the policy itself, so a rule cannot quietly switch groups.

- `shouldSkipKnownNonArrayReceiver`/`isKnownNonIndexedCollection`: skip a known non-array, but still report a typed array, which shares most of `Array`'s method surface.
- `isKnownNonArray`: skip a typed array too, because the report or its replacement does not apply to one.
- No receiver check at all: a non-array receiver is a documented target, so nothing is skipped.
*/

const linter = new Linter();
const eslintRules = toEslintRules(rules);

const isReported = (ruleName, code) => linter.verify(code, {
	languageOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		parser: parsers.typescript.implementation,
		parserOptions: parsers.typescript.mergeParserOptions(),
	},
	plugins: {unicorn: {rules: eslintRules}},
	rules: {[`unicorn/${ruleName}`]: 'error'},
}).length > 0;

// Each snippet declares `foo` separately, so the receiver type is the only thing that varies
const check = (t, ruleName, template, {typedArray}) => {
	for (const [label, declaration, expected] of [
		['an array', 'declare const foo: number[][];', true],
		['a typed array annotation', 'declare const foo: Uint8Array;', typedArray],
		['a typed array constructor call', 'const foo = new Uint8Array();', typedArray],
		['a `Set`', 'declare const foo: Set<number>;', false],
		['an unknown receiver', 'declare const foo: any;', true],
	]) {
		const code = `${declaration} ${template.replaceAll('RECEIVER', 'foo')}`;
		t.is(isReported(ruleName, code), expected, `${ruleName} with ${label}: ${code}`);
	}
};

test('rules that report a typed array receiver', t => {
	for (const [ruleName, template] of [
		['no-array-callback-reference', 'RECEIVER.map(callback);'],
		['no-array-front-mutation', 'RECEIVER.shift();'],
		['no-array-method-this-argument', 'RECEIVER.map(() => {}, thisArgument);'],
		['no-array-reduce', 'RECEIVER.reduce(fn, {});'],
		['no-array-reverse', 'const bar = RECEIVER.reverse();'],
		['no-array-sort', 'const bar = RECEIVER.sort();'],
		['no-array-sort-for-min-max', 'const bar = RECEIVER.toSorted((a, b) => a - b)[0];'],
		['no-boolean-sort-comparator', 'RECEIVER.sort((a, b) => a > b);'],
		['no-confusing-array-splice', 'RECEIVER.splice(index, 1, element);'],
		['no-confusing-array-with', 'RECEIVER.with(-1, value);'],
		['no-for-each', 'RECEIVER.forEach(value => console.log(value));'],
		['no-magic-array-flat-depth', 'RECEIVER.flat(2);'],
		['no-negated-array-predicate', 'const bar = !RECEIVER.some(element => test(element));'],
		['no-return-array-push', 'function f() { return RECEIVER.push(1); }'],
		['no-unnecessary-array-flat-depth', 'RECEIVER.flat(1);'],
		['no-unnecessary-array-flat-map', 'RECEIVER.flatMap(element => [element]);'],
		['no-unnecessary-array-splice-count', 'RECEIVER.splice(1, RECEIVER.length);'],
		['no-unnecessary-splice', 'RECEIVER.splice();'],
		['no-useless-length-check', 'const bar = RECEIVER.length === 0 || RECEIVER.every(Boolean);'],
		['prefer-array-find', 'const bar = RECEIVER.filter(fn)[0];'],
		['prefer-array-flat-map', 'const bar = RECEIVER.map(fn).flat();'],
		['prefer-array-some', 'const bar = RECEIVER.filter(fn).length > 0;'],
		// Only the `.some()` path goes through the receiver check, the `.indexOf()` path is covered by the last test
		['prefer-includes', 'const bar = RECEIVER.some(element => element === value);'],
		['prefer-simple-sort-comparator', 'RECEIVER.sort((a, b) => a > b ? 1 : -1);'],
		['prefer-single-array-predicate', 'if (RECEIVER.some(e => e === 1) || RECEIVER.some(e => e === 2)) {}'],
		['prefer-single-call', 'RECEIVER.push(1); RECEIVER.push(2);'],
		['require-array-join-separator', 'RECEIVER.join();'],
	]) {
		check(t, ruleName, template, {typedArray: true});
	}
});

test('rules that skip a typed array receiver', t => {
	for (const [ruleName, template] of [
		// `TypedArray#fill()` coerces the value to a number, so no element can share the reference
		['no-array-fill-with-reference-type', 'RECEIVER.fill({});'],
		// The replacement calls `flat()`, which a typed array does not have
		['prefer-array-flat', 'RECEIVER.reduce((a, b) => a.concat(b), []);'],
		// A typed array has no `splice()` to report in the first place
		['prefer-array-slice', 'const bar = RECEIVER.splice(1)[0];'],
		// `TypedArray#sort()` already sorts numerically, so it needs no comparator
		['require-array-sort-compare', 'RECEIVER.sort();'],
	]) {
		check(t, ruleName, template, {typedArray: false});
	}
});

test('a class that extends `Array` is only resolved by rules that opt into class heritage', t => {
	const subclass = 'class Foo extends Array {} const foo = new Foo();';

	// `no-array-callback-reference` passes `checkClassSyntax` and `checkClassHeritage`, so it resolves the heritage
	t.true(isReported('no-array-callback-reference', `${subclass} foo.map(callback);`));
	t.false(isReported('no-array-callback-reference', 'class Foo extends Set {} const foo = new Foo(); foo.forEach(callback);'));

	/*
	`shouldSkipKnownNonArrayReceiver` does not, so it counts every `new Foo()` other than `new Array()` as a non-array and skips the call. `Array` subclasses are out of scope, see the philosophy section in `AGENTS.md`.
	*/
	t.false(isReported('prefer-single-call', `${subclass} foo.push(1); foo.push(2);`));
	t.false(isReported('no-array-sort', `${subclass} const bar = foo.sort();`));
});

test('rules whose target is not limited to arrays skip nothing', t => {
	for (const [ruleName, template] of [
		// `String#slice()` takes the same arguments
		['no-unnecessary-slice-end', 'const bar = RECEIVER.slice(1, RECEIVER.length);'],
		// `String#indexOf()` and `String#includes()` are an equally valid target
		['prefer-includes', 'const bar = RECEIVER.indexOf(element) !== -1;'],
	]) {
		for (const [label, declaration] of [
			['an array', 'declare const foo: number[];'],
			['a typed array', 'declare const foo: Uint8Array;'],
			['a string', 'declare const foo: string;'],
			['an unknown receiver', 'declare const foo: any;'],
		]) {
			const code = `${declaration} ${template.replaceAll('RECEIVER', 'foo')}`;
			t.true(isReported(ruleName, code), `${ruleName} with ${label}: ${code}`);
		}
	}
});
