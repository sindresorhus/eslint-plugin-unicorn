import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// Index access
test.snapshot({
	valid: [
		'array.at(-1)',
		'array[array.length - 0];',
		'array[array.length + 1]',
		'array[array.length + -1]',
		'foo[bar.length - 1]',
		'array?.[array.length - 1];',
		// LHS
		'array[array.length - 1] = 1',
		'array[array.length - 1] %= 1',
		'++ array[array.length - 1]',
		'array[array.length - 1] --',
		'delete array[array.length - 1]',
	],
	invalid: [
		'array[array.length - 1];',
		'array[array.length - 9];',
		'array[0][array[0].length - 1];',
		'array[(( array.length )) - 1];',
		'array[array.length - (( 1 ))];',
		'array[(( array.length - 1 ))];',
		'(( array ))[array.length - 1];',
		'(( array[array.length - 1] ));',
		'array[array.length - 1].pop().shift()[0];',
		'a = array[array.length - 1]',
		'const a = array[array.length - 1]',
		'const {a = array[array.length - 1]} = {}',
		'typeof array[array.length - 1]',
	],
});

// `String#charAt`
test.snapshot({
	valid: [
		'string.charAt(string.length - 0);',
		'string.charAt(string.length + 1)',
		'string.charAt(string.length + -1)',
		'foo.charAt(bar.length - 1)',
		'string?.charAt?.(string.length - 1);',
		'string?.charAt(string.length - 1);',
		'string.charAt(9);',
	],
	invalid: [
		'string.charAt(string.length - 1);',
		'string.charAt(string.length - 0o11);',
		'some.string.charAt(some.string.length - 1);',
		'string.charAt((( string.length )) - 0xFF);',
		'string.charAt(string.length - (( 1 )));',
		'string.charAt((( string.length - 1 )));',
		'(( string )).charAt(string.length - 1);',
		'(( string.charAt ))(string.length - 1);',
		'(( string.charAt(string.length - 1) ));',
	],
});

// `.slice()` with one argument
test.snapshot({
	valid: [
		'array.slice(-1)',
		'new array.slice(-1)',
		'array.slice(-0)[0]',
		'array.slice(-9).pop()',
		'array.slice(-1.1)[0]',
		'array.slice(-1)?.[0]',
		'array.slice?.(-1)[0]',
		'array?.slice(-1)[0]',
		'array.notSlice(-1)[0]',
		'array.slice()[0]',
		'array.slice(...[-1])[0]',
		'array.slice(-1).shift?.()',
		'array.slice(-1)?.shift()',
		'array.slice(-1).shift(...[])',
		'new array.slice(-1).shift()',
		// LHS
		'array.slice(-1)[0] += 1',
		'++ array.slice(-1)[0]',
		'array.slice(-1)[0] --',
		'delete array.slice(-1)[0]',
	],
	invalid: [
		'array.slice(-1)[0]',
		'array.slice(-1).pop()',
		'array.slice(-1.0).shift()',
		'array.slice(-9)[0]',
		'array.slice(-0xA)[0b000]',
		'array.slice(-9).shift()',
		'array.slice(-1)[(( 0 ))];',
		'array.slice(-(( 1 )))[0];',
		'array.slice((( -1 )))[0];',
		'(( array.slice(-1) ))[0];',
		'(( array )).slice(-1)[0];',
		'(( array.slice(-1)[0] ));',
		'(( array.slice(-1) )).pop();',
		'(( array.slice(-1).pop ))();',
		'(( array.slice(-1).pop() ));',
		'array.slice(-1)[0].pop().shift().slice(-1)',
	],
});

// `.slice()` with 2 arguments, and `endIndex` is 1 greater than `startIndex`
test.snapshot({
	valid: [
		'array.slice(-9.1, -8.1)[0]',
	],
	invalid: [
		'array.slice(-9, -8)[0]',
		'array.slice(-9, -0o10)[0]',
		'array.slice(-9, -8).pop()',
		'array.slice(-9, -8).shift()',
		'array.slice((( -9 )), (( -8 )), ).shift()',
		'(( array.slice(-9, -8).shift ))()',
	],
});

// `.slice()` with 2 arguments
test.snapshot({
	valid: [
		'array.slice(-unknown, -unknown2)[0]',
		'array.slice(-9.1, unknown)[0]',
		'array.slice(-9, unknown).pop()',
		'array.slice(-9, ...unknown)[0]',
		'array.slice(...[-9], unknown)[0]',
	],
	invalid: [
		'array.slice(-9, unknown)[0]',
		'array.slice(-0o11, -7)[0]',
		'array.slice(-9, unknown).shift()',
		'const KNOWN = -8; array.slice(-9, KNOWN).shift()',
		'array.slice(-9, 0)[0]',
		'(( (( array.slice( ((-9)), ((unknown)), ).shift ))() ));',
		'array.slice(-9, (a, really, _really, complicated, second) => argument)[0]',
	],
});

// Functions to get last element
test.snapshot({
	valid: [
		'new _.last(array)',
		'_.last(array, 2)',
		'_.last(...array)',
	],
	invalid: [
		'_.last(array)',
		'lodash.last(array)',
		'underscore.last(array)',
		// Should add `()` to `new Array`
		'_.last(new Array)',
		// Semicolon
		outdent`
			const foo = []
			_.last([bar])
		`,
		outdent`
			const foo = []
			_.last( new Array )
		`,
		outdent`
			const foo = []
			_.last( (( new Array )) )
		`,
		'if (foo) _.last([bar])',
		{
			code: '_.last(getLast(utils.lastOne(array)))',
			options: [{getLastElementFunctions: ['getLast', '  utils.lastOne  ']}],
		},
	],
});

// `checkAllIndexAccess` option
const setCheckAllIndexAccessTrue = cases => cases.map(testCase => {
	testCase = typeof testCase === 'string' ? {code: testCase} : testCase;
	return {...testCase, options: [{checkAllIndexAccess: true}]};
});
test.snapshot({
	valid: setCheckAllIndexAccessTrue([
		'++array[1]',
		'const offset = 5;const extraArgument = 6;string.charAt(offset + 9, extraArgument)',
		'array[unknown]',
		'array[-1]',
		'array[1.5]',
		'array[1n]',
	]),
	invalid: setCheckAllIndexAccessTrue([
		'array[0]',
		'array[1]',
		'array[5 + 9]',
		'const offset = 5;array[offset + 9]',
		'array[array.length - 1]',
		// `charAt` don't care about value
		'string.charAt(9)',
		'string.charAt(5 + 9)',
		'const offset = 5;string.charAt(offset + 9)',
		'string.charAt(unknown)',
		'string.charAt(-1)',
		'string.charAt(1.5)',
		'string.charAt(1n)',
		'string.charAt(string.length - 1)',
		'foo.charAt(bar.length - 1)',
	]),
});
