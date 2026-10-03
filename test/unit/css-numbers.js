import test from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import getCssNumbers from '../../rules/shared/css-numbers.js';

const linter = new Linter();

test('reads the numbers of the root node, which has no parent', t => {
	let raws;

	linter.verify('a { width: 1.5px; height: 2px; }', {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {
			css,
			test: {
				rules: {
					capture: {
						meta: {languages: ['css/css']},
						create: context => ({
							StyleSheet(node) {
								raws = getCssNumbers(node, context).map(({raw}) => raw);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.css'});

	t.assert.deepStrictEqual(raws, ['1.5', '2']);
});
