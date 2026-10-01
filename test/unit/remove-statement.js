import test from 'ava';
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
	t.is(fix('foo();\nbar();\nbaz();'), 'bar();\nbaz();');
	t.is(fix('foo();\n\tbar();\n\tbaz();'), '\tbar();\n\tbaz();');
	t.is(fix('if (a) {\n\tfoo();\n\tbar();\n}'), 'if (a) {\n\tbar();\n}');
});

test('removes the whole line break, whatever it is', t => {
	t.is(fix('foo();\r\nbar();'), 'bar();');
	t.is(fix('foo();\rbar();'), 'bar();');
	t.is(fix('foo();\u2028bar();'), 'bar();');
	t.is(fix('foo();\nbar();'), 'bar();');
});

test('removes the whole preceding line break, whatever it is', t => {
	t.is(fix('bar();\r\nfoo();\r\nbaz();'), 'bar();\r\nbaz();');
	t.is(fix('bar();\rfoo();'), 'bar();');
	t.is(fix('bar();\u2028foo();'), 'bar();');
	t.is(fix('bar();\u2029\tfoo();'), 'bar();');
});

test('removes the only statement', t => {
	t.is(fix('foo();'), '');
});

test('removes an indented statement on the first line', t => {
	t.is(fix('\tfoo();\nbar();'), 'bar();');
	t.is(fix('  foo();\r\nbar();'), 'bar();');
});
