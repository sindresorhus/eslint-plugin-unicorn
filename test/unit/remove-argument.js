import test from 'ava';
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
	t.is(
		fix('fn(a, /* keep */ b)').output,
		'fn(/* keep */ b)',
	);

	t.is(
		fix('fn(a /* keep */, b)').output,
		'fn( /* keep */ b)',
	);
});
