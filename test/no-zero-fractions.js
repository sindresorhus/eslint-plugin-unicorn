import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

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
		// Trailing zero after a non-zero fraction digit
		'const foo = 1.10',
		'const foo = -1.0',
		'const foo = 123123123.0',
		'const foo = 123.11100000000',
		// Leading-dot zero inside a computed member
		'a[.0]',
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

test.snapshot({
	valid: ['const value = 0.5;', 'const value = -0.5;'],
	invalid: ['const value = .5;', 'const value = -.50;', 'function foo() {return.5}', '.5.toString()', 'const value = .50e2;'],
});

test.snapshot({
	valid: [languages.json, languages.jsonc, languages.json5].flatMap(language => ['[0.5, -0.5, 1, "1.0"]'].map(code => ({code, language}))),
	invalid: [languages.json, languages.jsonc, languages.json5].flatMap(language => ['[1.0, -1.00, 1.50, 1.00e2]'].map(code => ({code, language}))),
});

test.snapshot({
	valid: ['[0xAB, Infinity, -Infinity, NaN]'].map(code => ({code, language: languages.json5})),
	invalid: ['[.5, .50, -0.50, +0.50, 1., -1., +1.]'].map(code => ({code, language: languages.json5})),
});

test.snapshot({
	valid: ['value = [1.0, -1.0, 1e2, 1.5, inf, nan, 1979-05-27]'].map(code => ({code, language: languages.toml})),
	invalid: ['value = [1.00, -1.00, +1.00, 1.50, 1.00e2, 1_000.00]'].map(code => ({code, language: languages.toml})),
});

test.snapshot({
	valid: [
		'a { width: 1px; opacity: 0.5; content: "1.0 .5"; background: url(1.0.png) }',
		String.raw`/* 1.0 */ .item1\.0 { --number: 0.5; }`,
		'a { --value: foo.5 #a.5 --1.0 1.0.5 2.0.5px ..5 @.5 #.5; }',
		'a { opacity: foo.5; width: 1.0.5px; }',
	].map(code => ({code, language: languages.css})),
	invalid: [
		'a { width: 2.0PX; animation-delay: .5s; opacity: -.50; height: 10.00%; }',
		String.raw`a { --number: +.50; --size: 2.00\70x; --exponent: 1.00E2; }`,
		'@media (width > 1.0px) { a { width: calc(.50px + 1.0px) } }',
		'a { aspect-ratio: 1.0/2.0; width: calc(1.0px*2.0); height: calc(1.0px/2.0); }',
	].map(code => ({code, language: languages.css})),
});

test.snapshot({
	valid: [
		'value: [0.5, 1.0, 1.0e2, -1.0, .inf, .nan, "1.00"]',
		'value: !!str 1.00',
		'value: |\n  1.00\n',
	].map(code => ({code, language: languages.yaml})),
	invalid: [
		'value: [.5, -.50, +.50, 1.00, -1.00, 1.50, 1.00e2, 1.] # preserve',
		'value: &number 1.00',
		'%YAML 1.1\n---\nvalue: [1.00e+2, 1.50, .50]',
	].map(code => ({code, language: languages.yaml})),
});
