import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-query-selector';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

ruleTester.run('prefer-query-selector', rule, {
	valid: [
		'document.querySelector("#foo");',
		'document.querySelector(".bar");',
		'document.querySelector("main #foo .bar");',
		'document.querySelectorAll(".foo .bar");',
		'document.querySelectorAll("li a");',
		'document.querySelector("li").querySelectorAll("a");'
	],
	invalid: [
		{
			code: 'document.getElementById("foo");',
			errors: [{message: 'Prefer `.querySelector()` over `.getElementById()`.'}],
			output: 'document.querySelector("#foo");'
		},
		{
			code: 'document.getElementsByClassName("foo");',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}],
			output: 'document.querySelectorAll(".foo");'
		},
		{
			code: 'document.getElementsByClassName("foo bar");',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}],
			output: 'document.querySelectorAll(".foo.bar");'
		},
		{
			code: 'document.getElementsByTagName("foo");',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByTagName()`.'}],
			output: 'document.querySelectorAll("foo");'
		},
		{
			code: 'document.getElementById("");',
			errors: [{message: 'Prefer `.querySelector()` over `.getElementById()`.'}]
		},
		{
			code: 'document.getElementById(\'foo\');',
			errors: [{message: 'Prefer `.querySelector()` over `.getElementById()`.'}],
			output: 'document.querySelector(\'#foo\');'
		},
		{
			code: 'document.getElementsByClassName(\'foo\');',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}],
			output: 'document.querySelectorAll(\'.foo\');'
		},
		{
			code: 'document.getElementsByClassName(\'foo bar\');',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}],
			output: 'document.querySelectorAll(\'.foo.bar\');'
		},
		{
			code: 'document.getElementsByTagName(\'foo\');',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByTagName()`.'}],
			output: 'document.querySelectorAll(\'foo\');'
		},
		{
			code: 'document.getElementsByClassName(\'\');',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}]
		},
		{
			code: 'document.getElementById(`foo`);',
			errors: [{message: 'Prefer `.querySelector()` over `.getElementById()`.'}],
			output: 'document.querySelector(`#foo`);'
		},
		{
			code: 'document.getElementsByClassName(`foo`);',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}],
			output: 'document.querySelectorAll(`.foo`);'
		},
		{
			code: 'document.getElementsByClassName(`foo bar`);',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}],
			output: 'document.querySelectorAll(`.foo.bar`);'
		},
		{
			code: 'document.getElementsByTagName(`foo`);',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByTagName()`.'}],
			output: 'document.querySelectorAll(`foo`);'
		},
		{
			code: 'document.getElementsByTagName(``);',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByTagName()`.'}]
		},
		{
			code: 'document.getElementsByClassName(`${fn()}`);', // eslint-disable-line no-template-curly-in-string
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}]
		},
		{
			code: 'document.getElementsByClassName(`foo ${undefined}`);', // eslint-disable-line no-template-curly-in-string
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}]
		},
		{
			code: 'document.getElementsByClassName(null);',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}],
			output: 'document.querySelectorAll(null);'
		},
		{
			code: 'document.getElementsByTagName(null);',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByTagName()`.'}],
			output: 'document.querySelectorAll(null);'
		},
		{
			code: 'document.getElementsByClassName(fn());',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}]
		},
		{
			code: 'document.getElementsByClassName("foo" + fn());',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}]
		},
		{
			code: 'document.getElementsByClassName(foo + "bar");',
			errors: [{message: 'Prefer `.querySelectorAll()` over `.getElementsByClassName()`.'}]
		}
	]
});
