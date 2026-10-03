import test from 'node:test';
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
		t.assert.throws(
			() => verify({checkProperties}),
			{message: /`checkProperties` was removed\. Use `checkMethods` and `checkFields` instead\./u},
		);
	}

	t.assert.throws(() => verify({checkVariables: true}), {message: /Value true should be equal to one of the allowed values/u});
	t.assert.throws(() => verify({checkMethods: 'invalid'}), {message: /Value "invalid" should be equal to one of the allowed values/u});
});
