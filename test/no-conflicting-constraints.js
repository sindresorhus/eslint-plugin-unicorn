import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, languages, parsers} from './utils/test.js';

const {test: ruleTest, rule} = getTester(import.meta);
const jsxOptions = {languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}};
const MEDIA_MESSAGE_ID = 'no-conflicting-constraints/media';
const HTML_MESSAGE_ID = 'no-conflicting-constraints/html';

ruleTest.snapshot({
	valid: [
		'@media (min-width: 500px) and (max-width: 1000px) {}',
		'@media (width >= 500px) and (width <= 500px) {}',
		'@media (500px <= width <= 500px) {}',
		'@media (500px >= width >= 500px) {}',
		'@media (500px < width <= 1000px) {}',
		'@media (1000px >= width > 500px) {}',
		'@media (width: 500px) and (min-width: 500px) {}',
		'@media (width > 1000px) and (height < 500px) {}',
		'@media (width > 1000px), (width < 500px) {}',
		'@media (width > 1000px) or (width < 500px) {}',
		'@media not screen and (width > 1000px) and (width < 500px) {}',
		'@media not (1000px < width < 500px) {}',
		'@media (width > 1000px) and (width < 500em) {}',
		'@media (width > 0) and (width <= 0px) {}',
		'@media (width > calc(1000px)) and (width < 500px) {}',
		'@media (width > env(breakpoint)) and (width < 500px) {}',
		'@media (width > var(--breakpoint)) and (width < 500px) {}',
		'@media (min-aspect-ratio: 16/9) and (max-aspect-ratio: 4/3) {}',
		'@media (resolution > infinite) and (resolution < 1dpi) {}',
		'@media (min-unknown: 10px) and (max-unknown: 5px) {}',
		'@media (min-grid: 1) and (max-grid: 0) {}',
		'@media (min-width: 10pixels) and (max-width: 5pixels) {}',
		'@media (min-width: 10) and (max-width: 5) {}',
		'@media (min-color: 2.5) and (max-color: 1.5) {}',
		'@media (min-resolution: 10px) and (max-resolution: 5px) {}',
		'@media (min-width: 1e999px) and (max-width: 5px) {}',
		'@media (width) and (max-width: 500px) {}',
		'@media (--narrow) {}',
		'@media (min-width: 1000px) { @media (max-width: 500px) {} }',
		'@media (width < 0px) {}',
		'@media (1 < color < 2) {}',
		'@container (min-width: 1000px) and (max-width: 500px) {}',
		String.raw`@media (\a: 10px) {}`,
		String.raw`@media (min-\2028: 10px) {}`,
		String.raw`@media (min-width: 10\65 3px) and (max-width: 5\65 3px) {}`,
		String.raw`@media (min-width: 10\31 px) and (max-width: 5\31 px) {}`,
		String.raw`@media (min-resolution: 10\65 3dpi) and (max-resolution: 5\65 3dpi) {}`,
	].map(code => ({code, language: languages.css})),
	invalid: [
		'@media (1000px < width < 500px) {}',
		'@media (500px > width > 1000px) {}',
		'@media (min-width: 1000px) and (max-width: 500px) {}',
		'@media (max-width: 500px) and (min-width: 1000px) {}',
		'@media (min-width: 1000px) and (width < 500px) {}',
		'@media (1000px < width) and (500px > width) {}',
		'@media (width > 500px) and (width <= 500px) {}',
		'@media (width >= 500px) and (width < 500px) {}',
		'@media (500px < width <= 500px) {}',
		'@media (500px >= width > 500px) {}',
		'@media (width: 500px) and (width > 500px) {}',
		'@media (width: 500px) and (width: 600px) {}',
		'@media (min-width: 1000px) and (orientation: landscape) and (max-width: 500px) {}',
		'@media (min-width: 1000px) and (min-width: 100px) and (max-width: 500px) {}',
		'@media (min-width: 100px) and (min-width: 1000px) and (max-width: 500px) {}',
		'@media (min-width: 1000px) and (max-width: 500px) and (max-width: 2000px) {}',
		'@media (min-width: 1000px) and (max-width: 2000px) and (max-width: 500px) {}',
		'@media (width > 500px) and (width >= 500px) and (width <= 500px) {}',
		'@media (width >= 500px) and (width > 500px) and (width <= 500px) {}',
		'@media (width >= 500px) and (width < 500px) and (width <= 500px) {}',
		'@media (width >= 500px) and (width <= 500px) and (width < 500px) {}',
		'@media only screen and (min-width: 1000px) and (max-width: 500px) {}',
		'@media (MIN-WIDTH: 1000PX) AnD (max-width: 500px) {}',
		String.raw`@media (min-w\69 dth: 1000p\78) and (max-width: 500px) {}`,
		'@media (min-width: +1e3px) and (max-width: 5e2px) {}',
		'@media (min-width: 10.5rem) and (max-width: 10rem) {}',
		'@media (min-width: 0) and (width < 0) {}',
		'@media (min-width: -5px) and (max-width: -10px) {}',
		'@media (/* keep */ min-width: 1000px) and /* keep */ (max-width: 500px) {}',
		'@media (min-width: 1000px) and (max-width: 500px), (min-height: 1000px) and (max-height: 500px) {}',
		'@media (min-width: 1000px) and (max-width: 500px) and (min-height: 1000px) and (max-height: 500px) {}',
		'@media (min-width: 1000px) and (max-width: 500px) and (min-width: 100em) and (max-width: 50em) {}',
		'@import url("layout.css") (min-width: 1000px) and (max-width: 500px);',
		'@import "layout.css" screen and (1000px < width < 500px);',
		...['height', 'device-width', 'device-height'].map(feature => `@media (min-${feature}: 1000px) and (max-${feature}: 500px) {}`),
		...['color', 'color-index', 'monochrome', 'horizontal-viewport-segments', 'vertical-viewport-segments'].map(feature => `@media (${feature} > 10) and (${feature} < 5) {}`),
		'@media (min-resolution: 2dppx) and (max-resolution: 1dppx) {}',
		String.raw`@media (\a: 10px) and (min-width: 1000px) and (max-width: 500px) {}`,
		'@import "layout.css" layer(theme) supports(display: grid) (width > 1000px) and (width < 500px);',
	].map(code => ({code, language: languages.css})),
});

