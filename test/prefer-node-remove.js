import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-node-remove';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const invalidTestCase = (code, output, parentName, argumentName) => {
	return {
		code,
		output,
		errors: [
			{
				message: `Prefer \`${argumentName}.remove()\` over \`${parentName}.removeChild(${argumentName})\`.`
			}
		]
	};
};

ruleTester.run('prefer-node-remove', rule, {
	valid: [
		'foo.remove()',
		'this.remove()',
		'remove()',
		'foo.parentNode.removeChild(\'bar\')',
		'foo.parentNode[\'bar\'](foo)',
		'foo.parentNode[removeChild](foo)',
		'foo.parentNode.removeChild()'
	],
	invalid: [
		invalidTestCase(
			'foo.parentNode.removeChild(foo)',
			'foo.remove()',
			'parentNode',
			'foo'
		),
		invalidTestCase(
			'this.parentNode.removeChild(this)',
			'this.remove()',
			'parentNode',
			'this'
		),
		invalidTestCase(
			'parentNode.removeChild(this)',
			'this.remove()',
			'parentNode',
			'this'
		),
		invalidTestCase(
			'foo.parentNode.removeChild(bar)',
			'bar.remove()',
			'parentNode',
			'bar'
		),
		invalidTestCase(
			'this.parentNode.removeChild(foo)',
			'foo.remove()',
			'parentNode',
			'foo'
		),
		invalidTestCase(
			'foo.parentElement.removeChild(foo)',
			'foo.remove()',
			'parentElement',
			'foo'
		),
		invalidTestCase(
			'this.parentElement.removeChild(this)',
			'this.remove()',
			'parentElement',
			'this'
		),
		invalidTestCase(
			'parentElement.removeChild(this)',
			'this.remove()',
			'parentElement',
			'this'
		),
		invalidTestCase(
			'foo.parentElement.removeChild(bar)',
			'bar.remove()',
			'parentElement',
			'bar'
		),
		invalidTestCase(
			'this.parentElement.removeChild(foo)',
			'foo.remove()',
			'parentElement',
			'foo'
		)
	]
});
