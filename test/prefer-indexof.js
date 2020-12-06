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

		'["foo", "bar"].indexOf()',
		'["foo", "bar"].indexOf(0)',
		'["foo", "bar"].indexOf(x => x === "foo", 2)',
		'["foo", "bar"].indexOf(x => x === "foo", -2)'
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
