import test from 'node:test';
import {Linter} from 'eslint';
import {getStaticPropertyName} from '../../rules/utils/index.js';

const linter = new Linter();

const getResults = code => {
	const results = [];
	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'MemberExpression, Property'(node) {
								results.push(getStaticPropertyName(node, context));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	});
	return results;
};

test('`getStaticPropertyName` returns static member and property key names', t => {
	t.assert.deepStrictEqual(getResults('foo.bar;'), ['bar']);
	t.assert.deepStrictEqual(getResults('foo["bar"];'), ['bar']);
	t.assert.deepStrictEqual(getResults('foo[`bar`];'), ['bar']);
	t.assert.deepStrictEqual(getResults('foo["b" + "ar"];'), ['bar']);
	t.assert.deepStrictEqual(getResults('foo[0];'), ['0']);
	t.assert.deepStrictEqual(getResults('({bar: 1, ["baz"]: 2});'), ['bar', 'baz']);
});

test('`getStaticPropertyName` returns `undefined` for unknown names', t => {
	t.assert.deepStrictEqual(getResults('foo[bar];'), [undefined]);
	t.assert.deepStrictEqual(getResults('foo[`${bar}`];'), [undefined]); // eslint-disable-line no-template-curly-in-string
	t.assert.deepStrictEqual(getResults('class Foo { #bar; method() { this.#bar; } }'), [undefined]);
});

test('`getStaticPropertyName` returns `undefined` when the computed key has side effects', t => {
	t.assert.deepStrictEqual(getResults('foo[(sideEffect(), "bar")];'), [undefined]);
	t.assert.deepStrictEqual(getResults('({[(sideEffect(), "bar")]: 1});'), [undefined]);
});
