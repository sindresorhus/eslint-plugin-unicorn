import test from 'node:test';
import {Linter} from 'eslint';
import {isArrowFunctionBody} from '../../rules/ast/index.js';

const linter = new Linter();

const getResults = code => {
	const results = [];
	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: () => ({
							'Identifier[name="marker"]'(node) {
								results.push(isArrowFunctionBody(node));
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

test('detects the expression body of an arrow function', t => {
	t.assert.deepStrictEqual(getResults('const function_ = () => marker;'), [true]);
});

test('ignores arrow function parameters and nodes outside arrow functions', t => {
	t.assert.deepStrictEqual(getResults('const function_ = marker => value;'), [false]);
	t.assert.deepStrictEqual(getResults('const function_ = () => { marker; };'), [false]);
	t.assert.deepStrictEqual(getResults('foo(marker);'), [false]);
});
