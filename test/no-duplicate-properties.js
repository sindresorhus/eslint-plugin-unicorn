import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const asCss = code => ({code, language: languages.css});

test.snapshot({
	valid: [
		'a { color: red; background: blue; }',
		'a { --theme: red; --Theme: blue; }',
		String.raw`a { --Foo: red; --\66 oo: blue; }`,
		'a { --foó: red; --foo\u0301: blue; }',
		'a { padding: 1rem; padding-left: 2rem; }',
		'a { -webkit-user-select: none; user-select: none; }',
		'a { K: one; k: two; }',
		'a { color: red; } b { color: blue; }',
		'@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
		outdent`
			a {
				color: red;
				.child {
					color: blue;
				}
			}
		`,
		outdent`
			a {
				color: red;
				@supports (color: oklch(50% 0.2 30)) {
					color: oklch(50% 0.2 30);
				}
			}
		`,
	].map(code => asCss(code)),
	invalid: [
		'a { color: red; color: blue; }',
		'a { Color: red; cOlOr: blue; }',
		String.raw`a { \43 olor: red; color: blue; }`,
		'a { --theme: red; --theme: blue; }',
		String.raw`a { --foo: red; --f\6f o: blue; }`,
		String.raw`a { --foo: red; \2d\2d foo: blue; }`,
		String.raw`a { --💩: red; --\1f4a9: blue; }`,
		String.raw`a { a\0 b: one; a�b: two; }`,
		'a { --theme:; --theme:; }',
		'a { color: red; background: white; color: blue; }',
		'a { color: red; color: green; color: blue; }',
		'a { color: red; background: white; color: blue; background: black; }',
		'a { -WEBKIT-user-select: none; -webkit-USER-select: text; }',
		'a { height: 100vh; height: 100dvh; }',
		'a { position: -webkit-sticky; position: sticky; }',
		'a { color: red !important; color: blue; }',
		'@keyframes pulse { from { opacity: 0; opacity: 1; } }',
		'@font-face { src: url(example.woff2); SRC: url(example.woff); }',
		'@property --theme { syntax: "*"; syntax: "<color>"; inherits: false; }',
		'@counter-style thumbs { symbols: "👍"; symbols: "👎"; }',
		'@page { margin: 1in; margin: 2in; @top-left { content: "A"; content: "B"; } }',
		outdent`
			a {
				color: red;
				@media (width > 40rem) {
					color: green;
					color: blue;
				}
				color: black;
			}
		`,
		'a { color: red; /* keep */ color: blue; }',
	].map(code => asCss(code)),
});

test({
	testerOptions: languages.css,
	valid: [],
	invalid: [
		{
			code: 'a {\n  color: red;\n  COLOR: blue;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					data: {
						property: 'COLOR',
						line: '2',
					},
					line: 3,
					column: 3,
					endLine: 3,
					endColumn: 8,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n  color: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tc\\6f\nlor: blue;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					line: 3,
					column: 2,
					endLine: 4,
					endColumn: 4,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\r\n\tcolor: red;\r\n\tc\\6f\r\nlor: blue;\r\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					line: 3,
					column: 2,
					endLine: 4,
					endColumn: 4,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\r\n\tcolor: red;\r\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\r\tcolor: red;\r\tc\\6f\rlor: blue;\r}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					line: 3,
					column: 2,
					endLine: 4,
					endColumn: 4,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\r\tcolor: red;\r}',
						},
					],
				},
			],
		},
		{
			code: 'a {\f\t--foo: red;\f\t--f\\6f\fo: blue;\f}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					line: 3,
					column: 2,
					endLine: 4,
					endColumn: 2,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\f\t--foo: red;\f}',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tcolor: green;\n\tcolor: blue;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					data: {
						property: 'color',
						line: '2',
					},
					line: 3,
					suggestions: 1,
				},
				{
					messageId: 'no-duplicate-properties/error',
					data: {
						property: 'color',
						line: '2',
					},
					line: 4,
					suggestions: 1,
				},
			],
		},
		{
			code: 'a { color: red; color: blue }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a { color: red; }',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;  color: blue;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a { color: red; color: blue; background: white; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a { color: red; background: white; }',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tcolor: blue \t\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\r\n\tcolor: red;\r\n\tcolor: blue \t\r\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\r\n\tcolor: red;\r\n}',
						},
					],
				},
			],
		},
		{
			code: 'a { color: red; color: blue \t; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a { color: red; }',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tcolor:\n\t\tblue;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\r\n\tcolor: red;\r\n\tcolor: blue;\r\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\r\n\tcolor: red;\r\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\f\tcolor: red;\f\tcolor: blue;\f}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\f\tcolor: red;\f}',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tcolor: blue;',
			languageOptions: {tolerant: true},
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n',
						},
					],
				},
			],
		},
		{
			code: 'a { color: red; color: blue; /* keep */ }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a { color: red; /* keep */ }',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\t/* eslint-disable-next-line no-warning-comments */\n\tcolor: blue;\n\tword-wrap: break-word;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n\t/* eslint-disable-next-line no-warning-comments */\n\n\tword-wrap: break-word;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\t/* eslint-disable-next-line no-warning-comments */\n\tcolor:\n\t\tblue; word-wrap: break-word;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: 0,
				},
			],
		},
		{
			code: 'a { color: red; color: /* keep */ blue; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: 0,
				},
			],
		},
		{
			code: 'a { color: red; color /* keep */ : blue; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: 0,
				},
			],
		},
		{
			code: 'a { color: red; color: blue /* keep */; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: 0,
				},
			],
		},
	],
});
