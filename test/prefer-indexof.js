import {outdent} from 'outdent';
import {test} from './utils/test';

const MESSAGE_ID_FINDINDEX = 'findIndex';

const errorsFindIndex = [
	{
		messageId: MESSAGE_ID_FINDINDEX
	}
];

test({
	valid: [
		'const substr = foo.substr',
		'const findIndex = foo.findIndex',

		'["foo", "bar"].findIndex()',
		'["foo", "bar"].findIndex(0)',
		'["foo", "bar"].findIndex(myFunction)',
		'["foo", "bar"].findIndex(x => y === "foo")',
		'["foo", "bar"].findIndex(x => y.x === "foo")',
		'["foo", "bar"].findIndex(x => x + "foo" === "foo" + x)',
		'["foo", "bar"].findIndex((x, i) => x === i)',
		'["foo", "bar"].findIndex(x => x !== "foo")',
		'["foo", "bar"].findIndex(x => x.includes("foo"))',
		'["foo", "bar"].findIndex(x => x === "foo", 2)',
		'["foo", "bar"].findIndex(x => {console.log("Hi!");return x === "foo";})',

		'["foo", "bar"].indexOf(0)'
	],

	invalid: [
		{
			code: 'values.findIndex(x => x === "foo")',
			output: 'values.indexOf("foo")',
			errors: errorsFindIndex
		},
		{
			code: 'values.findIndex(x => "foo" === x)',
			output: 'values.indexOf("foo")',
			errors: errorsFindIndex
		},
		{
			code: 'values.findIndex(x => {return x === "foo";})',
			output: 'values.indexOf("foo")',
			errors: errorsFindIndex
		},
		{
			code: 'values.findIndex(function (x) {return x === "foo";})',
			output: 'values.indexOf("foo")',
			errors: errorsFindIndex
		}
	]
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: outdent`
				function foo() {
					return (bar as string).findIndex(x => x === "foo");
				}
			`,
			output: outdent`
				function foo() {
					return (bar as string).indexOf("foo");
				}
			`,
			errors: errorsFindIndex
		}
	]
});
