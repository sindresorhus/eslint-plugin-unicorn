import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Math constants have specified values and reuse the numeric safety checks
test({
	valid: [],
	invalid: [
		...['E', 'LN10', 'LN2', 'LOG10E', 'LOG2E', 'PI', 'SQRT1_2', 'SQRT2'].map(name => [
			`Math.sqrt(Math.${name} * Math.${name});`,
			`Math.abs(Math.${name});`,
		]),
		['Math.log(-Math.PI) / Math.LN2;', 'Math.log2(-Math.PI);'],
		['Math.LOG10E * Math.log(-Math.E);', 'Math.log10(-Math.E);'],
		['const value = Math.PI; Math.sqrt(value * value);', 'const value = Math.PI; Math.abs(value);'],
		['const value = -Math.SQRT2; Math.log(value) / Math.LN10;', 'const value = -Math.SQRT2; Math.log10(value);'],
		['Math.sqrt(Math.PI * Math.PI + Infinity ** 2);', 'Math.hypot(Math.PI, Infinity);'],
		['Math.sqrt(NaN ** 2 + Math.SQRT2 ** 2);', 'Math.hypot(NaN, Math.SQRT2);'],
		['void Math.sqrt(Math.E ** 2 + Math.PI ** 2);', 'void Math.hypot(Math.E, Math.PI);'],
		['Math.sqrt((Math./* keep */PI) * Math.PI);', 'Math.abs((Math./* keep */PI));'],
		['delete (Math.log(getValue()) / Math.LN2);', 'delete (Math.log2(getValue()));'],
		['delete (Math.LOG10E * Math.log(value));', 'delete (Math.log10(value));'],
		['delete Math.sqrt(1e200 * 1e200);', 'delete Math.abs(1e200);'],
		['delete Math.sqrt(3 ** 2 + 4 ** 2);', 'delete Math.hypot(3, 4);'],
		['delete (condition && Math.log(value) / Math.LN2);', 'delete (condition && Math.log2(value));'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

test.typescript({
	valid: [],
	invalid: [
		['Math.sqrt((Math.PI as number) * Math.PI);', 'Math.abs((Math.PI as number));'],
		['const value = Math.LN2 as number; Math.sqrt(value * value);', 'const value = Math.LN2 as number; Math.abs(value);'],
		['Math.log(-(Math.SQRT2 as number)) / Math.LN2;', 'Math.log2(-(Math.SQRT2 as number));'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

// Constants do not prove approximate formulas safe, and other Math properties are unknown
test.snapshot({
	valid: [],
	invalid: [
		'Math.log(Math.E) / Math.LN2;',
		'Math.log(Math.LN2) * Math.LOG10E;',
		'Math.sqrt(Math.PI ** 2);',
		'Math.sqrt(Math.E * Math.E + Math.PI * Math.PI);',
		'Math.log(Math.custom) / Math.LN2;',
		'Math.log(Math.random) / Math.LN2;',
		'Math.sqrt(Math["PI"] * Math["PI"]);',
		'Math.log(Math?.PI) / Math.LN2;',
		'Math.sqrt(Math.PI * /* keep */ Math.PI);',
		'delete Math.sqrt(value ** 2);',
		'delete (Math.log(/* keep */ value) / Math.LN2);',
		'delete (Math.log(value) / Math.LN2).property;',
	],
});

// Immutable Number constants use the same numeric safety checks
test({
	valid: [],
	invalid: [
		['Math.log(Number.NaN) / Math.LN2;', 'Math.log2(Number.NaN);'],
		['Math.log(Number./* keep */NaN) / Math.LN2;', 'Math.log2(Number./* keep */NaN);'],
		['Math.log(Number.POSITIVE_INFINITY) * Math.LOG10E;', 'Math.log10(Number.POSITIVE_INFINITY);'],
		['Math.LOG2E * Math.log(Number.NEGATIVE_INFINITY);', 'Math.log2(Number.NEGATIVE_INFINITY);'],
		['Math.log(Number.MIN_SAFE_INTEGER) / Math.LN10;', 'Math.log10(Number.MIN_SAFE_INTEGER);'],
		['Math.log(-Number.MIN_VALUE) / Math.LN2;', 'Math.log2(-Number.MIN_VALUE);'],
		['Math.log(-Number.NEGATIVE_INFINITY) / Math.LN10;', 'Math.log10(-Number.NEGATIVE_INFINITY);'],
		['Math.sqrt(Number.NaN ** 2);', 'Math.abs(Number.NaN);'],
		['Math.sqrt(Number.POSITIVE_INFINITY ** 2);', 'Math.abs(Number.POSITIVE_INFINITY);'],
		['Math.sqrt(Number.NEGATIVE_INFINITY ** 2);', 'Math.abs(Number.NEGATIVE_INFINITY);'],
		['Math.sqrt((-Number.POSITIVE_INFINITY) ** 2);', 'Math.abs((-Number.POSITIVE_INFINITY));'],
		['Math.sqrt((+Number.POSITIVE_INFINITY) ** 2);', 'Math.abs((+Number.POSITIVE_INFINITY));'],
		['Math.sqrt(Number.EPSILON * Number.EPSILON);', 'Math.abs(Number.EPSILON);'],
		['Math.sqrt(Number.MAX_SAFE_INTEGER * Number.MAX_SAFE_INTEGER);', 'Math.abs(Number.MAX_SAFE_INTEGER);'],
		['Math.sqrt(Number.MIN_SAFE_INTEGER * Number.MIN_SAFE_INTEGER);', 'Math.abs(Number.MIN_SAFE_INTEGER);'],
		['Math.sqrt(Number.MAX_VALUE * Number.MAX_VALUE + Number.NaN ** 2);', 'Math.hypot(Number.MAX_VALUE, Number.NaN);'],
		['Math.sqrt(Number.NEGATIVE_INFINITY ** 2 + 3 ** 2);', 'Math.hypot(Number.NEGATIVE_INFINITY, 3);'],
		['const value = Number.NaN; Math.log(value) / Math.LN2;', 'const value = Number.NaN; Math.log2(value);'],
		['const value = -Number.POSITIVE_INFINITY; Math.sqrt(value ** 2);', 'const value = -Number.POSITIVE_INFINITY; Math.abs(value);'],
		['void Math.sqrt(Number.MAX_VALUE ** 2 + Number.MIN_VALUE ** 2);', 'void Math.hypot(Number.MAX_VALUE, Number.MIN_VALUE);'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

test.typescript({
	valid: [],
	invalid: [
		['Math.log(Number.NaN as number) / Math.LN2;', 'Math.log2(Number.NaN as number);'],
		['const value = Number.POSITIVE_INFINITY as number; Math.sqrt(value ** 2);', 'const value = Number.POSITIVE_INFINITY as number; Math.abs(value);'],
		['Math.log(-(Number.MIN_VALUE as number)) * Math.LOG2E;', 'Math.log2(-(Number.MIN_VALUE as number));'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

// Known constants can still change numerical results; other properties are unknown
test.snapshot({
	valid: [],
	invalid: [
		'Math.sqrt(Number.MAX_VALUE * Number.MAX_VALUE);',
		'Math.sqrt(Number.MIN_VALUE * Number.MIN_VALUE);',
		'Math.sqrt(Number.EPSILON ** 2);',
		'Math.sqrt(Number.NaN ** 2 + Number.POSITIVE_INFINITY ** 2);',
		'Math.log(Number.EPSILON) / Math.LN2;',
		'Math.log(Number.MIN_VALUE) / Math.LN2;',
		'Math.log(Number.length) / Math.LN2;',
		'Math.log(Number.custom) / Math.LN2;',
		'Math.log(Number["NaN"]) / Math.LN2;',
		'Math.log(Number?.NaN) / Math.LN2;',
		'Math.log(Number.prototype) / Math.LN2;',
		'Math.log(other.NaN) / Math.LN2;',
		'Math.log(Number.NaN /* keep */ + value) / Math.LN2;',
		'Math.sqrt(Number.NaN ** /* keep */ 2);',
	],
});

// NaN propagation and contexts that do not observe the numeric value
test({
	valid: [],
	invalid: [
		['Math.sqrt(NaN ** 2 + 3 ** 2);', 'Math.hypot(NaN, 3);'],
		['Math.sqrt(1e200 * 1e200 + NaN ** 2);', 'Math.hypot(1e200, NaN);'],
		['Math.sqrt("not a number" ** 2 + 0 ** 2);', 'Math.hypot("not a number", 0);'],
		['const value = NaN; Math.sqrt((0 ** 2 + value ** 2) + 4 * 4);', 'const value = NaN; Math.hypot(0, value, 4);'],
		['Math.log(undefined) / Math.LN2;', 'Math.log2(undefined);'],
		['const value = undefined; Math.log(value) * Math.LOG10E;', 'const value = undefined; Math.log10(value);'],
		['Math.sqrt(undefined ** 2);', 'Math.abs(undefined);'],
		['Math.sqrt(undefined ** 2 + 4 * 4);', 'Math.hypot(undefined, 4);'],
		['for (Math.log(value) / Math.LN2; condition; update()) {}', 'for (Math.log2(value); condition; update()) {}'],
		['for (; condition; Math.LOG10E * Math.log(getValue())) {}', 'for (; condition; Math.log10(getValue())) {}'],
		['for (start(); condition; next(), Math.log(value) / Math.LN10) {}', 'for (start(); condition; next(), Math.log10(value)) {}'],
		['typeof (Math.log(value) * Math.LOG2E);', 'typeof (Math.log2(value));'],
		['const type = typeof (Math.LOG10E * Math.log(getValue()));', 'const type = typeof (Math.log10(getValue()));'],
		['void (condition ? Math.log(value) / Math.LN2 : fallback());', 'void (condition ? Math.log2(value) : fallback());'],
		['void (condition ? fallback() : Math.log(value) / Math.LN10);', 'void (condition ? fallback() : Math.log10(value));'],
		['void (condition && Math.log(value) / Math.LN2);', 'void (condition && Math.log2(value));'],
		['const type = typeof (condition || Math.log(value) * Math.LOG10E);', 'const type = typeof (condition || Math.log10(value));'],
		['const result = (condition ?? Math.log(value) / Math.LN2, next());', 'const result = (condition ?? Math.log2(value), next());'],
		['void (first ? second && (next(), Math.log(getValue()) / Math.LN2) : fallback());', 'void (first ? second && (next(), Math.log2(getValue())) : fallback());'],
		['for (; condition; flag ? Math.log(value) / Math.LN2 : fallback()) {}', 'for (; condition; flag ? Math.log2(value) : fallback()) {}'],
		['void Math.sqrt(4 ** 2);', 'void Math.abs(4);'],
		['void Math.sqrt(1e200 * 1e200);', 'void Math.abs(1e200);'],
		['typeof Math.sqrt(3 * 3 + 4 * 4);', 'typeof Math.hypot(3, 4);'],
		['void Math.sqrt(NaN ** 2 + Infinity ** 2);', 'void Math.hypot(NaN, Infinity);'],
		['const result = (Math.sqrt(3 ** 2 + 4 ** 2), next());', 'const result = (Math.hypot(3, 4), next());'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

test.typescript({
	valid: [],
	invalid: [
		['Math.sqrt((NaN as number) ** 2 + 3 ** 2);', 'Math.hypot((NaN as number), 3);'],
		['Math.log(undefined as undefined) / Math.LN2;', 'Math.log2(undefined as undefined);'],
		['for ((Math.log(value) / Math.LN2) as number; condition; update()) {}', 'for ((Math.log2(value)) as number; condition; update()) {}'],
		['typeof ((Math.log(value) / Math.LN2) satisfies number);', 'typeof ((Math.log2(value)) satisfies number);'],
		['void ((condition ? (Math.log(value) / Math.LN2) as number : fallback()) satisfies number);', 'void ((condition ? (Math.log2(value)) as number : fallback()) satisfies number);'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

// These contexts still observe a result or can change coercion and errors
test.snapshot({
	valid: [],
	invalid: [
		'Math.sqrt(NaN ** 2 + value ** 2);',
		'Math.sqrt(undefined ** 2 + Infinity ** 2);',
		'const result = condition ? Math.log(value) / Math.LN2 : fallback();',
		'const result = condition && Math.log(value) / Math.LN2;',
		'void ((Math.log(value) / Math.LN2) ? first() : second());',
		'void ((Math.log(value) / Math.LN2) && next());',
		'for (; Math.log(value) / Math.LN2; update()) {}',
		'for (const value = Math.log(input) / Math.LN2; condition; update()) {}',
		'for (; condition; update()) { Math.log(value) / Math.LN2; }',
		'void Math.sqrt(getValue() ** 2);',
		'void Math.sqrt(1n ** 2);',
		'typeof Math.sqrt(value * value);',
		'void (Math.sqrt(1e-200 * 1e-200) && next());',
		'void (Math.sqrt(1e-200 * 1e-200) ? first() : second());',
		'void Math.sqrt(getValue() ** 2 + 3 ** 2);',
		'void Math.sqrt(4 ** /* keep */ 2);',
		'for (Math.log(/* keep */ value) / Math.LN2; condition; update()) {}',
	],
});

// Special values and explicitly discarded logarithms have exact behavior
test({
	valid: [],
	invalid: [
		['Math.sqrt(0 ** 2);', 'Math.abs(0);'],
		['Math.sqrt((-0) ** 2);', 'Math.abs((-0));'],
		['Math.sqrt(Infinity ** 2);', 'Math.abs(Infinity);'],
		['Math.sqrt((-Infinity) ** 2);', 'Math.abs((-Infinity));'],
		['Math.sqrt(NaN ** 2);', 'Math.abs(NaN);'],
		['Math.sqrt("4" * "4");', 'Math.abs("4");'],
		['Math.sqrt(true * true);', 'Math.abs(true);'],
		['const value = -0; Math.sqrt(value ** 2);', 'const value = -0; Math.abs(value);'],
		['const value = Infinity; Math.sqrt(value ** 2);', 'const value = Infinity; Math.abs(value);'],
		['Math.sqrt(0 ** 2 + 0 ** 2);', 'Math.hypot(0, 0);'],
		['Math.sqrt((0 * 0 + (-0) ** 2) + 0 ** 2);', 'Math.hypot(0, (-0), 0);'],
		['Math.sqrt(Infinity ** 2 + 3 * 3);', 'Math.hypot(Infinity, 3);'],
		['Math.sqrt(3 ** 2 + (-Infinity) ** 2);', 'Math.hypot(3, (-Infinity));'],
		['const value = -Infinity; Math.sqrt(4 * 4 + value ** 2);', 'const value = -Infinity; Math.hypot(4, value);'],
		['Math.sqrt(1e999 * 1e999 + 1e200 * 1e200);', 'Math.hypot(1e999, 1e200);'],
		['Math.log(true) / Math.LN2;', 'Math.log2(true);'],
		['Math.log(false) * Math.LOG10E;', 'Math.log10(false);'],
		['Math.LOG2E * Math.log(null);', 'Math.log2(null);'],
		['Math.log("1") / Math.LN2;', 'Math.log2("1");'],
		['Math.log(`1`) / Math.LN2;', 'Math.log2(`1`);'],
		['Math.sqrt(`0` ** 2);', 'Math.abs(`0`);'],
		['Math.sqrt(`not a number` ** 2);', 'Math.abs(`not a number`);'],
		['Math.log("-1") * Math.LOG2E;', 'Math.log2("-1");'],
		['Math.log("not a number") / Math.LN2;', 'Math.log2("not a number");'],
		['Math.log("Infinity") / Math.LN10;', 'Math.log10("Infinity");'],
		['const value = true; Math.log(value) / Math.LN2;', 'const value = true; Math.log2(value);'],
		['void (Math.log(value) / Math.LN2);', 'void (Math.log2(value));'],
		['void (Math.log(getValue()) * Math.LOG10E);', 'void (Math.log10(getValue()));'],
		['void (Math.LOG2E * Math.log(value));', 'void (Math.log2(value));'],
		['const result = (Math.log(value) / Math.LN10, next());', 'const result = (Math.log10(value), next());'],
		['const result = (Math.LOG10E * Math.log(value), next());', 'const result = (Math.log10(value), next());'],
		['const result = ((next(), Math.log(value) / Math.LN2), final());', 'const result = ((next(), Math.log2(value)), final());'],
		['void (next(), Math.log(value) / Math.LN2);', 'void (next(), Math.log2(value));'],
		['void (Math.log((/* keep */ value)) / Math.LN2);', 'void (Math.log2((/* keep */ value)));'],
		['void (Math.log(1n) / Math.LN2);', 'void (Math.log2(1n));'],
		['async function calculate() { return void (Math.log(await getValue()) / Math.LN2); }', 'async function calculate() { return void (Math.log2(await getValue())); }'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

test.typescript({
	valid: [],
	invalid: [
		['Math.sqrt((0 as number) ** 2);', 'Math.abs((0 as number));'],
		['const value = Infinity as number; Math.sqrt(value ** 2 + 4 ** 2);', 'const value = Infinity as number; Math.hypot(value, 4);'],
		['Math.log(true as boolean) / Math.LN2;', 'Math.log2(true as boolean);'],
		['void ((Math.log(value) / Math.LN2) as number);', 'void ((Math.log2(value)) as number);'],
		['const result = ((Math.log(value) / Math.LN2) satisfies number, next());', 'const result = ((Math.log2(value)) satisfies number, next());'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

// Unknown operands and observable results still require a suggestion
test.snapshot({
	valid: [],
	invalid: [
		'Math.sqrt(Infinity ** 2 + "not a number" ** 2);',
		'Math.sqrt(NaN ** 2 + (-Infinity) ** 2);',
		'Math.sqrt(Infinity ** 2 + value ** 2);',
		'Math.sqrt(0 ** 2 + getValue() ** 2);',
		'Math.sqrt(1 ** 2);',
		'Math.sqrt((-1) ** 2);',
		'Math.sqrt(0 ** /* keep */ 2);',
		'Math.log(2n) / Math.LN2;',
		'Math.log(/1/) / Math.LN2;',
		'Math.log({valueOf() { return 1; }}) / Math.LN2;',
		'const result = (next(), Math.log(value) / Math.LN2);',
		'void (Math.log(value) / Math.LN2 + next());',
		'Math.log(value) / Math.LN2;',
		'void (Math.log(/* keep */ value) / Math.LN2);',
		'void Math.sqrt(value ** 2);',
	],
});

// Literal constants can be fixed when the result is provably unchanged
test({
	valid: [],
	invalid: [
		['Math.sqrt(4 * 4);', 'Math.abs(4);'],
		['Math.sqrt(0 * 0);', 'Math.abs(0);'],
		['Math.sqrt(0.5 * 0.5);', 'Math.abs(0.5);'],
		['Math.sqrt(1.5 * 1.5);', 'Math.abs(1.5);'],
		['Math.sqrt(1e150 * 1e150);', 'Math.abs(1e150);'],
		['Math.sqrt(1e-150 * 1e-150);', 'Math.abs(1e-150);'],
		['Math.sqrt(1e999 * 1e999);', 'Math.abs(1e999);'],
		['const value = 4; Math.sqrt(value * value);', 'const value = 4; Math.abs(value);'],
		['const value = -4; Math.sqrt(value * value);', 'const value = -4; Math.abs(value);'],
		['const value = -0; Math.sqrt(value * value);', 'const value = -0; Math.abs(value);'],
		['Math.sqrt(((4)) * ((4)),);', 'Math.abs(((4)),);'],
		['Math.sqrt((/* keep */ 4) * 4);', 'Math.abs((/* keep */ 4));'],
		['Math.log(1) * Math.LOG10E;', 'Math.log10(1);'],
		['Math.LOG10E * Math.log(0);', 'Math.log10(0);'],
		['Math.log(-1) / Math.LN10;', 'Math.log10(-1);'],
		['Math.log(-0) * Math.LOG2E;', 'Math.log2(-0);'],
		['Math.LOG2E * Math.log(1);', 'Math.log2(1);'],
		['Math.log(1) / Math.LN2;', 'Math.log2(1);'],
		['Math.log(+1) / Math.LN2;', 'Math.log2(+1);'],
		['Math.log(1e999) / Math.LN10;', 'Math.log10(1e999);'],
		['Math.log(-1e999) * Math.LOG2E;', 'Math.log2(-1e999);'],
		['const value = 1; Math.log(value) / Math.LN2;', 'const value = 1; Math.log2(value);'],
		['const value = -1; Math.LOG10E * Math.log(value);', 'const value = -1; Math.log10(value);'],
		['Math.log((/* keep */ 1)) / Math.LN2;', 'Math.log2((/* keep */ 1));'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

// Unsafe or unproven constants must still require explicit acceptance
test.snapshot({
	valid: [],
	invalid: [
		'Math.sqrt(1e200 * 1e200);',
		'Math.sqrt(1e-200 * 1e-200);',
		'Math.sqrt(1e-160 * 1e-160);',
		'Math.sqrt(4 ** 2);',
		'Math.sqrt(3 * 3 + 4 * 4);',
		'Math.log(2) / Math.LN2;',
		'Math.log("2") / Math.LN2;',
		'Math.log(1n) / Math.LN2;',
		'Math.log({valueOf() { return 1; }}) * Math.LOG10E;',
		'Math.log(getValue()) / Math.LN2;',
		'let value = 1; value = 2; Math.log(value) / Math.LN2;',
		'const value = getValue(); Math.log(value) / Math.LN2;',
		'const value = 4; const alias = value; Math.sqrt(alias * alias);',
		'const value = 2 + 2; Math.sqrt(value * value);',
		'const value = {number: 4}; Math.sqrt(value.number * value.number);',
		'const value = 4; function calculate(value) { return Math.sqrt(value * value); }',
		'const value = 1; { let value = 2; Math.log(value) / Math.LN2; }',
		'Math.sqrt(4 * /* keep */ 4);',
		'Math.log(/* keep */ 1) / Math.LN2;',
	],
});

test.typescript({
	valid: [],
	invalid: [
		['Math.log(1 as number) / Math.LN2;', 'Math.log2(1 as number);'],
		['Math.sqrt((4 as number) * (4 as number));', 'Math.abs((4 as number));'],
		['const value: number = 4; Math.sqrt(value * value);', 'const value: number = 4; Math.abs(value);'],
		['const value = 4; Math.sqrt((value as number) * value);', 'const value = 4; Math.abs((value as number));'],
		['const value = 1; Math.log(value as number) / Math.LN2;', 'const value = 1; Math.log2(value as number);'],
		['const value = -1 as number; Math.log(value) / Math.LN10;', 'const value = -1 as number; Math.log10(value);'],
		['Math.log((1 satisfies number)) * Math.LOG2E;', 'Math.log2((1 satisfies number));'],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-modern-math-apis', suggestions: []}],
	})),
});

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

// Unsafe templates and unresolved bindings remain suggestions
test({
	valid: [],
	invalid: [
		['Math.log(`2`) / Math.LN2;', 'Math.log2(`2`);'],
		['Math.log(`${1}`) / Math.LN2;', 'Math.log2(`${1}`);'], // eslint-disable-line no-template-curly-in-string
		['Math.sqrt(`${0}` ** 2);', 'Math.abs(`${0}`);'], // eslint-disable-line no-template-curly-in-string
		['const {length} = "Infinity"; Math.log(length) / Math.LN2;', 'const {length} = "Infinity"; Math.log2(length);'],
		['const [value] = "4"; Math.sqrt(value * value);', 'const [value] = "4"; Math.abs(value);'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'prefer-modern-math-apis',
			suggestions: [{messageId: 'suggestion', output}],
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
