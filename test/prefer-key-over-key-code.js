import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-key-over-key-code';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = key => ({
	ruleId: 'prefer-key-over-key-code',
	message: `Use key instead of ${key}. See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key`
});

ruleTester.run('no-hex-escape', rule, {
	valid: [
		`window.addEventListener('click', e => {
			console.log(e.key);
		})`,
		`foo.addEventListener('keydown', e => {
			if (e.key === 'ArrowLeft') return true;
		})`
	],
	invalid: [
		{
			code: `
				window.addEventListener('click', e => {
					console.log(e.keyCode);
				})
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				window.addEventListener('click', e => {
					console.log(e.which);
				})
			`,
			errors: [error('which')]
		},
		{
			code: `
				window.addEventListener('click', e => {
					console.log(e.charCode);
				})
			`,
			errors: [error('charCode')]
		}
	]
});
