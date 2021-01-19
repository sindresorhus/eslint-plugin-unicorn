import {test} from './utils/test.js';

const errors = [
	{
		message: 'Use `.includes()`, rather than `.indexOf()`, when checking for existence.'
	}
];

test({
	valid: [
		'str.indexOf(\'foo\') !== -n',
		'str.indexOf(\'foo\') !== 1',
		'str.indexOf(\'foo\') === -2',
		'!str.indexOf(\'foo\') === 1',
		'!str.indexOf(\'foo\') === -n',
		'str.includes(\'foo\')',
		'\'foobar\'.includes(\'foo\')',
		'[1,2,3].includes(4)',
		'null.indexOf(\'foo\') !== 1',
		'f(0) < 0',
		'something.indexOf(foo, 0, another) !== -1',
		'_.indexOf(foo, bar) !== -1',
		'lodash.indexOf(foo, bar) !== -1',
		'underscore.indexOf(foo, bar) !== -1'
	],
	invalid: [
		{
			code: '\'foobar\'.indexOf(\'foo\') !== -1',
			output: '\'foobar\'.includes(\'foo\')',
			errors
		},
		{
			code: 'str.indexOf(\'foo\') != -1',
			output: 'str.includes(\'foo\')',
			errors
		},
		{
			code: 'str.indexOf(\'foo\') > -1',
			output: 'str.includes(\'foo\')',
			errors
		},
		{
			code: 'str.indexOf(\'foo\') == -1',
			output: '!str.includes(\'foo\')',
			errors
		},
		{
			code: '\'foobar\'.indexOf(\'foo\') >= 0',
			output: '\'foobar\'.includes(\'foo\')',
			errors
		},
		{
			code: '[1,2,3].indexOf(4) !== -1',
			output: '[1,2,3].includes(4)',
			errors
		},
		{
			code: 'str.indexOf(\'foo\') < 0',
			output: '!str.includes(\'foo\')',
			errors
		},
		{
			code: '\'\'.indexOf(\'foo\') < 0',
			output: '!\'\'.includes(\'foo\')',
			errors
		},
		{
			code: '(a || b).indexOf(\'foo\') === -1',
			output: '!(a || b).includes(\'foo\')',
			errors
		},
		{
			code: 'foo.indexOf(bar, 0) !== -1',
			output: 'foo.includes(bar)',
			errors
		},
		{
			code: 'foo.indexOf(bar, 1) !== -1',
			output: 'foo.includes(bar, 1)',
			errors
		}
	]
});
