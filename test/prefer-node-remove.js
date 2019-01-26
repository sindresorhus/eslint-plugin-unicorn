import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-node-remove';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

ruleTester.run('prefer-node-remove', rule, {
	valid: [
		'foo.parentNode.removeChild(bar)',
		'this.parentNode.removeChild(foo)',
		'parentNode.removeChild(foo)',
		'foo.remove()',
		'this.remove()',
		'remove()'
	],
	invalid: [
		{
			code: 'foo.parentNode.removeChild(foo)',
			output: 'foo.remove()',
			errors: [{
				message: 'Prefer `remove` over `removeChild`'
			}]
		},
		{
			code: 'this.parentNode.removeChild(this)',
			output: 'this.remove()',
			errors: [{
				message: 'Prefer `remove` over `removeChild`'
			}]
		},
		{
			code: 'parentNode.removeChild(this)',
			output: 'this.remove()',
			errors: [{
				message: 'Prefer `remove` over `removeChild`'
			}]
		}
	]
});
