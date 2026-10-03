import test from 'node:test';
import {Linter} from 'eslint';
import {isCallExpression, isNewExpression} from '../../rules/ast/index.js';

const linter = new Linter();

const getResults = (code, getResult) => {
	const results = [];
	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: () => ({
							'CallExpression, NewExpression'(node) {
								results.push(getResult(node));
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

test('`optional: true` matches only optional calls', t => {
	t.assert.deepStrictEqual(getResults('foo?.(); foo();', node => isCallExpression(node, {optional: true})), [true, false]);
});

test('`isNewExpression` rejects the `optional` option', t => {
	for (const optional of [true, false]) {
		t.assert.throws(() => isNewExpression({type: 'NewExpression'}, {optional}), {
			name: 'TypeError',
			message: 'Cannot check node.optional in `isNewExpression`.',
		});
	}
});
