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
		'const findIndex = foo.findIndex',

		// No argument
		'[\'foo\', \'bar\'].findIndex()',

		// Too many arguments
		'[\'foo\', \'bar\'].findIndex(x => x === \'foo\', 2)',

		// Not `CallExpression`
		'new foo.findIndex(x => x === \'foo\');',

		// Not `MemberExpression`
		'findIndex(x => x === \'foo\');',

		// `callee.property` is not a `Identifier`
		'foo[\'findIndex\'](x => x === \'foo\');',

		// Computed
		'foo[findIndex](x => x === \'foo\');',

		// Not listed method
		'foo.notListedMethod(x => x === \'foo\');',

		// Wrong argument
		'[\'foo\', \'bar\'].findIndex(0)',

		// Unknown argument
		'[\'foo\', \'bar\'].findIndex(myFunction)',

		// Not the same identifier
		'[\'foo\', \'bar\'].findIndex(x => y === \'foo\')',

		// Member instead of identifier
		'[\'foo\', \'bar\'].findIndex(x => y.x === \'foo\')',

		// Dynamical value
		'[\'foo\', \'bar\'].findIndex(x => x + \'foo\' === \'foo\' + x)',

		// Other dynamical value
		'[\'foo\', \'bar\'].findIndex((x, i) => x === i)',

		// Wrong operator
		'[\'foo\', \'bar\'].findIndex(x => x !== \'foo\')',

		// Wrong condition
		'[\'foo\', \'bar\'].findIndex(x => x.includes(\'foo\'))',

		// Too many statements
		'[\'foo\', \'bar\'].findIndex(x => {console.log(\'Hi!\');return x === \'foo\';})',

		// Already valid case
		'[\'foo\', \'bar\'].indexOf(0)'
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
