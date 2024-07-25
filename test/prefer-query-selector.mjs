import outdent from 'outdent';
import {getTester} from './utils/test.mjs';
import notDomNodeTypes from './utils/not-dom-node-types.mjs';

const {test} = getTester(import.meta);

test.snapshot({
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

		// `callee.object` is not a DOM Node,
		...notDomNodeTypes.map(data => `(${data}).getElementById(foo)`),

		'document.querySelector("#foo");',
		'document.querySelector(".bar");',
		'document.querySelector("main #foo .bar");',
		'document.querySelectorAll(".foo .bar");',
		'document.querySelectorAll("li a");',
		'document.querySelector("li").querySelectorAll("a");',
		'document.getElementsByName();',
	],
	invalid: [
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
		'document.getElementsByClassName(foo + "bar");',
		outdent`
			for (const div of document.body.getElementById("id").getElementsByClassName("class")) {
				console.log(div.getElementsByTagName("div"));
			}
		`,
		// #1030
		'e.getElementById(3)',
		'document.getElementsByName("foo");',
		'document.getElementsByName(\'foo\');',
		'document.getElementsByName(`foo`);',
		'document.getElementsByName(`${\'foo\'}`);', // eslint-disable-line no-template-curly-in-string
		'document.getElementsByName(null);',
		'document.getElementsByName("");',
		'document.getElementsByName(foo + "bar");',
		'document.getElementsByName("multiple name should be fixable");',
	],
});
