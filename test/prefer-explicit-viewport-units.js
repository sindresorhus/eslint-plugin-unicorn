import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		...[
			'.element { height: 100dvh; width: 100dvw; }',
			'.element { min-height: 100svh; max-width: 100lvw; }',
			'.element { block-size: 100dvh; inline-size: 100dvw; }',
			'.element { height: 99.9vh; width: 101vw; }',
			'.element { height: 50vh; width: 50vw; }',
			'.element { top: 100vh; left: 100vw; }',
			'.element { flex-basis: 100vh; grid-template-columns: 100vw; }',
			'.element { --viewport-size: 100vh; }',
			'.element { block-size: 100vb; inline-size: 100vi; }',
			'@media (min-height: 100vh) { .element { color: red; } }',
			'@supports (height: 100vh) { .element { color: red; } }',
		].map(code => ({code, language: languages.css})),
	],
	invalid: [
		...[
			'.element { height: 100vh; width: 100vw; }',
			'.element { min-height: 100vh; max-height: 100vh; min-width: 100vw; max-width: 100vw; }',
			'.element { block-size: 100vh; min-block-size: 100vh; max-block-size: 100vh; inline-size: 100vw; min-inline-size: 100vw; max-inline-size: 100vw; }',
			'.element { height: calc(100vh - 1rem); width: min(100vw, 80rem); block-size: clamp(20rem, 100vh /* fill */, 100vh); }',
			'.element { min-height: 100.0VH; }',
			'.fallback { height: 100vh; height: 100dvh; }',
			'@supports (height: 100dvh) { .element { height: 100vh; } }',
		].map(code => ({code, language: languages.css})),
	],
});

test.snapshot({
	valid: [
		'.small { height: 100svh; width: 100svw; }',
	].map(code => ({code, language: languages.css, options: [{unit: 'svh'}]})),
	invalid: [
		'.small { height: 100vh; width: 100vw; }',
	].map(code => ({code, language: languages.css, options: [{unit: 'svh'}]})),
});

test.snapshot({
	valid: [
		'.large { height: 100lvh; width: 100lvw; }',
	].map(code => ({code, language: languages.css, options: [{unit: 'lvh'}]})),
	invalid: [
		'.large { height: 100vh; width: 100vw; }',
	].map(code => ({code, language: languages.css, options: [{unit: 'lvh'}]})),
});
