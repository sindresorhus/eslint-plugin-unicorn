import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test} = getTester(import.meta);

const allowWithVariablesOptions = [{allowWithVariables: true}];

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

		// `allowWithVariables` option - non-literal arguments are allowed
		{
			code: 'document.getElementById(someId);',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName(someClass);',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName(fn());',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName(`${someClass}`);', // eslint-disable-line no-template-curly-in-string
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementById(`${someId}`);', // eslint-disable-line no-template-curly-in-string
			options: allowWithVariablesOptions,
		},
	],
	invalid: [
		'document.getElementById("foo");',
		'document.getElementById("#foo");',
		'document.getElementById(".foo");',
		{code: 'document.getElementById("foo" as string);', languageOptions: {parser: parsers.typescript}},
		{code: 'document.getElementById("#foo" as string);', languageOptions: {parser: parsers.typescript}},
		'document.getElementsByClassName("foo");',
		'document.getElementsByClassName(".foo");',
		'document.getElementsByClassName("#foo");',
		{code: 'document.getElementsByClassName("foo" as string);', languageOptions: {parser: parsers.typescript}},
		{code: 'document.getElementsByClassName(".foo" as string);', languageOptions: {parser: parsers.typescript}},
		'element.getElementsByClassName("foo");',
		'element.getElementsByClassName(".foo");',
		'document.getElementsByClassName("foo bar");',
		'document.getElementsByTagName("foo");',
		'element.getElementsByTagName("foo");',
		'document.getElementById("");',
		'document.getElementById(\'foo\');',
		'document.getElementsByClassName(\'foo\');',
		'document.getElementsByClassName(\'foo bar\');',
		'document.getElementsByTagName(\'foo\');',
		'document.getElementsByClassName(\'\');',
		'document.getElementById(`foo`);',
		'document.getElementById(`#foo`);',
		'document.getElementsByClassName(`foo`);',
		'document.getElementsByClassName(`.foo`);',
		'element.getElementsByClassName(`foo`);',
		'document.getElementsByClassName(`foo bar`);',
		'document.getElementsByTagName(`foo`);',
		'element.getElementsByTagName(`foo`);',
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
		// Quotes and backslashes in the name would break the generated CSS selector or string, so report without fixing.
		'document.getElementsByName("foo\'bar");',
		'document.getElementsByName(\'foo"bar\');',
		'document.getElementsByName(`foo\'bar`);',
		String.raw`document.getElementsByName("foo\\bar");`,
		{code: String.raw`document.getElementsByName("foo\\bar" as string);`, languageOptions: {parser: parsers.typescript}},
		'document.getElementsByTagName("form")[0].addEventListener("submit", submitFunction);',
		'document.getElementsByTagName("form").item(0).submit();',
		'document.getElementsByClassName("submit-button").at(0).click();',
		'document.getElementsByName("email")[0].focus();',
		'document.getElementsByName("email").item(0).focus();',
		'delete document.getElementsByTagName("form").at(0);',
		'for (document.getElementsByTagName("form")[0] in object) {}',
		'for (document.getElementsByTagName("form")[0] of iterable) {}',
		'document.getElementsByTagName("form") /* keep */ [0].addEventListener("submit", submitFunction);',
		'document.getElementsByTagName("form").item(/* keep */ 0).addEventListener("submit", submitFunction);',

		// `allowWithVariables` option - literal arguments are still reported
		{
			code: 'document.getElementById("foo");',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementById("foo" as string);',
			options: allowWithVariablesOptions,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'document.getElementsByClassName("foo");',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName("foo"!);',
			options: allowWithVariablesOptions,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'document.getElementsByTagName("foo");',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByName("foo");',
			options: allowWithVariablesOptions,
		},
		// `allowWithVariables` - getElementsByTagName and getElementsByName are never allowed,
		// even with non-literal arguments
		{
			code: 'document.getElementsByTagName(someTag);',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByName(someName);',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName(null);',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName(`foo`);',
			options: allowWithVariablesOptions,
		},
		// `allowWithVariables` - binary expressions and mixed template literals are still reported,
		// because one can still compose a valid selector (e.g. `'.' + variable + 'x'` or `#${variable}x`)
		{
			code: 'document.getElementsByClassName(variable + "x");',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName("foo" + fn());',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName(foo + "bar");',
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementById(`x${someId}`);', // eslint-disable-line no-template-curly-in-string
			options: allowWithVariablesOptions,
		},
		{
			code: 'document.getElementsByClassName(`foo ${someClass}`);', // eslint-disable-line no-template-curly-in-string
			options: allowWithVariablesOptions,
		},
	],
});
