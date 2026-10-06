import test from 'node:test';
import {Linter} from 'eslint';
import {getTypeArgumentsText, hasSameTypeArguments, hasTypeArguments} from '../../rules/utils/type-arguments.js';
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
					capture: {
						create: context => ({
							'CallExpression, NewExpression, TaggedTemplateExpression'(node) {
								results.push([hasTypeArguments(node), getTypeArgumentsText(node, context)]);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	return results;
};

test('type arguments of calls, `new` expressions, and tagged templates', t => {
	t.assert.deepStrictEqual(getResults('foo<string>();'), [[true, '<string>']]);
	t.assert.deepStrictEqual(getResults('new Promise<A, B>(() => {});'), [[true, '<A, B>']]);
	t.assert.deepStrictEqual(getResults('tag<Foo>`text`;'), [[true, '<Foo>']]);
	t.assert.deepStrictEqual(getResults('foo();'), [[false, '']]);
	t.assert.deepStrictEqual(getResults('new Foo;'), [[false, '']]);
});

const getComparison = (left, right) => {
	let result;
	linter.verify(`condition ? ${left} : ${right};`, {
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							ConditionalExpression(node) {
								result = hasSameTypeArguments(node.consequent, node.alternate, context);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	return result;
};

test('compares type argument tokens without whitespace or comments', t => {
	t.assert.strictEqual(getComparison('foo<Result<string>>()', 'bar< Result < string > >()'), true);
	t.assert.strictEqual(getComparison('new Foo<A, B>()', 'new Bar<A, /* comment */ B>()'), true);
	t.assert.strictEqual(getComparison('tag<Foo>`text`', 'other< Foo >`other`'), true);
	t.assert.strictEqual(getComparison('foo<A>()', 'bar<B>()'), false);
	t.assert.strictEqual(getComparison('foo<A, B>()', 'bar<A>()'), false);
	t.assert.strictEqual(getComparison('foo<A | B>()', 'bar<A & B>()'), false);
});

test('distinguishes missing and explicit type arguments', t => {
	t.assert.strictEqual(getComparison('foo()', 'bar()'), true);
	t.assert.strictEqual(getComparison('new Foo', 'new Bar()'), true);
	t.assert.strictEqual(getComparison('foo<A>()', 'bar()'), false);
	t.assert.strictEqual(getComparison('foo()', 'bar<A>()'), false);
});
