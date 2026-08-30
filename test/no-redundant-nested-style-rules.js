import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		...[
			'a { color: red; }',
			'a { &:hover { color: red; } }',
			'a { &.active { color: red; } }',
			'a { & > b { color: red; } }',
			'a { b & { color: red; } }',
			'a { && { color: red; } }',
			'& { color: red; }',
			'@media (width > 0px) { & { color: red; } }',
			'#nonmatch, .target { & { color: red; } }',
			'a::before { & { color: red; } }',
			...['after', 'before', 'first-letter', 'first-line'].map(pseudoElement => `a:${pseudoElement} { & { color: red; } }`),
			String.raw`a:\62 efore { & { color: red; } }`,
			String.raw`a:\66 irst-line { & { color: red; } }`,
			'@keyframes pulse { from { & { color: red; } } }',
			String.raw`@keyfr\61 mes pulse { from { & { color: red; } } }`,
			String.raw`@-webkit-keyfr\61 mes pulse { from { & { color: red; } } }`,
		].map(code => ({code, language: languages.css})),
		{
			code: 'a { .foo# { color: red; } }',
			language: languages.css,
			languageOptions: {tolerant: true},
		},
		{
			code: 'a# { & { color: red; } }',
			language: languages.css,
			languageOptions: {tolerant: true},
		},
		{
			code: 'a { @scope (.component) { & { color: red; } } }',
			language: languages.css,
			languageOptions: {tolerant: true},
		},
		{
			code: String.raw`a { @sc\6f pe (.component) { & { color: red; } } }`,
			language: languages.css,
			languageOptions: {tolerant: true},
		},
		{
			code: 'a { @media (width > 0px) { @property --custom { & { syntax: "*"; } } } }',
			language: languages.css,
		},
		{
			code: 'a { @unknown { & { color: red; } } }',
			language: languages.css,
		},
	],
	invalid: [
		'a { & { color: red; } }',
		'a { & { color: red } }',
		'a { & {} }',
		'a { & { color: red } background: blue; }',
		'a { & { color: red } @media (width > 0px) { background: blue; } }',
		'article { color: green; & { color: blue; } color: red; }',
		'a { & { b { color: red; } } }',
		outdent`
			a {
				& {
					color: red;
				}
			}
		`,
		outdent`
			a {
				& /* keep before block */ {
					/* keep inside block */
					color: red;
				}
			}
		`,
		outdent`
			a {
				@media (width > 0px) {
					& {
						color: red;
					}
				}
			}
		`,
		outdent`
			@media (width > 0px) {
				a {
					& {
						color: red;
					}
				}
			}
		`,
		outdent`
			a {
				& {
					@media (width > 0px) {
						color: red;
					}
				}
			}
		`,
		outdent`
			a {
				@layer theme {
					& {
						color: red;
					}
				}
			}
		`,
		'a { & { color: red; } & { background: blue; } }',
		'a { & { & { color: red; } } }',
		'@scope (.component) { a { & { color: red; } } }',
	].map(code => ({code, language: languages.css})),
});

test({
	testerOptions: languages.css,
	valid: [],
	invalid: [
		{
			code: String.raw`a { & { --foo: bar\; } background: blue; }`,
			output: String.raw`a { --foo: bar\;; background: blue; }`,
			errors: 1,
		},
		{
			code: 'a { & { color: red; /* keep */ } background: blue; }',
			output: 'a { color: red; /* keep */ background: blue; }',
			errors: 1,
		},
		{
			code: 'a { & { color: red /* keep */ } b {} }',
			output: 'a { color: red /* keep */; b {} }',
			errors: 1,
		},
		{
			code: 'a { & { --custom: red } /* outer */ }',
			output: 'a { --custom: red; /* outer */ }',
			errors: 1,
		},
		{
			code: String.raw`a { & { --custom: red\ }; b {} }`,
			output: String.raw`a { --custom: red\ ;; b {} }`,
			errors: 1,
		},
		{
			code: 'a { & { \u00A0 { color: red; } } }',
			output: 'a { \u00A0 { color: red; } }',
			errors: 1,
		},
		{
			code: 'a { & { --foo: bar\u00A0 } background: blue; }',
			output: 'a { --foo: bar\u00A0; background: blue; }',
			errors: 1,
		},
		{
			code: String.raw`a { & { --foo: bar\ } b {} }`,
			output: String.raw`a { --foo: bar\ ; b {} }`,
			errors: 1,
		},
		{
			code: String.raw`a { & { --foo: bar\\ } b {} }`,
			output: String.raw`a { --foo: bar\\; b {} }`,
			errors: 1,
		},
		{
			code: 'a { & { color red } b { x: y } }',
			languageOptions: {tolerant: true},
			errors: 1,
		},
		{
			code: 'a { & { @foo x } b { y: z } }',
			languageOptions: {tolerant: true},
			errors: 1,
		},
		{
			code: String.raw`a { & { @foo x\;} b { y: z } }`,
			languageOptions: {tolerant: true},
			errors: 1,
		},
		{
			code: 'a { & { @foo x; } b { y: z } }',
			output: 'a { @foo x; b { y: z } }',
			errors: 1,
		},
		{
			code: 'a { & { @foo; } b { y: z } }',
			output: 'a { @foo; b { y: z } }',
			errors: 1,
		},
		{
			code: 'a { & { @foo x } }',
			output: 'a { @foo x }',
			languageOptions: {tolerant: true},
			errors: 1,
		},
		{
			code: 'a {\n  & {\n    font-family: foo\u2028bar\u2029baz;\n  }\n}',
			output: 'a {\n  font-family: foo\u2028bar\u2029baz;\n}',
			errors: 1,
		},
		{
			code: 'a { & { color: red } & { background: blue } }',
			output: 'a { color: red; background: blue }',
			errors: 2,
		},
		{
			code: 'a {\n  & { /* after opening brace */\n    color: red;\n  }\n}',
			output: 'a {\n  /* after opening brace */\n  color: red;\n}',
			errors: 1,
		},
		{
			code: 'a {\r\n  & { color: red;\r\n    background: blue;\r\n  }\r\n}',
			output: 'a {\r\n  color: red;\r\n  background: blue;\r\n}',
			errors: 1,
		},
		{
			code: 'a {\r\n  & /* keep */ {\r\n    color: red;\r\n  }\r\n}',
			output: 'a {\r\n  /* keep */\r\n  color: red;\r\n}',
			errors: 1,
		},
		{
			code: String.raw`a {
	& {
		content: "a\
			b";
	}
}`,
			errors: 1,
		},
		{
			code: outdent`
				a {
					& {
						--foo: a
							b;
					}
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				a {
					& /* first
						second */ {
						color: red;
					}
				}
			`,
			errors: 1,
		},
	],
});
