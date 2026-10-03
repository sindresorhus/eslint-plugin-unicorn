import test from 'node:test';
import {Linter} from 'eslint';
import {toLocation} from '../../rules/utils/index.js';

const linter = new Linter();

test('accepts a node or a range', t => {
	let locations;

	linter.verify('foo;\nbar;', {
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'Identifier[name="bar"]'(node) {
								locations = [
									toLocation(node, context),
									toLocation([5, 8], context, 1, -1),
								];
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});

	t.assert.deepStrictEqual(locations, [
		{start: {line: 2, column: 0}, end: {line: 2, column: 3}},
		{start: {line: 2, column: 1}, end: {line: 2, column: 2}},
	]);
});
