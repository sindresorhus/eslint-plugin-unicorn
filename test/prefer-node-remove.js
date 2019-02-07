import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-node-remove';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const invalidTestCase = (code, output, parentType) => {
	return {
		code,
		output,
		errors: [{message: `Prefer \`remove\` over \`${parentType}.removeChild\``}]
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
			'parentNode'
		),
		invalidTestCase(
			'this.parentNode.removeChild(this)',
			'this.remove()',
			'parentNode'
		),
		invalidTestCase(
			'parentNode.removeChild(this)',
			'this.remove()',
			'parentNode'
		),
		invalidTestCase(
			'foo.parentNode.removeChild(bar)',
			'bar.remove()',
			'parentNode'
		),
		invalidTestCase(
			'this.parentNode.removeChild(foo)',
			'foo.remove()',
			'parentNode'
		),
		invalidTestCase(
			'foo.parentElement.removeChild(foo)',
			'foo.remove()',
			'parentElement'
		),
		invalidTestCase(
			'this.parentElement.removeChild(this)',
			'this.remove()',
			'parentElement'
		),
		invalidTestCase(
			'parentElement.removeChild(this)',
			'this.remove()',
			'parentElement'
		),
		invalidTestCase(
			'foo.parentElement.removeChild(bar)',
			'bar.remove()',
			'parentElement'
		),
		invalidTestCase(
			'this.parentElement.removeChild(foo)',
			'foo.remove()',
			'parentElement'
		)
	]
});
