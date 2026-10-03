import test from 'node:test';
import {Linter} from 'eslint';
import removeArgument from '../../rules/fix/remove-argument.js';
import {DEFAULT_LANGUAGE_OPTIONS} from '../utils/language-options.js';

const removeFirstArgumentRule = {
	meta: {
		fixable: 'code',
	},
	create(context) {
		return {
			CallExpression(node) {
				if (node.arguments.length < 2) {
					return;
				}

				context.report({
					node: node.arguments[0],
					message: 'Remove first argument.',
					fix: fixer => removeArgument(fixer, node.arguments[0], context),
				});
			},
		};
	},
};

const fix = code => {
	const linter = new Linter();
	return linter.verifyAndFix(code, {
		languageOptions: DEFAULT_LANGUAGE_OPTIONS,
		plugins: {
			test: {
				rules: {
					'remove-first-argument': removeFirstArgumentRule,
				},
			},
		},
		rules: {
			'test/remove-first-argument': 'error',
		},
	});
};

test('does not remove comments between first argument and next argument', t => {
	t.assert.strictEqual(
		fix('fn(a, /* keep */ b)').output,
		'fn(/* keep */ b)',
	);

	t.assert.strictEqual(
		fix('fn(a /* keep */, b)').output,
		'fn( /* keep */ b)',
	);
});

test('does not remove comments inside the first argument', t => {
	t.assert.strictEqual(
		fix('fn(a /* keep */ + b, c)').output,
		'fn(/* keep */ c)',
	);

	t.assert.strictEqual(
		fix('fn((a /* one */) /* two */, b)').output,
		'fn(/* one */ /* two */ b)',
	);

	t.assert.strictEqual(
		fix('fn(a // keep\n+ b, c)').output,
		'fn(// keep\n c)',
	);
});

const removeLastArgumentRule = {
	meta: {
		fixable: 'code',
	},
	create(context) {
		return {
			CallExpression(node) {
				if (node.arguments.length < 2) {
					return;
				}

				context.report({
					node: node.arguments.at(-1),
					message: 'Remove last argument.',
					fix: fixer => removeArgument(fixer, node.arguments.at(-1), context),
				});
			},
		};
	},
};

const fixLast = code => {
	const linter = new Linter();
	return linter.verifyAndFix(code, {
		languageOptions: DEFAULT_LANGUAGE_OPTIONS,
		plugins: {
			test: {
				rules: {
					'remove-last-argument': removeLastArgumentRule,
				},
			},
		},
		rules: {
			'test/remove-last-argument': 'error',
		},
	});
};

test('does not remove comments between previous argument and last argument', t => {
	t.assert.strictEqual(
		fixLast('fn(a, /* keep */ b)').output,
		'fn(a /* keep */)',
	);

	t.assert.strictEqual(
		fixLast('fn(a /* keep */, b)').output,
		'fn(a /* keep */)',
	);

	t.assert.strictEqual(
		fixLast('fn(a, /* one */ /* two */ b)').output,
		'fn(a /* one */ /* two */)',
	);

	t.assert.strictEqual(
		fixLast('fn(a, // keep\nb)').output,
		'fn(a // keep\n)',
	);

	t.assert.strictEqual(
		fixLast('fn(a, b)').output,
		'fn(a)',
	);
});
