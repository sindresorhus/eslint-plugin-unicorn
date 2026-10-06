import test from 'node:test';
import {Linter} from 'eslint';
import {isInTypeQuery} from '../../rules/ast/index.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const getResults = code => {
	const results = [];
	linter.verify(code, {
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: () => ({
							'Identifier[name="marker"], ThisExpression'(node) {
								results.push(isInTypeQuery(node));
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

test('detects names in a TypeScript type query', t => {
	t.assert.deepStrictEqual(getResults('type A = typeof marker;'), [true]);
	t.assert.deepStrictEqual(getResults('type A = typeof marker.foo.bar;'), [true]);
	t.assert.deepStrictEqual(getResults('type A = typeof foo.marker;'), [true]);
	t.assert.deepStrictEqual(getResults('let a: typeof this.foo;'), [true]);
});

test('ignores runtime references', t => {
	t.assert.deepStrictEqual(getResults('typeof marker;'), [false]);
	t.assert.deepStrictEqual(getResults('marker.foo;'), [false]);
	t.assert.deepStrictEqual(getResults('type A = marker.Foo;'), [false]);
	t.assert.deepStrictEqual(getResults('const a = this;'), [false]);
});
