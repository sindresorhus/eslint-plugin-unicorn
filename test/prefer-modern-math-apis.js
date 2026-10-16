import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Modern APIs can change rounding, overflow, and underflow behavior
test({
	valid: [],
	invalid: [
		['const x = 1e200, y = 1; Math.sqrt(x * x + y * y);', 'const x = 1e200, y = 1; Math.hypot(x, y);', 'Math.hypot(…)'],
		['Math.log(3) * Math.LOG10E;', 'Math.log10(3);', 'Math.log10(…)'],
		['Math.log(1000) / Math.LN10;', 'Math.log10(1000);', 'Math.log10(…)'],
		['Math.log(9) / Math.LN2;', 'Math.log2(9);', 'Math.log2(…)'],
		['Math.sqrt(1e200 ** 2);', 'Math.abs(1e200);', 'Math.abs(…)'],
		['Math.sqrt(1e-200 ** 2);', 'Math.abs(1e-200);', 'Math.abs(…)'],
	].map(([code, output, replacement]) => ({
		code,
		errors: [{
			messageId: 'prefer-modern-math-apis',
			suggestions: [{messageId: 'suggestion', data: {replacement}, output}],
		}],
	})),
});

// Sums with additions on both sides
test.snapshot({
	valid: [],
	invalid: [
		'Math.sqrt((a ** 2 + b ** 2) + (c ** 2 + d ** 2));',
		'Math.sqrt(a ** 2 + ((b ** 2 + c ** 2) + (d * d + e ** 2)));',
		'Math.sqrt(((a ** 2 + b ** 2) + (c ** 2 + d ** 2)) + ((e ** 2 + f ** 2) + (g ** 2 + h ** 2)));',
		'Math.sqrt((((a ** 2 + b ** 2))) + (((c ** 2 + d ** 2))),);',
		{
			code: 'Math.sqrt(((a as number) ** 2 + b ** 2) + (c ** 2 + d ** 2));',
			languageOptions: {parser: parsers.typescript},
		},
		'Math.sqrt((a ** 2 + b ** 2) /* keep */ + (c ** 2 + d ** 2));',
		'Math.sqrt((a ** /* keep */ 2 + b ** 2) + (c ** 2 + d ** 2));',
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
test.snapshot({
	valid: [],
	invalid: [
		'Math.log(/* keep */ x) * Math.LOG10E;',
		'Math.log(x) // keep\n\t* Math.LOG10E;',
		'Math.log(x) / Math.LN10;',
		'Math.log(x) / /* keep */ Math.LN10;',
		'Math.sqrt(a ** /* keep */ 2);',
		'Math.sqrt(a ** // keep\n\t2);',
		// A comment inside the argument is kept by the replacement
		'Math.log(x /* keep */ + 1) * Math.LOG10E;',
		'Math.log((/* keep */ x)) / Math.LN2;',
	],
});

// Each replacement remains a suggestion even for ordinary inputs
test({
	valid: [],
	invalid: [
		['Math.log(value) * Math.LOG10E;', 'Math.log10(value);'],
		['Math.LOG10E * Math.log(value);', 'Math.log10(value);'],
		['Math.log(value) * Math.LOG2E;', 'Math.log2(value);'],
		['Math.LOG2E * Math.log(value);', 'Math.log2(value);'],
		['Math.log(value) / Math.LN10;', 'Math.log10(value);'],
		['Math.log(value) / Math.LN2;', 'Math.log2(value);'],
		['Math.sqrt(value * value);', 'Math.abs(value);'],
		['Math.sqrt(value ** 2);', 'Math.abs(value);'],
		['Math.sqrt(first * first + second * second);', 'Math.hypot(first, second);'],
		['Math.sqrt(first ** 2 + second ** 2);', 'Math.hypot(first, second);'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'prefer-modern-math-apis',
			suggestions: [{messageId: 'suggestion', output}],
		}],
	})),
});

// Numerical differences also occur with underflow and special values
test.snapshot({
	valid: [],
	invalid: [
		'const x = 1e-200, y = 1e-200; Math.sqrt(x * x + y * y);',
		'Math.sqrt(Infinity ** 2 + NaN ** 2);',
		'Math.sqrt(Number.MAX_VALUE ** 2 + Number.MIN_VALUE ** 2);',
		'const x = 1e200; Math.sqrt(x * x);',
		'const x = 1e-200; Math.sqrt(x * x);',
		'Math.LOG2E * Math.log(9);',
		'Math.LOG10E * Math.log(3);',
	],
});

