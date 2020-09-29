import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-query-selector';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const createError = (method, replacement) => ({
	messageId: 'prefer-query-selector',
	data: {method, replacement}
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
			errors: [createError('getElementById', 'querySelector')],
			output: 'document.querySelector("#foo");'
		},
		{
			code: 'document.getElementsByClassName("foo");',
			errors: [createError('getElementsByClassName', 'querySelectorAll')],
			output: 'document.querySelectorAll(".foo");'
		},
		{
			code: 'document.getElementsByClassName("foo bar");',
			errors: [createError('getElementsByClassName', 'querySelectorAll')],
			output: 'document.querySelectorAll(".foo.bar");'
		},
		{
			code: 'document.getElementsByTagName("foo");',
			errors: [createError('getElementsByTagName', 'querySelectorAll')],
			output: 'document.querySelectorAll("foo");'
		},
		{
			code: 'document.getElementById("");',
			errors: [createError('getElementById', 'querySelector')]
		},
		{
			code: 'document.getElementById(\'foo\');',
			errors: [createError('getElementById', 'querySelector')],
			output: 'document.querySelector(\'#foo\');'
		},
		{
			code: 'document.getElementsByClassName(\'foo\');',
			errors: [createError('getElementsByClassName', 'querySelectorAll')],
			output: 'document.querySelectorAll(\'.foo\');'
		},
		{
			code: 'document.getElementsByClassName(\'foo bar\');',
			errors: [createError('getElementsByClassName', 'querySelectorAll')],
			output: 'document.querySelectorAll(\'.foo.bar\');'
		},
		{
			code: 'document.getElementsByTagName(\'foo\');',
			errors: [createError('getElementsByTagName', 'querySelectorAll')],
			output: 'document.querySelectorAll(\'foo\');'
		},
		{
			code: 'document.getElementsByClassName(\'\');',
			errors: [createError('getElementsByClassName', 'querySelectorAll')]
		},
		{
			code: 'document.getElementById(`foo`);',
			errors: [createError('getElementById', 'querySelector')],
			output: 'document.querySelector(`#foo`);'
		},
		{
			code: 'document.getElementsByClassName(`foo`);',
			errors: [createError('getElementsByClassName', 'querySelectorAll')],
			output: 'document.querySelectorAll(`.foo`);'
		},
		{
			code: 'document.getElementsByClassName(`foo bar`);',
			errors: [createError('getElementsByClassName', 'querySelectorAll')],
			output: 'document.querySelectorAll(`.foo.bar`);'
		},
		{
			code: 'document.getElementsByTagName(`foo`);',
			errors: [createError('getElementsByTagName', 'querySelectorAll')],
			output: 'document.querySelectorAll(`foo`);'
		},
		{
			code: 'document.getElementsByTagName(``);',
			errors: [createError('getElementsByTagName', 'querySelectorAll')]
		},
		{
			code: 'document.getElementsByClassName(`${fn()}`);', // eslint-disable-line no-template-curly-in-string
			errors: [createError('getElementsByClassName', 'querySelectorAll')]
		},
		{
			code: 'document.getElementsByClassName(`foo ${undefined}`);', // eslint-disable-line no-template-curly-in-string
			errors: [createError('getElementsByClassName', 'querySelectorAll')]
		},
		{
			code: 'document.getElementsByClassName(null);',
			errors: [createError('getElementsByClassName', 'querySelectorAll')],
			output: 'document.querySelectorAll(null);'
		},
		{
			code: 'document.getElementsByTagName(null);',
			errors: [createError('getElementsByTagName', 'querySelectorAll')],
			output: 'document.querySelectorAll(null);'
		},
		{
			code: 'document.getElementsByClassName(fn());',
			errors: [createError('getElementsByClassName', 'querySelectorAll')]
		},
		{
			code: 'document.getElementsByClassName("foo" + fn());',
			errors: [createError('getElementsByClassName', 'querySelectorAll')]
		},
		{
			code: 'document.getElementsByClassName(foo + "bar");',
			errors: [createError('getElementsByClassName', 'querySelectorAll')]
		}
	]
});

const visualizeTester = visualizeRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

visualizeTester.run('prefer-query-selector', rule, [
	'document.getElementById("foo");'
]);
