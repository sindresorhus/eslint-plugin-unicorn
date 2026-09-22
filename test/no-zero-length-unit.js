import test from 'ava';
import css from '@eslint/css';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, languages} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest.snapshot({
	valid: [
		'a { margin: 0; width: 2px; height: 1e-999px; }',
		'a { opacity: 0px; scale: 0px; } @media (grid: 0px) { a { margin: 0; } }',
		'a { transition-duration: 0s; animation-delay: 0ms; rotate: 0deg; grid-template-columns: 0fr; width: 0%; }',
		'a { --space: 0px; width: var(--space, 0px); }',
		'a { transform: translate(0px, var(--space)); }',
		'a { width: unknown(0px); }',
		'a { flex: 0px; flex: 1 1 0px; flex: 0%; }',
		'a { columns: 0px; }',
		'a { -webkit-flex: 0px; -webkit-columns: 0px; }',
		'a { line-height: 0px; tab-size: 0px; border-image-width: 0px; border-image-outset: 0px; }',
		'a { font: 12px/0px sans-serif; border-image: url(image.png) 30 / 0px / 0px; }',
		'a { mask-border-width: 0px; mask-border-outset: 0px; mask-border: url(image.png) 30 / 0px / 0px; }',
		'a { stroke-width: 0px; stroke-dashoffset: 0px; stroke-dasharray: 0px 1px; }',
		'@property --space { syntax: "*"; inherits: false; initial-value: 0px; }',
		'@supports (line-height: 0px) { a { margin: 0; } } @container style(--space: 0px) { a { margin: 0; } }',
		'a { FLEX: 0px; width: CALC(0px + 1px); transform: translateX(calc(0px + 1px)); }',
		'a { width: calc(0px + 1px); height: min(0px, 1px); max-width: clamp(0px, 1px, 2px); }',
		'a { width: -webkit-calc(0px + 1px); }',
		'a { width: round(0px, 1px); height: calc-size(0px, size + 1px); }',
		'a { width: progress(0px, 1px, 2px); height: random(0px, 1px); }',
		'a { transform: --shift(0px); content: "0px"; background: url(0px); }',
		String.raw`a { width: 0p\78; /* 0px */ }`,
		'a { width: 0foo; }',
	].map(code => ({code, language: languages.css})),
	invalid: [
		'a { margin: 0px; }',
		'a { margin: var(--space) 0px; padding: 0px env(safe-area-inset-bottom); }',
		'a { margin: 0px /* keep */; }',
		'a { margin: +0.000PX -0rem 0e3cqw; }',
		'@media (width > 0px) { a { margin: 0px; } }',
		'@media (min-width: 0px) and (0px < height) { a { margin: 0px; } }',
		'@media (max-device-width: 0px) {}',
		'@container (width > 0px) { a { padding: 0em; } }',
		'@container (inline-size: 0px) { a { padding: 0em; } }',
		'@container (block-size > 0px) {}',
		'@supports (margin: 0px) { a { padding: 0em; } }',
		'a { flex-basis: 0px; }',
		'a { transform: translate(0px, 0rem); filter: blur(0px); grid-template-columns: minmax(0px, 1fr); }',
		'a { border: 0q solid; }',
		'a { width: 0.0px; }',
		'a { width: 0e999px; }',
	].map(code => ({code, language: languages.css})),
});

test('works with no-zero-fractions', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('a { margin: 0.0px; }', {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, unicorn},
		rules: {
			'unicorn/no-zero-fractions': 'error',
			'unicorn/no-zero-length-unit': 'error',
		},
	}, {filename: 'fixture.css'});

	t.true(result.fixed);
	t.is(result.output, 'a { margin: 0; }');
	t.deepEqual(result.messages, []);
});
