import {test} from './utils/test';
import notDomNodeTypes from './utils/not-dom-node-types';

const createError = (method, replacement) => ({
	messageId: 'prefer-query-selector',
	data: {method, replacement}
});

test({
	valid: [
		// Not `CallExpression`
		'new document.getElementById(foo);',
		// Not `MemberExpression`
		'getElementById(foo);',
		// `callee.property` is not a `Identifier`
		'document[\'getElementById\'](bar);',
		// Computed
		'document[getElementById](bar);',
		// Not listed method
		'document.foo(bar);',
		// More or less argument(s)
		'document.getElementById();',
		'document.getElementsByClassName("foo", "bar");',
		'document.getElementById(...["id"]);',

		'document.querySelector("#foo");',
		'document.querySelector(".bar");',
		'document.querySelector("main #foo .bar");',
		'document.querySelectorAll(".foo .bar");',
		'document.querySelectorAll("li a");',
		'document.querySelector("li").querySelectorAll("a");'
	],
	invalid: []
});

test.visualize([
	'document.getElementById("foo");',
	'document.getElementsByClassName("foo");',
	'document.getElementsByClassName("foo bar");',
	'document.getElementsByTagName("foo");',
	'document.getElementById("");',
	'document.getElementById(\'foo\');',
	'document.getElementsByClassName(\'foo\');',
	'document.getElementsByClassName(\'foo bar\');',
	'document.getElementsByTagName(\'foo\');',
	'document.getElementsByClassName(\'\');',
	'document.getElementById(`foo`);',
	'document.getElementsByClassName(`foo`);',
	'document.getElementsByClassName(`foo bar`);',
	'document.getElementsByTagName(`foo`);',
	'document.getElementsByTagName(``);',
	'document.getElementsByClassName(`${fn()}`);', // eslint-disable-line no-template-curly-in-string
	'document.getElementsByClassName(`foo ${undefined}`);', // eslint-disable-line no-template-curly-in-string
	'document.getElementsByClassName(null);',
	'document.getElementsByTagName(null);',
	'document.getElementsByClassName(fn());',
	'document.getElementsByClassName("foo" + fn());',
	'document.getElementsByClassName(foo + "bar");'
]);