ruleTest.snapshot({
	valid: [
		'<input type="number" min="5" max="10">',
		'<input type="number" min="5" max="5">',
		'<input type="range" min="5" max="5">',
		'<input minlength="5" maxlength="5">',
		'<textarea minlength="0" maxlength="0"></textarea>',
		'<input type="number" min="10">',
		'<input type="number" max="5">',
		'<input type="number" min="">',
		'<input type="number" min="10" max>',
		'<input type="number" min="+10" max="5">',
		'<input type="number" min="10." max="5">',
		'<input type="number" min=" 10" max="5">',
		'<input type="number" min="0x10" max="5">',
		'<input type="number" min="Infinity" max="5">',
		'<input type="number" min="1e999" max="5">',
		'<input type="number" max=5 min=10/2>',
		'<input type="number" max=5 min=10/>',
		'<input type=number min=10\'2 max=5>',
		'<input type=number min=10<2 max=5>',
		'<input minlength=10`2 maxlength=5>',
		'<input type="text" min="10" max="5">',
		'<input type="number" minlength="10" maxlength="5">',
		'<input type="date" min="2026-02-01" max="2026-01-01">',
		'<input type="time" min="23:00" max="01:00">',
		'<input type="range" min="101">',
		'<input type="number" min="0.1" max="0.2" step="1">',
		'<input minlength="-1" maxlength="0">',
		'<input minlength="1.5" maxlength="1">',
		'<input minlength="1e2" maxlength="5">',
		'<input minlength="9007199254740992" maxlength="5">',
		'<input type="{{type}}" min="10" max="5">',
		'<input type="number" min="{{minimum}}" max="5">',
		'<input type="number" min="10" min="0" max="5">',
		'<input type="number" type="text" min="10" max="5">',
		'<input minlength="10" maxlength="5" maxlength="20">',
		'<custom-input type="number" min="10" max="5"></custom-input>',
		'<textarea><input type="number" min="10" max="5"></textarea>',
		'<title><textarea minlength="10" maxlength="5"></textarea></title>',
	].map(code => ({code, language: languages.html})),
	invalid: [
		'<input type="range" min="10" max="5">',
		'<INPUT TYPE="NUMBER" MIN="10" MAX="5">',
		'<input type=number min=10 max=5>',
		'<input type="n&#117;mber" min="&#49;0" max="5">',
		'<input type=number min=&#49;0 max=5>',
		'<input type="number" min="-1.5" max="-2">',
		'<input type="number" min="-.5" max="-1">',
		'<input type="number" min="1e+2" max="5e1">',
		'<input type="number" min="10" max="5" disabled readonly>',
		'<input minlength="10" maxlength="5">',
		'<input type="" minlength="10" maxlength="5">',
		...['text', 'search', 'url', 'tel', 'email', 'password'].map(type => `<input type="${type}" minlength="10" maxlength="5">`),
		'<input minlength="010" maxlength="005">',
		'<textarea minlength="10" maxlength="5"></textarea>',
		'<textarea minlength=10 maxlength=5></textarea>',
		'<textarea minlength="10" maxlength="5" disabled></textarea>',
		'<input type minlength="10" maxlength="5">',
	].map(code => ({code, language: languages.html})),
});

