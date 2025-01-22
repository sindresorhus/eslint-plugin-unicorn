import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = "123.1000"',
		'foo("123.1000")',
		'const foo = 1',
		'const foo = 1 + 2',
		'const foo = -1',
		'const foo = 123123123',
		'const foo = 1.1',
		'const foo = -1.1',
		'const foo = 123123123.4',
		'const foo = 1e3',
		'1 .toString()',
	],
	invalid: [
		'const foo = 1.0',
		'const foo = 1.0 + 1',
		'foo(1.0 + 1)',
		'const foo = 1.00',
		'const foo = 1.00000',
		'const foo = -1.0',
		'const foo = 123123123.0',
		'const foo = 123.11100000000',
		'const foo = 1.',
		'const foo = +1.',
		'const foo = -1.',
		'const foo = 1.e10',
		'const foo = +1.e-10',
		'const foo = -1.e+10',
		'const foo = (1.).toString()',
		...[
			'123_000.',
			'123_000.0',
			'123_000.000',
			'123_000.000_000',
			'123_000.123_000',
			'123_000.000_400',
		]
			.flatMap(number => [
				number,
				`${number}e1`,
				`${number}e+1`,
				`${number}e-1`,
				`${number}e0`,
				`${number}e+0`,
				`${number}e-0`,
				`${number}e10`,
				`${number}e+10`,
				`${number}e-10`,
				`${number}E-10`,
				`${number}E-10_10`,
			])
			.flatMap(number => [
				`+${number}`,
				`-${number}`,
			])
			.map(number => `${number};`),
		'1.00.toFixed(2)',
		'1.00 .toFixed(2)',
		'(1.00).toFixed(2)',
		'1.00?.toFixed(2)',
		outdent`
			console.log()
			1..toString()
		`,
		outdent`
			console.log()
			a[1.].toString()
		`,
		outdent`
			console.log()
			1.00e10.toString()
		`,
		outdent`
			console.log()
			a[1.00e10].toString()
		`,
		'a = .0;',
		'a = .0.toString()',
		'function foo(){return.0}',
		'function foo(){return.0.toString()}',
		'function foo(){return.0+.1}',
		outdent`
			console.log()
			.0.toString()
		`,
	],
});
