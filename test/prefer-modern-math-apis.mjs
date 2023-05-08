import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// `Math.log10()` and `Math.log2()`
const duplicateLog10Test = code => [
	code,
	// `Math.log2()` test
	code.replace(/Math\.LOG10E/g, 'Math.LOG2E').replace(/Math\.LN10/g, 'Math.LN2'),
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
		'Math.sqrt((++a) ** 2)',
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
		'Math.sqrt(a * a + b * b,)',
		'Math.sqrt(a ** 2 + b ** 2,)',
		'Math.sqrt((( a ** 2 )) + (( b ** 2 + c ** 2 )) + (( d )) * (( d )) + (( e )) ** (( 2 )))',
	],
});
