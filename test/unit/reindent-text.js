import test from 'node:test';
import reindentText from '../../rules/utils/reindent-text.js';

test('replaces the source indentation with the target indentation on every line after the first', t => {
	t.assert.strictEqual(reindentText('foo(\n\t\tbar,\n\t);', '\t', ''), 'foo(\n\tbar,\n);');
	t.assert.strictEqual(reindentText('foo(\n\tbar,\n);', '', '\t'), 'foo(\n\t\tbar,\n\t);');
	t.assert.strictEqual(reindentText('foo(\n\t\tbar,\n\t);', '\t', '\t\t'), 'foo(\n\t\t\tbar,\n\t\t);');
	t.assert.strictEqual(reindentText('foo(\n    bar,\n  );', '  ', '\t'), 'foo(\n\t  bar,\n\t);');
});

test('keeps the first line as it is', t => {
	t.assert.strictEqual(reindentText('\tfoo();\n\tbar();', '\t', ''), '\tfoo();\nbar();');
	t.assert.strictEqual(reindentText('  \nfoo();', '', '\t'), '  \n\tfoo();');
	t.assert.strictEqual(reindentText('foo();', '\t', ''), 'foo();');
	t.assert.strictEqual(reindentText('', '\t', ''), '');
});

test('keeps a line that does not start with the source indentation', t => {
	t.assert.strictEqual(reindentText('foo(`\n  inside\n\t`);', '\t', ''), 'foo(`\n  inside\n`);');
	t.assert.strictEqual(reindentText('foo();\nbar();', '\t', '\t\t'), 'foo();\nbar();');
	t.assert.strictEqual(reindentText('foo();\n\tbar();', '\t\t', ''), 'foo();\n\tbar();');
});

test('empties a line with only whitespace', t => {
	t.assert.strictEqual(reindentText('foo();\n\t\n\tbar();', '\t', ''), 'foo();\n\nbar();');
	t.assert.strictEqual(reindentText('foo();\n  \n  bar();', '  ', ' '.repeat(4)), `foo();\n\n${' '.repeat(4)}bar();`);
	t.assert.strictEqual(reindentText('foo();\n\t\t\n\tbar();', '\t', '\t\t'), 'foo();\n\n\t\tbar();');
	t.assert.strictEqual(reindentText('foo();\n\t', '\t', ''), 'foo();\n');
});

test('keeps each line ending', t => {
	t.assert.strictEqual(reindentText('foo(\r\n\t\tbar,\r\n\t);', '\t', ''), 'foo(\r\n\tbar,\r\n);');
	t.assert.strictEqual(reindentText('foo(\r\t\tbar,\r\t);', '\t', ''), 'foo(\r\tbar,\r);');
	t.assert.strictEqual(reindentText('foo(\u2028\t\tbar,\u2028\t);', '\t', ''), 'foo(\u2028\tbar,\u2028);');
	t.assert.strictEqual(reindentText('foo(\u2029\t\tbar,\u2029\t);', '\t', ''), 'foo(\u2029\tbar,\u2029);');
	t.assert.strictEqual(reindentText('foo(\r\n\t\tbar,\n\t\tbaz,\r\n\t);', '\t', ''), 'foo(\r\n\tbar,\n\tbaz,\r\n);');
});

test('does not treat `\\r\\n` as two line endings', t => {
	t.assert.strictEqual(reindentText('foo();\r\n\r\nbar();', '', '\t'), 'foo();\r\n\r\n\tbar();');
	t.assert.strictEqual(reindentText('foo();\r\n\tbar();', '\t', ''), 'foo();\r\nbar();');
});

test('indents every later line when the source indentation is empty', t => {
	t.assert.strictEqual(reindentText('{\n\tfoo: 1,\n}', '', '\t'), '{\n\t\tfoo: 1,\n\t}');
	t.assert.strictEqual(reindentText('{\n  foo: 1,\n}', '', '  '), '{\n    foo: 1,\n  }');
	t.assert.strictEqual(reindentText('a\nb\nc', '', '\t'), 'a\n\tb\n\tc');
});

test('is a no-op when both indentations are the same', t => {
	t.assert.strictEqual(reindentText('foo(\n\tbar,\n);', '\t', '\t'), 'foo(\n\tbar,\n);');
	t.assert.strictEqual(reindentText('foo(\n\tbar,\n);', '', ''), 'foo(\n\tbar,\n);');
});

test('only strips the source indentation once, keeping deeper indentation', t => {
	t.assert.strictEqual(reindentText('foo(\n\t\tbar(\n\t\t\tbaz,\n\t\t),\n\t);', '\t', ''), 'foo(\n\tbar(\n\t\tbaz,\n\t),\n);');
	t.assert.strictEqual(reindentText('foo(\n    bar(\n      baz,\n    ),\n  );', '  ', ''), 'foo(\n  bar(\n    baz,\n  ),\n);');
});

test('treats the source indentation as a prefix, not a count', t => {
	// Two spaces do not match a tab
	t.assert.strictEqual(reindentText('foo(\n\tbar,\n);', '  ', '\t'), 'foo(\n\tbar,\n);');
	// A tab does not match two spaces
	t.assert.strictEqual(reindentText('foo(\n  bar,\n);', '\t', ''), 'foo(\n  bar,\n);');
});
