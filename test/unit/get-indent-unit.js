import {Linter} from 'eslint';
import test from 'ava';
import outdent from 'outdent';
import getIndentUnit from '../../rules/utils/get-indent-unit.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const getIndentUnitOf = (code, {jsx = false} = {}) => {
	const results = [];
	linter.verify(code, {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			...(jsx && {parserOptions: {ecmaFeatures: {jsx: true}}}),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							Program() {
								results.push(getIndentUnit(context), getIndentUnit(context));
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

	if (results.length !== 2) {
		throw new Error('Expected the capture rule to run once.');
	}

	if (results[0] !== results[1]) {
		throw new Error('Expected the same unit on a repeated call.');
	}

	return results[0];
};

test('detects tabs', t => {
	t.is(getIndentUnitOf(outdent`
		function foo() {
		\tif (bar) {
		\t\tbaz();
		\t}
		}
	`), '\t');
});

test('detects two spaces', t => {
	t.is(getIndentUnitOf(outdent`
		function foo() {
		  if (bar) {
		    baz();
		  }
		}
	`), '  ');
});

test('detects four spaces', t => {
	t.is(getIndentUnitOf(outdent`
		function foo() {
		    if (bar) {
		        baz();
		    }
		}
	`), ' '.repeat(4));
});

test('detects an unusual space count', t => {
	t.is(getIndentUnitOf(outdent`
		function foo() {
		   if (bar) {
		      baz();
		   }
		}
	`), ' '.repeat(3));
});

test('falls back to a tab when nothing is indented', t => {
	t.is(getIndentUnitOf(''), '\t');
	t.is(getIndentUnitOf('foo();'), '\t');
	t.is(getIndentUnitOf('foo();\nbar();\n'), '\t');
	t.is(getIndentUnitOf('function foo() { bar(); }'), '\t');
});

test('picks the most common unit in a mixed file', t => {
	t.is(getIndentUnitOf(outdent`
		function foo() {
		  if (bar) {
		    baz();
		  }
		  if (qux) {
		    quux();
		  }
		}
		function tabbed() {
		\tbar();
		}
	`), '  ');
	t.is(getIndentUnitOf(outdent`
		function spaced() {
		  bar();
		}
		function foo() {
		\tif (bar) {
		\t\tbaz();
		\t}
		\tif (qux) {
		\t\tquux();
		\t}
		}
	`), '\t');
});

test('keeps a single tab when tab-indented lines jump two levels', t => {
	t.is(getIndentUnitOf(outdent`
		switch (foo) {
		\t\tcase 1:
		\t\t\t\tbar();
		}
	`), '\t');
});

test('reports the step it sees when space-indented lines jump two levels', t => {
	t.is(getIndentUnitOf(outdent`
		switch (foo) {
		    case 1:
		        bar();
		}
	`), ' '.repeat(4));
});

test('ignores the inside of template literals', t => {
	t.is(getIndentUnitOf(outdent`
		function foo() {
		  return \`
		\t\t\tone
		\t\t\ttwo
		\t\t\tthree
		\t\t\tfour
		  \`;
		}
	`), '  ');
	t.is(getIndentUnitOf(outdent`
		const text = \`
		    one
		    two
		    three
		\`;
	`), '\t');
});

test('ignores the inside of block comments', t => {
	t.is(getIndentUnitOf(outdent`
		/*
		    one
		    two
		    three
		    four
		*/
		function foo() {
		\tbar();
		}
	`), '\t');
	t.is(getIndentUnitOf(outdent`
		/**
		    Documentation.
		    More documentation.
		    Even more documentation.
		*/
		function foo() {
		  bar();
		}
	`), '  ');
});

test('ignores the inside of multi-line strings', t => {
	t.is(getIndentUnitOf(outdent`
		const text = 'one \\
		    two \\
		    three \\
		    four';
		function foo() {
		\tbar();
		}
	`), '\t');
});

test('ignores the inside of JSX text', t => {
	t.is(getIndentUnitOf(outdent`
		const element = <p>
		    one
		    two
		    three
		    four
		</p>;
		function foo() {
		\tbar();
		}
	`, {jsx: true}), '\t');
});

test('does not count code that lies on a token-continuation line as indentation', t => {
	// The closing backtick sits on an indented line, but that line belongs to the template literal.
	t.is(getIndentUnitOf(outdent`
		const text = \`
		    one
		    two
		    three
		        \`;
		function foo() {
		\tbar();
		}
	`), '\t');
});

test('uses the first line of a multi-line token', t => {
	// The opening line of a template literal or comment follows the file's indentation.
	t.is(getIndentUnitOf(outdent`
		function foo() {
		  const text = \`
		\t\tone
		\t\ttwo
		\t\tthree
		  \`;
		  /* one
		\t\ttwo */
		}
	`), '  ');
});

test('handles CRLF line endings', t => {
	t.is(getIndentUnitOf('function foo() {\r\n  if (bar) {\r\n    baz();\r\n  }\r\n}\r\n'), '  ');
	t.is(getIndentUnitOf('function foo() {\r\n\tif (bar) {\r\n\t\tbaz();\r\n\t}\r\n}\r\n'), '\t');
});

test('detects indentation in TypeScript', t => {
	const results = [];
	linter.verify(outdent`
		interface Foo {
		  bar: string;
		  baz(): void;
		}
	`, {
		languageOptions: {
			parser: parsers.typescript.implementation,
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							Program() {
								results.push(getIndentUnit(context));
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
	t.deepEqual(results, ['  ']);
});
