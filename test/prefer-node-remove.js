import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-node-remove';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	message: 'Prefer `remove` over `parentNode.removeChild`'
}];

ruleTester.run('prefer-node-remove', rule, {
	valid: [
		'foo.remove()',
		'this.remove()',
		'remove()',
		'foo.parentNode.removeChild(\'bar\')',
		'foo.parentNode[\'bar\'](foo)'
	],
	invalid: [
		{
			code: 'foo.parentNode.removeChild(foo)',
			output: 'foo.remove()',
			errors
		},
		{
			code: 'this.parentNode.removeChild(this)',
			output: 'this.remove()',
			errors
		},
		{
			code: 'parentNode.removeChild(this)',
			output: 'this.remove()',
			errors
		},
		{
			code: 'foo.parentNode.removeChild(bar)',
			output: 'bar.remove()',
			errors
		},
		{
			code: 'this.parentNode.removeChild(foo)',
			output: 'foo.remove()',
			errors
		}
	]
});
