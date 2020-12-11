import {outdent} from 'outdent';
import {test} from './utils/test';

test({
	valid: [
	],
	invalid: [
	]
});

test.visualize([
	// `Date` methods
	'const ts = new Date().getTime();',
	'const ts = (new Date).getTime();',
	'const ts = (new Date()).getTime();',
	'const ts = new Date().valueOf();',
	'const ts = (new Date).valueOf();',
	'const ts = (new Date()).valueOf();',

	// Constructor
	'const ts = /* 1 */ Number(/* 2 */ new /* 3 */ Date( /* 4 */ ) /* 5 */) /* 6 */',
	'const tsBigInt = /* 1 */ BigInt(/* 2 */ new /* 3 */ Date( /* 4 */ ) /* 5 */) /* 6 */',

	// `UnaryExpression`
	'const ts = +new Date;',
	'const ts = -  new Date();',

	// `BinaryExpression`
	'const ts = new Date() - 0',
	'const foo = bar - new Date',
	'const foo = new Date() * bar',
	'const ts = new Date() / 1',
	'const ts = new Date() % Infinity',
	'const ts = new Date() ** 1',
	'const zero = new Date - new Date',

	// `AssignmentExpression`
	'foo -= new Date()',
	'foo *= new Date()',
	'foo /= new Date',
	'foo %= new Date()',
	'foo **= new Date()'
]);
