import test from 'node:test';
import {Linter} from 'eslint';
import {getTypeArgumentsText, hasTypeArguments} from '../../rules/utils/type-arguments.js';
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
