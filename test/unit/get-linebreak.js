import {Linter} from 'eslint';
import test from 'ava';
import getLinebreak from '../../rules/utils/get-linebreak.js';

const linter = new Linter();

const getLinebreakOf = code => {
	let result;
	linter.verify(code, {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							Program() {
								result = getLinebreak(context);
							},
						}),
					},
				},
			},
		},
		rules: {
			'test/capture': 'error',
		},
	});

	return result;
};

test('returns the line ending the file uses', t => {
	t.is(getLinebreakOf('foo();\nbar();\n'), '\n');
	t.is(getLinebreakOf('foo();\r\nbar();\r\n'), '\r\n');
	t.is(getLinebreakOf('foo();\rbar();\r'), '\r');
	t.is(getLinebreakOf('foo();\u2028bar();'), '\u2028');
	t.is(getLinebreakOf('foo();\u2029bar();'), '\u2029');
});

test('uses the first line ending in a file with mixed line endings', t => {
	t.is(getLinebreakOf('foo();\r\nbar();\nbaz();\n'), '\r\n');
	t.is(getLinebreakOf('foo();\nbar();\r\nbaz();\r\n'), '\n');
});

test('falls back to `\\n` for a single-line file', t => {
	t.is(getLinebreakOf(''), '\n');
	t.is(getLinebreakOf('foo();'), '\n');
});

test('does not mistake an escaped `\\n` in a string for a line ending', t => {
	t.is(getLinebreakOf(String.raw`const text = 'foo\nbar';` + '\r\nbar();'), '\r\n');
});

test('counts a line ending inside a template literal', t => {
	// It is still the file's line ending
	t.is(getLinebreakOf('const text = `foo\r\nbar`;\nbar();'), '\r\n');
});
