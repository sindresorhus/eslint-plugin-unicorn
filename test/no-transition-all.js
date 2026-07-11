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
