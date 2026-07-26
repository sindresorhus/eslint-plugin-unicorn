import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';

test('consistent-boolean-name rejects the removed checkProperties option', t => {
	const linter = new Linter({configType: 'flat'});
	const verify = options => linter.verify('const completed = true;', {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: {unicorn},
		rules: {
			'unicorn/consistent-boolean-name': ['error', options],
		},
	});

	for (const checkProperties of [false, true, 'always', undefined]) {
		t.throws(
			() => verify({checkProperties}),
			{message: /`checkProperties` was removed\. Use `checkMethods` and `checkFields` instead\./u},
		);
	}

	t.throws(() => verify({checkVariables: true}));
	t.throws(() => verify({checkMethods: 'invalid'}));
});
