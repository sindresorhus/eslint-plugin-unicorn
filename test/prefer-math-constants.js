import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Already using the constant
		'Math.PI',
		'const tau = Math.PI * 2;',
		'Math.E',
		// Too few fraction digits to be a confident approximation
		'3.1',
		'2.71',
		'1.41',
		'0.69',
		'2.30',
		'1.44',
		'0.43',
		'0.70',
		// Integer part does not match the constant
		'4.14',
		'5.718',
		// Not an approximation of any constant
		'1.23456',
		'0.12345',
		// More precise than the constant itself, so not an approximation
		'3.1415926535897932',
		// Close to a constant, but rounds to a different value
		'1.4143',
		// TypeScript literal type, where `Math.PI` is not a valid substitution
		{code: 'type Tau = 3.14;', languageOptions: {parser: parsers.typescript}},
		{code: 'const x = y as 3.14;', languageOptions: {parser: parsers.typescript}},
		// Not plain decimals
		'3',
		'0x1F',
		'0b101',
		'3n',
		'3.14e2',
		'1_000',
		// Numeric literal as a property key (cannot be substituted)
		'const object = {3.14: 1};',
		'class Foo {3.14 = 1}',
		'class Foo {3.14() {}}',
		{code: 'interface Foo {3.14: number}', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		// PI
		'3.14',
		'const area = 3.14 * radius ** 2;',
		'3.141',
		'3.1416',
		'3.141592653589793',
		// E
		'2.718',
		'const growth = amount * 2.718;',
		'2.718281828459045',
		// E — rounded form
		'2.7183',
		// LN2
		'0.6931',
		'0.6931471805599453',
		// LN10 — truncated vs rounded forms
		'2.3025',
		'2.3026',
		// LOG2E — truncated vs rounded forms
		'1.4426',
		'1.4427',
		// LOG10E
		'0.4342',
		// SQRT2
		'1.4142',
		// SQRT1_2
		'0.7071',
		// Negative, leading-dot, separators, and nested contexts
		'-3.14',
		'.6931',
		'3.141_592',
		'1 / 3.14',
		'foo(3.14)',
		'[2.718]',
		// Computed key can be substituted
		'const object = {[3.14]: 1};',
		// Computed class member key can be substituted
		'class Foo {[3.14] = 1}',
		// Computed member access can be substituted
		'object[3.14]',
		// JSX expression
		{code: '<div>{3.14}</div>', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		// Comments around the literal must be preserved
		'foo(/* before */ 3.14 /* after */)',
		// TypeScript enum member value can be substituted
		{code: 'enum Foo {a = 3.14}', languageOptions: {parser: parsers.typescript}},
		// TypeScript `satisfies`
		{code: 'const x = 3.14 satisfies number;', languageOptions: {parser: parsers.typescript}},
		// TypeScript
		{code: 'const x = 3.14 as number;', languageOptions: {parser: parsers.typescript}},
		{code: 'const x = <number>3.14;', languageOptions: {parser: parsers.typescript}},
	],
});
