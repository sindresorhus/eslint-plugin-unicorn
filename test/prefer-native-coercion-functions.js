import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = async v => String(v)',
		'const foo = v => String',
		'const foo = v => v',
		'const foo = v => NotString(v)',
		'const foo = v => String(notFirstParameterName)',
		'const foo = v => new String(v)',
		'const foo = v => String?.(v)',
		'const foo = async function (v) {return String(v);}',
		'const foo = function * (v) {return String(v);}',
		'const foo = async function * (v) {return String(v);}',
		'const foo = function * (v) {yield String(v);}',
		'const foo = async function (v) {await String(v);}',
		'const foo = function (v) {return;}',
		outdent`
			function foo(v) {
				'use strict';
				return String(v);
			}
		`,
		outdent`
			function foo(v) {
				return String(v);
				function x() {}
			}
		`,
		outdent`
			function foo({v}) {
				return String(v);
			}
		`,
		outdent`
			function foo(v) {
				return String({v});
			}
		`,
		outdent`
			function foo(...v) {
				return String(v);
			}
		`,
		outdent`
			function foo(...v) {
				return String(...v);
			}
		`,
		outdent`
			class A {
				constructor(v) {
					return String(v);
				}
			}
		`,
		outdent`
			class A {
				get foo() {
					return String(v);
				}
			}
		`,
		outdent`
			class A {
				set foo(v) {
					return String(v);
				}
			}
		`,
		'({get foo() {return String(v)}})',
		'({set foo(v) {return String(v)}})',
	],
	invalid: [
		'const foo = v => String(v)',
		'const foo = v => Number(v)',
		'const foo = v => BigInt(v)',
		'const foo = v => Boolean(v)',
		'const foo = v => Symbol(v)',
		outdent`
			const foo = v => {
				return String(v);
			}
		`,
		outdent`
			const foo = function (v) {
				return String(v);
			}
		`,
		'function foo(v) { return String(v); }',
		'export default function foo(v) { return String(v); }',
		'export default function (v) { return String(v); }',
		outdent`
			class A {
				foo(v) {
					return String(v);
				}

				bar() {}
			}
		`,
		outdent`
			class A {
				static foo(v) {
					return String(v);
				}

				bar() {}
			}
		`,
		outdent`
			class A {
				#foo(v) {
					return String(v);
				}

				bar() {}
			}
		`,
		outdent`
			class A {
				static #foo(v) {
					return String(v);
				}

				bar() {}
			}
		`,
		outdent`
			object = {
				foo(v) {
					return String(v);
				},
				bar
			}
		`,
		outdent`
			object = {
				foo: function(v) {
					return String(v);
				},
				bar
			}
		`,
		outdent`
			object = {
				[function(v) {return String(v);}]: 1,
			}
		`,

		// No fix
		'const foo = (v, extra) => String(v)',
		'const foo = (v, ) => String(v, extra)',
		'const foo = (v, ) => /* comment */ String(v)',
	],
});

// Array callbacks
test.snapshot({
	valid: [
		'array.some?.(v => v)',
		'array?.some(v => v)',
		'array.notSome(v => v)',
		'array.some(callback, v => v)',
		'some(v => v)',
		'array.some(v => notFirstParameterName)',
		'array.some(function(v) {return notFirstParameterName;})',
		'array.some(function(v) {return;})',
		'array.some(function(v) {return v.v;})',
		outdent`
			const identity = v => v;
			array.some(identity)
		`,
		outdent`
			array.some(function(v) {
				"use strict";
				return v;
			})
		`,
		{
			code: 'array.filter((value): value is string => value)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter((value): value is string => Boolean(value))',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				array.filter((value): value is string => {
					return value;
				})
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				array.filter((value): value is string => {
					return Boolean(value);
				})
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function isString(value): value is string {
					return Boolean(value);
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.some((value): value is string => value)',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'array.every(v => v)',
		'array.filter(v => v)',
		'array.find(v => v)',
		'array.findLast(v => v)',
		'array.some(v => v)',
		'array.findIndex(v => v)',
		'array.findLastIndex(v => v)',
		outdent`
			array.some(v => {
				return v;
			})
		`,
		outdent`
			array.some(function (v) {
				return v;
			})
		`,

		// No fix
		'array.some((v, extra) => v)',
		'array.some((v, ) => /* comment */ v)',
		{
			code: 'array.filter((value): boolean => value)',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// A TypeScript expression wrapper around the value must not hide the pattern
test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [],
	invalid: [
		'const toString = (value: unknown) => String(value) as string;',
		'const toString = (value: unknown) => String(value) satisfies string;',
		'const toString = (value: unknown) => String(value)!;',
		'array.some(value => value!);',
		'array.some((value: boolean) => value satisfies boolean);',
		'const toString = (value: unknown) => {\n\treturn String(value) as string;\n};',
		'array.some(function (value) {\n\treturn value!;\n});',
	],
});

// The replacement ends with a bare identifier, so a following `(`, `[`, `+`, `-`, regular expression, or template that ASI separated from the function would be absorbed into it
test.snapshot({
	valid: [],
	invalid: [
		'const foo = v => {\n\treturn String(v);\n}\n/^a/.test(s) && log(1);',
		'const foo = v => String(v);\n/^a/.test(s);',
		'const foo = v => String(v);\n[1, 2].forEach(log);',
		'foo = v => {\n\treturn String(v);\n}\n(bar);',
		'foo = v => {\n\treturn String(v);\n}\n[bar] = baz;',
		'foo = v => {\n\treturn String(v);\n}\n`bar`;',
		'foo = v => {\n\treturn String(v);\n}\n-bar;',
		'class A {\n\tfoo = v => {\n\t\treturn String(v);\n\t}\n\t[bar] = 1;\n}',
		// Nothing follows that could continue it
		'const foo = v => String(v);\nlog(1);',
		// The method is only a suggestion
		'class A { m(v) { return String(v); } }\nlog(1);',
		// A `:` cannot follow an expression, so it is not absorbed and needs no separator
		'q ? function f(v) { return String(v); } : 0',
		// A property value and a template substitution are operands, not statements
		'const o = {k: function (v) { return String(v); }};',
		// eslint-disable-next-line no-template-curly-in-string
		'`${v => { return String(v); }}`',
		// The next token belongs to the same expression, so it keeps its meaning without a separator
		'foo = function (v) { return String(v); }(bar);',
		'foo = function (v) { return String(v); }\n(bar);',
		'foo = function (v) { return String(v); } + bar;',
		'foo = function (v) { return String(v); }[bar];',
		'foo = function (v) { return String(v); }`bar`;',
		'foo = (v => { return String(v); })\n(bar);',
	],
});
