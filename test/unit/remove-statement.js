import test from 'node:test';
import {Linter} from 'eslint';
import removeStatement from '../../rules/fix/remove-statement.js';
import {DEFAULT_LANGUAGE_OPTIONS} from '../utils/language-options.js';

const removeStatementsRule = {
	meta: {
		fixable: 'code',
	},
	create: context => ({
		ExpressionStatement(node) {
			if (node.expression?.type !== 'CallExpression' || node.expression.callee.name !== 'foo') {
				return;
			}

			context.report({
				node,
				message: 'Remove statement.',
				fix: fixer => removeStatement(node, context, fixer),
			});
		},
	}),
};

const fix = code => {
	const linter = new Linter();
	return linter.verifyAndFix(code, {
		files: ['**'],
		languageOptions: DEFAULT_LANGUAGE_OPTIONS,
		plugins: {
			test: {
				rules: {
					'remove-statements': removeStatementsRule,
				},
			},
		},
		rules: {
			'test/remove-statements': 'error',
		},
	}).output;
};

test('removes a statement and its line', t => {
	t.assert.strictEqual(fix('foo();\nbar();\nbaz();'), 'bar();\nbaz();');
	t.assert.strictEqual(fix('foo();\n\tbar();\n\tbaz();'), '\tbar();\n\tbaz();');
	t.assert.strictEqual(fix('if (a) {\n\tfoo();\n\tbar();\n}'), 'if (a) {\n\tbar();\n}');
});

test('removes the whole line break, whatever it is', t => {
	t.assert.strictEqual(fix('foo();\r\nbar();'), 'bar();');
	t.assert.strictEqual(fix('foo();\rbar();'), 'bar();');
	t.assert.strictEqual(fix('foo();\u2028bar();'), 'bar();');
	t.assert.strictEqual(fix('foo();\nbar();'), 'bar();');
});

test('removes the whole preceding line break, whatever it is', t => {
	t.assert.strictEqual(fix('bar();\r\nfoo();\r\nbaz();'), 'bar();\r\nbaz();');
	t.assert.strictEqual(fix('bar();\rfoo();'), 'bar();');
	t.assert.strictEqual(fix('bar();\u2028foo();'), 'bar();');
	t.assert.strictEqual(fix('bar();\u2029\tfoo();'), 'bar();');
});

test('removes the only statement', t => {
	t.assert.strictEqual(fix('foo();'), '');
});

test('removes an indented statement on the first line', t => {
	t.assert.strictEqual(fix('\tfoo();\nbar();'), 'bar();');
	t.assert.strictEqual(fix('  foo();\r\nbar();'), 'bar();');
});

const removeStatementGroupRule = {
	meta: {
		fixable: 'code',
	},
	create: context => ({
		'Program, BlockStatement'(node) {
			const statements = node.body.filter(statement => statement.expression?.callee?.name === 'foo');
			if (statements.length === 0) {
				return;
			}

			context.report({
				node,
				message: 'Remove statements.',
				fix: fixer => removeStatement(statements, context, fixer),
			});
		},
	}),
};

const fixGroup = code => {
	const linter = new Linter();
	return linter.verifyAndFix(code, {
		files: ['**'],
		languageOptions: DEFAULT_LANGUAGE_OPTIONS,
		plugins: {
			test: {
				rules: {
					'remove-statement-group': removeStatementGroupRule,
				},
			},
		},
		rules: {
			'test/remove-statement-group': 'error',
		},
	}).output;
};

test('removes consecutive statements and their lines', t => {
	t.assert.strictEqual(fixGroup('bar();\nfoo(1);\nfoo(2);\nbaz();'), 'bar();\nbaz();');
	t.assert.strictEqual(fixGroup('if (a) {\n\tbar();\n\tfoo(1);\n\tfoo(2);\n}'), 'if (a) {\n\tbar();\n}');
	t.assert.strictEqual(fixGroup('bar();\r\n\tfoo(1);\r\n\tfoo(2);\r\nbaz();'), 'bar();\r\nbaz();');
	t.assert.strictEqual(fixGroup('foo(1);\nfoo(2);\nbar();'), 'bar();');
	t.assert.strictEqual(fixGroup('foo(1);\nfoo(2);'), '');
});

test('removes consecutive statements that share a line with other code', t => {
	t.assert.strictEqual(fixGroup('bar(); foo(1);\nfoo(2);\nbaz();'), 'bar(); \nbaz();');
	t.assert.strictEqual(fixGroup('bar();\nfoo(1); foo(2); baz();'), 'bar();\n baz();');
});

test('removes a single statement in an array like the statement itself', t => {
	for (const code of [
		'foo();\nbar();',
		'bar();\r\n\tfoo();\r\nbaz();',
		'\tfoo();\nbar();',
		'bar(); foo();',
		'foo();',
	]) {
		t.assert.strictEqual(fixGroup(code), fix(code), code);
	}
});
