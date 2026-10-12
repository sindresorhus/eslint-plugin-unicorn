import test from 'node:test';
import {Linter} from 'eslint';
import {getReferencesInside} from '../../rules/utils/index.js';

/*
Return the names of the references inside the argument of each `inspect(…)` call.
*/
const getResults = code => {
	const results = [];
	const linter = new Linter();
	const messages = linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(getReferencesInside(node.arguments[0], context).map(reference => reference.identifier.name).toSorted((first, second) => first.localeCompare(second)));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return results;
};

test('includes references in nested scopes inside the node', t => {
	t.assert.deepStrictEqual(
		getResults('inspect(a + (b => b + c)(d) + function (e = f) { return e + g; }());'),
		// The default value writes `e`, and the body reads it
		[['a', 'b', 'c', 'd', 'e', 'e', 'f', 'g']],
	);
});

test('excludes references outside the node', t => {
	t.assert.deepStrictEqual(
		getResults('const before = () => outside1; inspect(inside); function after() { return outside2; }'),
		[['inside']],
	);
});

test('includes references when the node creates its own scope', t => {
	t.assert.deepStrictEqual(
		getResults('outside1; inspect(function (a = b) { return a + c; }); inspect(() => { const d = e; return d; }); outside2;'),
		[['a', 'a', 'b', 'c'], ['d', 'd', 'e']],
	);
});

test('excludes references in the same scope outside the node', t => {
	t.assert.deepStrictEqual(
		getResults('function wrapper() { outside1; inspect(inside1, inside2); outside2; }'),
		[['inside1']],
	);
});
