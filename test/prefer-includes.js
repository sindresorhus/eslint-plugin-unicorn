import {test} from './utils/test.js';

test.snapshot({
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
		'\'foobar\'.indexOf(\'foo\') !== -1',
		'str.indexOf(\'foo\') != -1',
		'str.indexOf(\'foo\') > -1',
		'str.indexOf(\'foo\') == -1',
		'\'foobar\'.indexOf(\'foo\') >= 0',
		'[1,2,3].indexOf(4) !== -1',
		'str.indexOf(\'foo\') < 0',
		'\'\'.indexOf(\'foo\') < 0',
		'(a || b).indexOf(\'foo\') === -1',
		'foo.indexOf(bar, 0) !== -1',
		'foo.indexOf(bar, 1) !== -1'
	]
});
