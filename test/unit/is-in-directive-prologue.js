import test from 'node:test';
import {Linter} from 'eslint';
import {isInDirectivePrologue} from '../../rules/ast/index.js';

const linter = new Linter();

const getResults = (code, sourceType = 'script') => {
	const results = [];
	linter.verify(code, {
		languageOptions: {ecmaVersion: 'latest', sourceType},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: () => ({
							'Literal[value="marker"], TemplateLiteral, BinaryExpression'(node) {
								results.push(isInDirectivePrologue(node));
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

test('detects expressions in the directive prologue of a script, module, or function', t => {
	t.assert.deepStrictEqual(getResults('\'marker\';'), [true]);
	t.assert.deepStrictEqual(getResults('`template`;'), [true]);
	t.assert.deepStrictEqual(getResults('\'use strict\'; \'a\' + \'b\';'), [true]);
	t.assert.deepStrictEqual(getResults('\'marker\';', 'module'), [true]);
	t.assert.deepStrictEqual(getResults('function foo() { \'use strict\'; `template`; }'), [true]);
	t.assert.deepStrictEqual(getResults('const foo = () => { \'a\' + \'b\'; };'), [true]);
	t.assert.deepStrictEqual(getResults('class A { method() { `template`; } }'), [true]);
});

test('ignores expressions after the directive prologue or outside a statement position', t => {
	t.assert.deepStrictEqual(getResults('foo(); \'a\' + \'b\';'), [false]);
	t.assert.deepStrictEqual(getResults('function foo() { foo(); `template`; }'), [false]);
	t.assert.deepStrictEqual(getResults('{ `template`; }'), [false]);
	t.assert.deepStrictEqual(getResults('if (a) { `template`; }'), [false]);
	t.assert.deepStrictEqual(getResults('foo(`template`);'), [false]);
	t.assert.deepStrictEqual(getResults('(\'a\' + \'b\').length;'), [false]);
	t.assert.deepStrictEqual(getResults('const foo = () => `template`;'), [false]);
});
