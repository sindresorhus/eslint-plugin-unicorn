import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		{code: 'a { transition: opacity 150ms; }', language: languages.css},
		{code: 'a { transition: 150ms ease; }', language: languages.css},
		{code: 'a { transition-property: opacity, color; }', language: languages.css},
		{code: 'a { transition-property: none; }', language: languages.css},
		{code: 'a { transition: var(--transition); }', language: languages.css},
		{code: 'a { --transition: all 150ms; }', language: languages.css},
		{code: 'a { -webkit-transition: all 150ms; }', language: languages.css},
		{code: 'a { animation: all 150ms; }', language: languages.css},
		{code: '@supports (transition: all 150ms) {}', language: languages.css},
		{code: '@supports (transition-property: all) {}', language: languages.css},
		{code: 'a { transition: \\61\u00A0ll 150ms; }', language: languages.css},
		{code: '@container style(transition: all 150ms) {}', language: languages.css},
		{code: '@import "x.css" supports(transition: all 150ms);', language: languages.css},
	],
	invalid: [
		{code: 'a { transition: all 150ms; }', language: languages.css},
		{code: 'a { transition-property: all; }', language: languages.css},
		{code: 'a { transition: opacity 150ms, all 300ms; }', language: languages.css},
		{code: 'a { transition-property: opacity, all, color; }', language: languages.css},
		{code: 'a { transition: ALL 150ms; }', language: languages.css},
		{code: 'a { transition-property: all, all; }', language: languages.css},
	],
});

test({
	testerOptions: languages.css,
	valid: [],
	invalid: [
		{
			code: String.raw`a { transition: \61 ll 150ms; }`,
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			code: String.raw`a { tr\61 nsition: all 150ms; }`,
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			code: 'a { TRANSITION: all 150ms; }',
			errors: [{messageId: 'no-transition-all'}],
		},
		{
			code: String.raw`a { transition: \61
ll 150ms; }`,
			errors: [{messageId: 'no-transition-all'}],
		},
	],
});