// Optional calls, computed methods, and unrelated arithmetic are ignored
test.snapshot({
	valid: [
		'Math.log?.(x) * Math.LOG10E;',
		'Math.LOG2E * Math.log?.(x);',
		'Math.log?.(x) / Math.LN2;',
		'Math["log"](x) * Math.LOG10E;',
		'Math.log(x) / Math["LN10"];',
		'Math.sqrt();',
		'Math.sqrt(a ** 2, b ** 2);',
		'Math.sqrt(...squares);',
		'Math.sqrt?.(a ** 2 + b ** 2);',
		'Math?.sqrt(a ** 2 + b ** 2);',
		'Math["sqrt"](a ** 2 + b ** 2);',
		'new Math.sqrt(a ** 2 + b ** 2);',
		'math.sqrt(a ** 2 + b ** 2);',
		'Math.sqrt(a ** 2 + b);',
		'Math.sqrt(a ** 2 + b ** 3);',
		'Math.sqrt(a ** 2 * b ** 2);',
		'Math.sqrt(getValue() * getValue());',
		'Math.sqrt(a * b + c * c);',
	],
	invalid: [],
});

// Preserve the surrounding expression and complex arguments
test.snapshot({
	valid: [],
	invalid: [
		'const result = 2 * (Math.log(value) / Math.LN10);',
		'const result = (Math.log(value) * Math.LOG2E) ** 2;',
		'Math.log(getValue()) * Math.LOG10E;',
		'async function calculate() { return Math.log(await getValue()) / Math.LN2; }',
		'function * calculate() { return Math.log(yield value) * Math.LOG2E; }',
		'Math.log(value = nextValue) / Math.LN10;',
		'Math.LOG10E * Math.log(condition ? first : second);',
		'(Math).log(value,) / (Math.LN2);',
		'const distance = Math.sqrt(point.x * point.x + point.y * point.y);',
		'Math.sqrt(values[index] * values[index] + other ** 2);',
		'Math.sqrt((first + second) ** 2 + (third ? fourth : fifth) ** 2);',
		'Math.sqrt(getValue() ** 2 + other ** 2);',
		'Math.sqrt((first, second) ** 2 + third ** 2);',
		'Math.sqrt(value ** 2).toFixed(2);',
		{
			code: 'const result = <span>{Math.log(value) / Math.LN10}</span>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'const result = <>{Math.sqrt(first ** 2 + second ** 2)}</>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'Math.log(Math.sqrt(value ** 2)) / Math.LN10;',
		'Math.sqrt((Math.log(value) * Math.LOG2E) ** 2 + other ** 2);',
	],
});

// TypeScript syntax inside arguments is preserved by suggestions
test.snapshot({
	valid: [],
	invalid: [
		'Math.log(value as number) * Math.LOG10E;',
		'Math.LOG2E * Math.log(<number>value);',
		'Math.log(value!) / Math.LN2;',
		'Math.log(value satisfies number) / Math.LN10;',
		'Math.log(getValue<number>()) * Math.LOG2E;',
		'Math.sqrt((value as number) ** 2);',
		'Math.sqrt((<number>value) ** 2);',
		'Math.sqrt(value! * value!);',
		'Math.sqrt((value satisfies number) ** 2);',
		'Math.sqrt(first! ** 2 + (second as number) ** 2);',
		'Math.sqrt(getValue<number>() ** 2 + second ** 2);',
		'Math.sqrt(value ** 2) satisfies number;',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
});

// Removed comments suppress suggestions, including aborts after earlier edits
test.snapshot({
	valid: [],
	invalid: [
		'Math.LOG10E /* keep */ * Math.log(value);',
		'Math.LOG2E * Math.log(/* keep */ value);',
		'Math.log(value) /* keep */ / Math.LN2;',
		'Math /* keep */ .log(value) * Math.LOG10E;',
		'Math.log(value) * Math./* keep */LOG2E;',
		'Math.sqrt(value * /* keep */ value);',
		'Math.sqrt(first ** 2 + second ** /* keep */ 2);',
		'Math.sqrt((first ** 2 + second ** 2) + (third * /* keep */ third + fourth ** 2));',
		'Math.log((/* keep */ value)) * Math.LOG2E;',
		'Math.LOG10E * Math.log(value /* keep */ + offset);',
		'Math.sqrt(/* keep */ first ** 2 + second ** 2);',
		'Math.sqrt((/* keep */ first) ** 2 + second ** 2);',
		'Math.sqrt(first ** 2 + /* keep */ second ** 2);',
		'Math /* keep */ .sqrt(value ** 2);',
		'Math.sqrt(first ** 2 // keep\n  + second ** 2);',
		'Math.sqrt(first ** 2 + // keep\n  second ** 2);',
		'Math.log(Math.sqrt(value ** 2)) /* keep */ / Math.LN10;',
		'Math.sqrt((Math.log(/* keep */ value) * Math.LOG2E) ** 2 + other ** 2);',
		'function distance() {\r\n  return Math.sqrt(\r\n    first ** 2 +\r\n    second ** 2\r\n  );\r\n}',
		'function logarithm() {\r\n  return (\r\n    Math.log(value /* keep */ + offset)\r\n      / Math.LN10\r\n  );\r\n}',
	],
});
