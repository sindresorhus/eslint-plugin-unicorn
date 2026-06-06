import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'array.fill(0)',
		'array.fill("x")',
		'array.fill(false)',
		'array.fill(null)',
		'array.fill(undefined)',
		'array.fill(10n)',
		'array.fill(Symbol("x"))',
		'array.fill(Symbol.for("x"))',
		'array.fill(Symbol.iterator)',
		'array.fill(`x`)',
		'array.fill(() => {})',
		'array.fill(function () {})',
		'array.fill(/x/)',
		'array.fill(new RegExp("x"))',
		'let value = {}; value = 1; array.fill(value)',
		'var value = {}; array.fill(value)',
		'const value = {}; const alias = value; array.fill(alias)',
		'array.fill(object.value)',
		'array.fill(this.value)',
		'array?.fill({})',
		'array.fill?.({})',
		'array[fill]({})',
		'Array.from({length: 3}, () => value)',
		'Array.from({length: 3}).map(() => value)',
		'const {value = {}} = object; array.fill(value)',
		'function foo(value = {}) { array.fill(value); }',
	],
	invalid: [
		'new Array(3).fill({})',
		'Array(3).fill([])',
		'Array.from({length: 3}).fill(new Map())',
		'[1, 2, 3].fill(new Set())',
		'const value = {}; array.fill(value)',
		'const value = []; array.fill(value)',
		'const value = new Map(); array.fill(value)',
		'const value = new class {}; array.fill(value)',
		'array.fill(class {})',
		outdent`
			const value = {};
			array.fill(value, 1);
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.fill(/x/ as RegExp)',
		'array.fill((() => {}) as Function)',
		'array.fill(object.value as Foo)',
		'const value = {}; const alias = value as Foo; array.fill(alias)',
	],
	invalid: [
		'array.fill({} as Foo)',
		'array.fill(<Foo>{})',
		'array.fill({} satisfies Foo)',
		'array.fill({}!)',
		'const value = {} as Foo; array.fill(value)',
		'const value = {}; array.fill(value!)',
	],
});
