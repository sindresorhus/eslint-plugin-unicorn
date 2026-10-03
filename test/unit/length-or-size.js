import test from 'node:test';
import {Linter} from 'eslint';
import {isKnownNonCollectionLengthOrSize} from '../../rules/utils/length-or-size.js';
import {DEFAULT_LANGUAGE_OPTIONS} from '../utils/language-options.js';

const linter = new Linter();

/*
Return whether the first argument of each `check()` call in `code` is a known non-collection `.length` or `.size`.
*/
const getVerdicts = code => {
	const verdicts = [];

	const messages = linter.verify(code, {
		languageOptions: DEFAULT_LANGUAGE_OPTIONS,
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'CallExpression[callee.name="check"]'(node) {
								verdicts.push(isKnownNonCollectionLengthOrSize(node.arguments[0], context));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return verdicts;
};

test('a static length that is not a non-negative integer', t => {
	t.assert.deepStrictEqual(getVerdicts('check(({length: -1}).length);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(({length: 1.5}).length);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check([1, 2].length);'), [false]);
});

test('a computed key that cannot be resolved is an unknown mutation', t => {
	t.assert.deepStrictEqual(getVerdicts('const foo = {length: 1}; Object.assign(foo, {length: 2, [key]: 3}); check(foo.length);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('const foo = {length: 1}; Object.assign(foo, {[key]: 3}); check(foo.length);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('const foo = {length: 1}; Object.defineProperties(foo, {[key]: {value: -1}}); check(foo.length);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('const foo = {length: 1}; Object.assign(foo, {[\'length\']: 2}); check(foo.length);'), [false]);
	t.assert.deepStrictEqual(getVerdicts('const foo = {length: 1}; Object.assign(foo, {[\'other\']: 2}); check(foo.length);'), [false]);
});

test('mutations without a known assigned value are unknown', t => {
	for (const mutation of [
		'foo.length++;',
		'foo.length += 1;',
		'[[foo.length]] = [];',
		'[foo.length] = bar;',
		'({length: foo.length} = bar);',
	]) {
		const code = `const foo = {length: 1}; ${mutation} check(foo.length);`;
		t.assert.deepStrictEqual(getVerdicts(code), [true], code);
	}
});

test('a destructuring assignment with a known value is a known mutation', t => {
	t.assert.deepStrictEqual(getVerdicts('const foo = {length: 1}; [foo.length] = [2]; check(foo.length);'), [false]);
	t.assert.deepStrictEqual(getVerdicts('const foo = {length: 1}; ({length: foo.length} = {length: 2}); check(foo.length);'), [false]);
});

test('calling the property is not a read', t => {
	for (const call of [
		'foo.length();',
		'new foo.length();',
		'foo.length``;',
	]) {
		const code = `const foo = {length: 1}; ${call} check(foo.length);`;
		t.assert.deepStrictEqual(getVerdicts(code), [false], code);
	}
});
