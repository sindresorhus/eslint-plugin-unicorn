import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-nested-ternary';
import {outdent} from 'outdent';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const errors = [
	{
		message: 'Do not nest ternary expressions.'
	}
];

ruleTester.run('new-error', rule, {
	valid: [
		'const foo = i > 5 ? true : false;',
		'const foo = i > 5 ? true : (i < 100 ? true : false);',
		'const foo = i > 5 ? (i < 100 ? true : false) : true;',
		'const foo = i > 5 ? (i < 100 ? true : false) : (i < 100 ? true : false);',
		'const foo = i > 5 ? true : (i < 100 ? FOO(i > 50 ? false : true) : false);',
		'foo ? doBar() : doBaz();',
		'var foo = bar === baz ? qux : quxx;'
	],
	invalid: [
		{
			code: 'const foo = i > 5 ? true : (i < 100 ? true : (i < 1000 ? true : false));',
			errors
		},
		{
			code: 'const foo = i > 5 ? true : (i < 100 ? (i > 50 ? false : true) : false);',
			errors
		},
		{
			code: 'const foo = i > 5 ? i < 100 ? true : false : true;',
			output: 'const foo = i > 5 ? (i < 100 ? true : false) : true;',
			errors
		},
		{
			code: 'const foo = i > 5 ? i < 100 ? true : false : i < 100 ? true : false;',
			output: 'const foo = i > 5 ? (i < 100 ? true : false) : (i < 100 ? true : false);',
			errors: [
				{
					column: 21
				},
				{
					column: 46
				}
			]
		},
		{
			code: 'const foo = i > 5 ? true : i < 100 ? true : false;',
			output: 'const foo = i > 5 ? true : (i < 100 ? true : false);',
			errors
		},
		{
			code: 'foo ? bar : baz === qux ? quxx : foobar;',
			output: 'foo ? bar : (baz === qux ? quxx : foobar);',
			errors
		},
		{
			code: 'foo ? baz === qux ? quxx : foobar : bar;',
			output: 'foo ? (baz === qux ? quxx : foobar) : bar;',
			errors
		}
	]
});

typescriptRuleTester.run('new-error', rule, {
	valid: [
		// #663
		outdent`
			const pluginName = isAbsolute ?
				pluginPath.slice(pluginPath.lastIndexOf('/') + 1) :
				(
					isNamespaced ?
					pluginPath.split('@')[1].split('/')[1] :
					pluginPath
				);
		`
	],
	invalid: []
});