ruleTest.snapshot({
	valid: [
		'@custom-media --narrow (min-width: 1000px) and (max-width: 500px);',
		'@media ((min-width: 1000px) and (max-width: 500px)) {}',
	].map(code => ({code, language: languages.css, languageOptions: {tolerant: true}})),
	invalid: [],
});

ruleTest.snapshot({
	valid: [
		'<input type="number" min="10{{offset}}" max="5">',
		'<input {{attributes}} minlength="10" maxlength="5">',
		'<input m{{suffix}}ax="20" type="number" min="10" max="5">',
		'<input type="{{type}}" minlength="10" maxlength="5">',
	].map(code => ({code, language: languages.html, languageOptions: {templateEngineSyntax: {'{{': '}}'}}})),
	invalid: [
		'<input type="number" min="10" max="5" title="{{title}}">',
	].map(code => ({code, language: languages.html, languageOptions: {templateEngineSyntax: {'{{': '}}'}}})),
});

ruleTest.snapshot({
	testerOptions: jsxOptions,
	valid: [
		'<input type="number" min={5} max={10} />',
		'<input type="number" min={5} max={5} />',
		'<textarea minLength={5} maxLength={5} />',
		'<Input type="number" min={10} max={5} />',
		'<components.input type="number" min={10} max={5} />',
		'<input type="time" min="23:00" max="01:00" />',
		'<input type="number" min={minimum} max={5} />',
		'<input type={type} min={10} max={5} />',
		'<input type="number" min={getMinimum()} max={5} />',
		'<input type="number" min={Infinity} max={5} />',
		'<input type="number" min={true} max={false} />',
		'<input type="number" min={10n} max={5n} />',
		'<input type="number" min={"&#49;0"} max={5} />',
		'<input type="number" min={10} max={5} {...properties} />',
		'<input {...properties} type="number" min={10} max={5} />',
		'<input type="number" min={10} min={0} max={5} />',
		'<input type="number" min={10} max={5} max={20} />',
		'<input type="number" type="text" min={10} max={5} />',
		'<input type="number" min max={5} />',
		'<input type="number" min={10} max={undefined} />',
		'<input minLength={10.5} maxLength={5} />',
		'<input minLength={10} maxLength={-5} />',
		'let minimum = 10; minimum = 0; <input type="number" min={minimum} max={5} />',
		'var minimum = 10; <input type="number" min={minimum} max={5} />',
		'let type = "number"; <input type={type} min={10} max={5} />',
		'<input type="number" min={minimum} max={5} />; const minimum = 10;',
		'let minimum = 10; const bound = minimum; <input type="number" min={bound} max={5} />',
		'const bounds = {min: 10}; bounds.min = 0; <input type="number" min={bounds.min} max={5} />',
		'const bounds = {get min() { return 10; }}; <input type="number" min={bounds.min} max={5} />',
		'let minimum = 10; <input type="number" min={true ? minimum : 0} max={5} />',
	],
	invalid: [
		'<input type="range" min="10" max="5" />',
		'<input type="number" min="&#49;0" max="5" />',
		'<input type="number" min={-.5} max={-1} />',
		'<input type="number" min={1e2} max={5e1} />',
		'<input minLength="10" maxLength="5" />',
		'<textarea minLength={10} maxLength={5} />',
		'<input type={"number"} min={10} max={5} />',
		'const minimum = 5; <input type="number" min={minimum + 5} max={5} />',
		'const type = "number"; <input type={type} min={10} max={5} />',
		'const minimum = "10"; <input type="number" min={minimum} max="5" />',
		'const element = <section><input type="number" min={10} max={5} /></section>;',
		'<input type="number" min={/* keep */ 10} max={5} />',
		...['text', 'search', 'url', 'tel', 'email', 'password'].map(type => `<input type="${type}" minLength={10} maxLength={5} />`),
		...['10 as number', '10 satisfies number', '(10)!'].map(expression => ({code: `<input type="number" min={${expression}} max={5} />`, languageOptions: {parser: parsers.typescript}})),
		'<input type="number" min={10} max={5} className={className} />',
		{code: '<input type="number" min={(10 as number) + 5} max={5} />', languageOptions: {parser: parsers.typescript}},
		{code: 'const minimum = 10 as number; <input type="number" min={minimum} max={5} />', languageOptions: {parser: parsers.typescript}},
		'let minimum = 10; <input type="number" min={true ? 10 : minimum} max={5} />',
	],
});

