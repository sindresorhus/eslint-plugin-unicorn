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
		'document.querySelector("#foo .bar");',
		'document.querySelector("main #foo .bar");'
	],
	invalid: [
		{
			code: 'document.getElementById("foo");',
			errors: [{message: 'Prefer `querySelector` over `getElementById`.'}],
			output: 'document.querySelector("#foo");'
		},
		{
			code: 'document.getElementsByClassName("foo");',
			errors: [{message: 'Prefer `querySelectorAll` over `getElementsByClassName`.'}],
			output: 'document.querySelectorAll(".foo");'
		},
		{
			code: 'document.getElementsByClassName("foo bar");',
			errors: [{message: 'Prefer `querySelectorAll` over `getElementsByClassName`.'}],
			output: 'document.querySelectorAll(".foo.bar");'
		},
		{
			code: 'document.getElementsByTagName("div");',
			errors: [{message: 'Prefer `querySelectorAll` over `getElementsByTagName`.'}],
			output: 'document.querySelectorAll("div");'
		},
		{
			code: 'document.getElementById("foo").getElementsByClassName("bar baz");',
			errors: [
				{message: 'Prefer `querySelectorAll` over `getElementsByClassName`.'},
				{message: 'Prefer `querySelector` over `getElementById`.'}
			],
			output: 'document.querySelector("#foo").querySelectorAll(".bar.baz");'
		},
		{
			code: 'document.getElementById(\'foo\');',
			errors: [{message: 'Prefer `querySelector` over `getElementById`.'}],
			output: 'document.querySelector(\'#foo\');'
		},
		{
			code: 'const qux = \'qux\'; document.getElementsByClassName(`foo ${qux}`);', // eslint-disable-line no-template-curly-in-string
			errors: [{message: 'Prefer `querySelectorAll` over `getElementsByClassName`.'}],
			output: 'const qux = \'qux\'; document.querySelectorAll(`.foo.${qux}`);' // eslint-disable-line no-template-curly-in-string
		}
	]
});
