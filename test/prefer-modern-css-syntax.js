import test from 'ava';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester, languages} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest({
	testerOptions: languages.css,
	valid: [
		'a { color: rgb(0 0 0 / 50%); }',
		'a { color: hsl(30 40% 50%); }',
		'a { color: rgb(0 0 0 / calc(.5)); color: hwb(30 40% 50% / var(--alpha)); }',
		'a { opacity: .5; color: #abcd; content: "rgba(0, 0, 0, .5)"; background: url("rgba(0, 0, 0, .5)"); }',
		'a:hover::before { color: red; }',
		'a { --brand: "rgba(0, 0, 0, .5)"; }',
		'a[data-label=":before"] { --brand: url("rgba(0, 0, 0, .5)"); content: ":after"; }',
		'a { --brand: rgba(0, 0, 0, .5) #; }',
		'a { --brand: oKlab(50% 0 0 / .5); color: oKlab(50% 0 0 / .5); }',
		'a { color: var(--fallback, rgba(0, 0, 0, .5)); }',
	],
	invalid: [
		{code: 'a { color: rgba(0, 0, 0, .5); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { color: rgb(1,2,3); }', output: 'a { color: rgb(1 2 3); }', errors: 1},
		{code: 'a { color: rgb(1, 2, 3, .5); }', output: 'a { color: rgb(1 2 3 / 50%); }', errors: 1},
		{code: 'a { color: hsl(30, 40%, 50%); }', output: 'a { color: hsl(30 40% 50%); }', errors: 1},
		{code: 'a { color: hsl(30, 40%, 50%, .5); }', output: 'a { color: hsl(30 40% 50% / 50%); }', errors: 1},
		{code: 'a { color: hsla(30, 40%, 50%, .25); }', output: 'a { color: hsl(30 40% 50% / 25%); }', errors: 1},
		{code: 'a { color: rgba(1 2 3 / 50%); }', output: 'a { color: rgb(1 2 3 / 50%); }', errors: 1},
		{code: 'a { color: rgba(0 0 0 / .5); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { color: hsla(30 40% 50%); }', output: 'a { color: hsl(30 40% 50%); }', errors: 1},
		{code: 'a { color: rgba(1 2 3); }', output: 'a { color: rgb(1 2 3); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / .29); }', output: 'a { color: rgb(1 2 3 / 29%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / .005); }', output: 'a { color: rgb(1 2 3 / 0.5%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / +.005); }', output: 'a { color: rgb(1 2 3 / +0.5%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / -.005); }', output: 'a { color: rgb(1 2 3 / -0.5%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 000.0500); }', output: 'a { color: rgb(1 2 3 / 5%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 1); }', output: 'a { color: rgb(1 2 3 / 100%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 0); }', output: 'a { color: rgb(1 2 3 / 0%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 0.123456789); }', output: 'a { color: rgb(1 2 3 / 12.3456789%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 1e-2); }', errors: 1},
		{code: 'a { color: rgba(1, 2, 3, 1e-2); }', output: 'a { color: rgb(1 2 3 / 1e-2); }', errors: 1},
		{code: 'a { color: hwb(30 40% 50% / .5); }', output: 'a { color: hwb(30 40% 50% / 50%); }', errors: 1},
		{code: 'a { color: lab(50% 0 0 / .5); }', output: 'a { color: lab(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { color: lch(50% 0 0 / .5); }', output: 'a { color: lch(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { color: oklab(50% 0 0 / .5); }', output: 'a { color: oklab(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { color: oklch(50% 0 0 / .5); }', output: 'a { color: oklch(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { color: color(srgb 1 0 0 / .5); }', output: 'a { color: color(srgb 1 0 0 / 50%); }', errors: 1},
		{code: 'a { color: rgb(var(--red) 0 0 / .5); }', output: 'a { color: rgb(var(--red) 0 0 / 50%); }', errors: 1},
		{code: 'a { color: rgb(from rgba(0, 0, 0, .5) r g b / .5); }', output: 'a { color: rgb(from rgb(0 0 0 / 50%) r g b / 50%); }', errors: 2},
		{code: 'a { --brand: rgba(0, 0, 0, .5); }', output: 'a { --brand: rgb(0 0 0 / 50%); }', errors: 1},
		{
			code: '/* 😀 */\r\na {\r\n  --brand: /* before */ rgba(0, 0, 0, .5) /* after */ !important;\r\n}',
			output: '/* 😀 */\r\na {\r\n  --brand: /* before */ rgb(0 0 0 / 50%) /* after */ !important;\r\n}',
			errors: 1,
		},
		{code: 'a { --emoji: "😀"; --brand: rgba(0, 0, 0, .5); }', output: 'a { --emoji: "😀"; --brand: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { --brand: linear-gradient(rgba(0, 0, 0, .5), hsla(30, 40%, 50%, .5)); }', output: 'a { --brand: linear-gradient(rgb(0 0 0 / 50%), hsl(30 40% 50% / 50%)); }', errors: 2},
		{code: 'a { --brand: var(--fallback, rgba(0, 0, 0, .5)); }', output: 'a { --brand: var(--fallback, rgb(0 0 0 / 50%)); }', errors: 1},
		{code: '@supports (color: rgba(0, 0, 0, .5)) { a { color: red; } }', output: '@supports (color: rgb(0 0 0 / 50%)) { a { color: red; } }', errors: 1},
		{code: '@supports (--brand: rgba(0, 0, 0, .5)) { a { color: red; } }', output: '@supports (--brand: rgb(0 0 0 / 50%)) { a { color: red; } }', errors: 1},
		{code: '@supports selector(a:before) { a { color: red; } }', output: '@supports selector(a::before) { a { color: red; } }', errors: 1},
		{
			code: '@property --brand { syntax: "<color>"; inherits: false; initial-value: rgba(1, 2, 3, .5); }',
			output: '@property --brand { syntax: "<color>"; inherits: false; initial-value: rgb(1 2 3 / 50%); }',
			errors: 1,
		},
		{code: '@supports (color: rgb(255, 0%, 0)) { a { color: red; } }', errors: 1},
		{code: 'a { background: linear-gradient(rgba(0, 0, 0, .5), hsl(30, 40%, 50%)); }', output: 'a { background: linear-gradient(rgb(0 0 0 / 50%), hsl(30 40% 50%)); }', errors: 2},
		{code: 'a { color: rgb(var(--red), 0, 0); }', errors: 1},
		{code: '@supports (color: rgb(calc(100%), 0, 0)) { a { color: red; } }', errors: 1},
		{code: 'a { color: rgb(min(100%, 20%), 0, 0); }', errors: 1},
		{code: 'a { color: rgb(0, 0, calc(100%)); }', errors: 1},
		{code: 'a { color: rgb(calc(1 + 2), 0, 0); }', errors: 1},
		{code: 'a { color: rgb(255, 0%, 0); }', errors: 1},
		{code: 'a { color: hsl(30, 40, 50); }', errors: 1},
		{code: 'a { color: rgb(none, 0, 0); }', errors: 1},
		{code: 'a { color: rgba(0, 0, 0, calc(.5)); }', output: 'a { color: rgb(0 0 0 / calc(.5)); }', errors: 1},
		{code: String.raw`a { color: r\67 ba(0, 0, 0, .5); }`, output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { color: rgba(0,\r\n 0,\r\n 0,\r\n .5); }', output: 'a { color: rgb(0\r\n 0\r\n 0 /\r\n 50%); }', errors: 1},
		{code: 'a { color: rgba(0 , \r\n 0 , \r\n 0 , \r\n .5); }', output: 'a { color: rgb(0\r\n 0\r\n 0 /\r\n 50%); }', errors: 1},
		{code: 'a { color: RGBA(0, 0, 0, .5); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a:before { color: red; }', output: 'a::before { color: red; }', errors: 1},
		{code: 'a:BEFORE { color: red; }', output: 'a::BEFORE { color: red; }', errors: 1},
		{code: String.raw`a:b\65 fore { color: red; }`, output: String.raw`a::b\65 fore { color: red; }`, errors: 1},
		{code: 'a:after { color: red; }', output: 'a::after { color: red; }', errors: 1},
		{code: 'a:first-line { color: red; }', output: 'a::first-line { color: red; }', errors: 1},
		{code: 'a:first-letter { color: red; }', output: 'a::first-letter { color: red; }', errors: 1},
		{code: 'a:not(:hover):before { color: red; }', output: 'a:not(:hover)::before { color: red; }', errors: 1},
		{code: 'a { color: rgb(0, /* keep */ 0, 0); }', errors: 1},
		{code: 'a { color: rgb(0 0 0 / /* keep */ .5); }', errors: 1},
		{code: 'a { --brand: rgba(0, /* keep */ 0, 0, .5); }', errors: 1},
		{code: 'a { color: rgba(1, 2, 3, var(--alpha)); }', errors: 1},
		{code: 'a { color: rgba(var(--channels), .5); }', errors: 1},
		{code: 'a { color: rgb(0,\n 0,\n 0); }', output: 'a { color: rgb(0\n 0\n 0); }', errors: 1},
		{code: 'a { color: rgb(0\n, 0, 0); }', errors: 1},
	],
});

test('fixes are stable', t => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: languages.css.language,
		plugins: {
			...languages.css.plugins,
			unicorn: plugin,
		},
		rules: {
			'unicorn/prefer-modern-css-syntax': 'error',
		},
	};
	for (const [code, expected] of [
		['a:before { --brand: rgba(0, 0, 0, .5); }', 'a::before { --brand: rgb(0 0 0 / 50%); }'],
		['a:after { --brand: rgb(from rgba(1, 2, 3, .25) r g b / .5); }', 'a::after { --brand: rgb(from rgb(1 2 3 / 25%) r g b / 50%); }'],
	]) {
		const first = linter.verifyAndFix(code, config, {filename: 'test.css'});
		t.true(first.fixed);
		t.is(first.output, expected);
		t.deepEqual(first.messages, []);
		const second = linter.verifyAndFix(first.output, config, {filename: 'test.css'});
		t.false(second.fixed);
		t.is(second.output, expected);
		t.deepEqual(second.messages, []);
	}
});
