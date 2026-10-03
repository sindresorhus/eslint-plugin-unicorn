import test from 'node:test';
import {Linter} from 'eslint';
import {isRegExpEscapeReplaceCall} from '../../rules/shared/regexp-escape.js';

const linter = new Linter();

const getResults = code => {
	const results = [];
	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: () => ({
							CallExpression(node) {
								results.push(isRegExpEscapeReplaceCall(node));
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

test('detects a manual `RegExp.escape()` replacement', t => {
	t.assert.deepStrictEqual(getResults(String.raw`string.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');`), [true]);
});

test('ignores a character class that ends with an escape character', t => {
	// `[]` is an empty class, so `\]` after it is not part of the class.
	t.assert.deepStrictEqual(getResults(String.raw`string.replace(/[]\]/g, '\\$&');`), [false]);
});
