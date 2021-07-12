import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const ts = Date.now()',

		// Test `new Date()`
		// Not `NewExpression`
		'+Date()',
		'+ Date',
		// Not `Identifier`
		'+ new window.Date()',
		// Not `Date`
		'+ new Moments()',
		// More arguments
		'+ new Date(0)',
		'+ new Date(...[])',

		// Test `new Date().getTime()` and `new Date().valueOf()`
		// Not `CallExpression`
		'new Date.getTime()',
		// Not `MemberExpression`
		'valueOf()',
		// `computed`
		'new Date()[getTime]()',
		// Not `Identifier`
		'new Date()["valueOf"]()',
		// Not listed names
		'new Date().notListed(0)',
		// More arguments
		'new Date().getTime(0)',
		'new Date().valueOf(...[])',

		// Test `Number(new Date())` and `BigInt(new Date())`
		// Not `CallExpression`
		'new Number(new Date())',
		// Not `Identifier`
		'window.BigInt(new Date())',
		// Not listed names
		'toNumber(new Date())',
		// More/less arguments
		'BigInt()',
		'Number(new Date(), extraArgument)',
		'BigInt([...new Date()])',

		// Test `+ new Date()` / `- new Date()`
		// Not `UnaryExpression`
		'throw new Date()',
		// Not `+/-`
		'typeof new Date()',

		// Test `AssignmentExpression`
		// Not `AssignmentExpression`
		'const foo = () => {return new Date()}',
		// `operator` not listed
		'foo += new Date()',

		// Test `BinaryExpression`
		// Not `BinaryExpression`
		'function * foo() {yield new Date()}',
		// `operator` not listed
		'new Date() + new Date()',

		// We are not checking these cases
		'foo = new Date() | 0',
		'foo &= new Date()',
		'foo = new Date() >> 0',
	],
	invalid: [
		// `Date` methods
		'const ts = new Date().getTime();',
		'const ts = (new Date).getTime();',
		'const ts = (new Date()).getTime();',
		'const ts = new Date().valueOf();',
		'const ts = (new Date).valueOf();',
		'const ts = (new Date()).valueOf();',

		// `Number()` and `BigInt()`
		'const ts = /* 1 */ Number(/* 2 */ new /* 3 */ Date( /* 4 */ ) /* 5 */) /* 6 */',
		'const tsBigInt = /* 1 */ BigInt(/* 2 */ new /* 3 */ Date( /* 4 */ ) /* 5 */) /* 6 */',

		// `UnaryExpression`
		'const ts = + /* 1 */ new Date;',
		'const ts = - /* 1 */ new Date();',

		// `BinaryExpression`
		'const ts = new Date() - 0',
		'const foo = bar - new Date',
		'const foo = new Date() * bar',
		'const ts = new Date() / 1',
		'const ts = new Date() % Infinity',
		'const ts = new Date() ** 1',
		'const zero = (new Date(/* 1 */) /* 2 */) /* 3 */ - /* 4 */new Date',

		// `AssignmentExpression`
		'foo -= new Date()',
		'foo *= new Date()',
		'foo /= new Date',
		'foo %= new Date()',
		'foo **= new Date()',
	],
});