ruleTest({
	testerOptions: languages.css,
	valid: [],
	invalid: [{
		code: '@media (width > 1000px) and (width < 500px) {}',
		errors: [{messageId: MEDIA_MESSAGE_ID, column: 29, endColumn: 44}],
	}],
});

ruleTest({
	testerOptions: languages.html,
	valid: [],
	invalid: [{
		code: '<input type="number" min="10" max="5">',
		errors: [{messageId: HTML_MESSAGE_ID, column: 36, endColumn: 37}],
	}],
});

ruleTest({
	testerOptions: jsxOptions,
	valid: [],
	invalid: [{
		code: '<input type="number" min={10} max={5} />',
		errors: [{messageId: HTML_MESSAGE_ID, column: 36, endColumn: 37}],
	}],
});

test('metadata and neighboring rules', t => {
	t.deepEqual(rule.meta.languages, ['js/js', 'css/css', 'html/html']);
	t.is(rule.meta.docs.recommended, 'unopinionated');
	t.is(rule.meta.fixable, undefined);
	t.is(rule.meta.hasSuggestions, undefined);

	const linter = new Linter();
	for (const code of ['<input type="number" min="10" max="5">', '<input minlength="10" maxlength="5">', '<textarea minlength="10" maxlength="5"></textarea>']) {
		t.deepEqual(linter.verify(code, [{
			files: ['**'],
			...languages.html,
			rules: {'html/no-invalid-attr-value': 'error', 'html/no-ineffective-attrs': 'error'},
		}], {filename: 'index.html'}), []);
	}

	const neighboringRule = unicorn.rules['no-invalid-media-features'];
	for (const code of ['@media (width > 1000px) and (width < 500px) {}', '@media (1000px < width < 500px) {}', '@media (500px > width > 1000px) {}']) {
		t.deepEqual(linter.verify(code, [{
			files: ['**'],
			...languages.css,
			plugins: {...languages.css.plugins, unicorn: {rules: {'no-invalid-media-features': neighboringRule}}},
			rules: {'unicorn/no-invalid-media-features': 'error'},
		}], {filename: 'index.css'}), []);
	}
});
