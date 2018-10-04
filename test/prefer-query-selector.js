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
			code: 'document.querySelectorAll("p");',
			errors: [{message: 'Prefer `querySelector` over `querySelectorAll`.'}],
			output: 'document.querySelector("p");'
		},
		{
			code: 'document.getElementsByClassName("foo");',
			errors: [{message: 'Prefer `querySelector` over `getElementsByClassName`.'}],
			output: 'document.querySelector(".foo");'
		},
		{
			code: 'document.getElementsByClassName("foo bar");',
			errors: [{message: 'Prefer `querySelector` over `getElementsByClassName`.'}],
			output: 'document.querySelector(".foo.bar");'
		},
		{
			code: 'document.getElementsByTagName("div");',
			errors: [{message: 'Prefer `querySelector` over `getElementsByTagName`.'}],
			output: 'document.querySelector("div");'
		},
		{
			code: 'document.getElementById("foo").getElementsByClassName("bar baz");',
			errors: [
				{message: 'Prefer `querySelector` over `getElementsByClassName`.'},
				{message: 'Prefer `querySelector` over `getElementById`.'}
			],
			output: 'document.querySelector("#foo").querySelector(".bar.baz");'
		},
		{
			code: 'document.getElementById(\'foo\');',
			errors: [{message: 'Prefer `querySelector` over `getElementById`.'}],
			output: 'document.querySelector(\'#foo\');'
		},
		{
			code: 'const qux = \'qux\'; document.getElementsByClassName(`foo ${qux}`);', // eslint-disable-line no-template-curly-in-string
			errors: [{message: 'Prefer `querySelector` over `getElementsByClassName`.'}],
			output: 'const qux = \'qux\'; document.querySelector(`.foo.${qux}`);' // eslint-disable-line no-template-curly-in-string
		}
	]
});
