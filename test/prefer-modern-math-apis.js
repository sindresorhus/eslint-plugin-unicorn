import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Sums with additions on both sides
test({
	valid: [],
	invalid: [
		{
			code: 'Math.sqrt((a ** 2 + b ** 2) + (c ** 2 + d ** 2));',
			output: 'Math.hypot(a, b, c, d);',
			errors: 1,
		},
		{
			code: 'Math.sqrt(a ** 2 + ((b ** 2 + c ** 2) + (d * d + e ** 2)));',
			output: 'Math.hypot(a, b, c, d, e);',
			errors: 1,
		},
		{
			code: 'Math.sqrt(((a ** 2 + b ** 2) + (c ** 2 + d ** 2)) + ((e ** 2 + f ** 2) + (g ** 2 + h ** 2)));',
			output: 'Math.hypot(a, b, c, d, e, f, g, h);',
			errors: 1,
		},
		{
			code: 'Math.sqrt((((a ** 2 + b ** 2))) + (((c ** 2 + d ** 2))),);',
			output: 'Math.hypot(a, b, c, d,);',
			errors: 1,
		},
		{
			code: 'Math.sqrt(((a as number) ** 2 + b ** 2) + (c ** 2 + d ** 2));',
			output: 'Math.hypot((a as number), b, c, d);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'Math.sqrt((a ** 2 + b ** 2) /* keep */ + (c ** 2 + d ** 2));',
			output: 'Math.hypot(a, b /* keep */, c, d);',
			errors: 1,
		},
		{
			code: 'Math.sqrt((a ** /* keep */ 2 + b ** 2) + (c ** 2 + d ** 2));',
			errors: 1,
		},
	],
});

// `Math.log10()` and `Math.log2()`
const duplicateLog10Test = code => [
	code,
	// `Math.log2()` test
	code.replaceAll('Math.LOG10E', 'Math.LOG2E').replaceAll('Math.LN10', 'Math.LN2'),
];
test.snapshot({
	valid: [
		'Math.log(x) * Math.log(x)',

		'Math.LOG10E * Math.LOG10E',
		'Math.log(x) * Math[LOG10E]',
		'Math.log(x) * LOG10E',
		'Math[log](x) * Math.LOG10E',
		'foo.Math.log(x) * Math.LOG10E',
		'Math.log(x) * foo.Math.LOG10E',
		'Math.log(x) * Math.NOT_LOG10E',
		'Math.log(x) * Math?.LOG10E',
		'Math?.log(x) * Math.LOG10E',
		'log(x) * Math.LOG10E',
		'new Math.log(x) * Math.LOG10E',
		'Math.not_log(x) + Math.LOG10E',
		'Math.log(x)[Math.LOG10E]',
		'Math.log() * Math.LOG10E',
		'Math.log(x, extraArgument) * Math.LOG10E',
		'Math.log(...x) * Math.LOG10E',

		'Math.LN10 / Math.LN10',
		'Math.log(x) /Math[LN10]',
		'Math.log(x) / LN10',
		'Math[log](x) / Math.LN10',
		'foo.Math.log(x) / Math.LN10',
		'Math.log(x) / foo.Math.LN10',
		'Math.log(x) / Math.log(x)',
		'Math.log(x) / Math.NOT_LN10',
		'Math.log(x) / Math?.LN10',
		'Math?.log(x) / Math.LN10',
		'log(x) / Math.LN10',
		'new Math.log(x) / Math.LN10',
		'Math.not_log(x) + Math.LN10',
		'Math.log(x)[Math.LN10]',
		'Math.log() / Math.LN10',
		'Math.log(x, extraArgument) / Math.LN10',
		'Math.log(...x) / Math.LN10',
	].flatMap(code => duplicateLog10Test(code)),
	invalid: [
		'Math.log(x) * Math.LOG10E',
		'Math.LOG10E * Math.log(x)',
		'Math.log(x) / Math.LN10',
		'Math.log((( 0,x ))) * Math.LOG10E',
		'Math.LOG10E * Math.log((( 0,x )))',
		'Math.log((( 0,x ))) / Math.LN10',
		outdent`
			function foo(x) {
				return (
					Math.log(x)
						/ Math.LN10
				);
			}
		`,
	].flatMap(code => duplicateLog10Test(code)),
});

// `Math.hypot`
test.snapshot({
	valid: [
		'Math.notSqrt(a ** 2 + b ** 2)',
		'NotMath.sqrt(a ** 2 + b ** 2)',
		'Math.sqrt(a ** 2 - b ** 2)',
		'Math.sqrt(a ** 2 + 2 ** b)',
		'Math.sqrt(a * c + b * c)',
		'Math.sqrt((++a) * (++a))',
		// Leave this to `prefer-exponentiation-operator` rule
		'Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))',
	],
	invalid: [
		'Math.sqrt(a * a + b * b)',
		'Math.sqrt(a ** 2 + b ** 2)',
		'Math.sqrt(a * a + b ** 2)',
		'Math.sqrt(a * a + b * b + c * c)',
		'Math.sqrt(a ** 2 + b ** 2 + c ** 2)',
		'Math.sqrt(a * a)',
		'Math.sqrt(a ** 2)',
		'Math.sqrt(a * a,)',
		'Math.sqrt(a ** 2,)',
		'Math.sqrt((a, b) ** 2)',
		'Math.sqrt((++a) ** 2)',
		'Math.sqrt(a * a + b * b,)',
		'Math.sqrt(a ** 2 + b ** 2,)',
		'Math.sqrt((( a ** 2 )) + (( b ** 2 + c ** 2 )) + (( d )) * (( d )) + (( e )) ** (( 2 )))',
	],
});

// A comment inside the replaced range must not be dropped
test({
	valid: [],
	invalid: [
		{
			code: 'Math.log(/* keep */ x) * Math.LOG10E;',
			errors: 1,
		},
		{
			code: 'Math.log(x) // keep\n\t* Math.LOG10E;',
			errors: 1,
		},
		{
			code: 'Math.log(x) / Math.LN10;',
			output: 'Math.log10(x);',
			errors: 1,
		},
		{
			code: 'Math.log(x) / /* keep */ Math.LN10;',
			errors: 1,
		},
		{
			code: 'Math.sqrt(a ** /* keep */ 2);',
			errors: 1,
		},
		{
			code: 'Math.sqrt(a ** // keep\n\t2);',
			errors: 1,
		},
		// A comment inside the argument is kept by the replacement
		{
			code: 'Math.log(x /* keep */ + 1) * Math.LOG10E;',
			output: 'Math.log10(x /* keep */ + 1);',
			errors: 1,
		},
		{
			code: 'Math.log((/* keep */ x)) / Math.LN2;',
			output: 'Math.log2((/* keep */ x));',
			errors: 1,
		},
	],
});
