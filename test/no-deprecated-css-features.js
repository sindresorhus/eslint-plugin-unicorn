import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const css = code => ({code, language: languages.css});
const cssWithOptions = (code, options) => ({code, language: languages.css, options: [options]});

test.snapshot({
	valid: [
		css('a { overflow-wrap: break-word; gap: 1rem; break-before: page; overflow: auto; text-orientation: sideways; }'),
		css('@media screen and (color) { :is(article, section)::before { color: CanvasText; } }'),
		css('-webkit-box { -webkit-box-orient: vertical; }'),
		css('a { --word-wrap: overlay; custom-property: overlay; color: custom(activecaption); }'),
		css('a { appearance: custom(button); color: rgb(0 0 0); width: 1intrinsic; }'),
		css('ALTGLYPH, glyphref { color: red; }'),
		css('::part(acronym), :lang(acronym) { color: red; }'),
		css(':state(acronym), :active-view-transition-type(acronym), :heading(acronym) { color: red; }'),
		css('@media (tv) { a { color: red; } }'),
		css('@supports (overflow-wrap: break-word) { a { color: red; } }'),
		cssWithOptions('word-wrap { word-wrap: break-word; }', {allow: ['word-wrap']}),
		cssWithOptions('@viewport { acronym:matches(::content) { word-break: break-word; } } @media tv {}', {
			allow: ['@viewport', 'acronym', ':matches', '::content', 'word-break: break-word', '@media tv'],
		}),
		cssWithOptions(String.raw`@v\69 ewport { ACRONYM:m\61 tches(a) { w\6f rd-break: break-word; } }`, {allow: ['@viewport', 'acronym', ':matches', 'word-break: break-word']}),
	],
	invalid: [
		css('@viewport { color: red; }'),
		css('@nest & > a { color: red; }'),
		css('@media tv { a { color: red; } }'),
		css('@media only PROJECTION { a { color: red; } }'),
		css('acronym, APPLET, altGlyph, glyphRef { color: red; }'),
		css(':matches(article), :-webkit-any(article), :focus-ring { color: red; }'),
		css('::content, ::shadow { color: red; }'),
		css('a { word-wrap: break-word; grid-gap: 1rem; grid-row-gap: 2rem; grid-column-gap: 3rem; }'),
		css('a { page-break-before: always; page-break-after: always; page-break-inside: avoid; }'),
		css('a { overflow: overlay; overflow-x: OVERLAY; overflow-y: overlay; text-orientation: sideways-right; }'),
		css('a { appearance: button; image-rendering: optimizeQuality; text-justify: distribute; user-select: element; zoom: reset; }'),
		css('a { color: activecaption; border-color: red inactiveborder; scrollbar-color: menu transparent; }'),
		css('a { text-decoration: blink; box-sizing: padding-box; width: intrinsic; word-break: break-word; }'),
		css('a { -moz-box-align: center; position-try-options: --fallback; scroll-snap-margin: 1rem; clip: rect(0); }'),
		css('@supports (word-wrap: break-word) { a { overflow: overlay; } }'),
		css('main { & acronym { overflow: overlay; } }'),
		css(String.raw`@v\69 ewport { ACRONYM:m\61 tches(a) { w\6f rd-wrap: break-word; } }`),
		css('a { color: rgb(from activecaption r g b); color: activecaption activeborder; }'),
	],
});

test({
	testerOptions: languages.css,
	valid: [],
	invalid: [
		{
			code: 'a { word-wrap /* keep */: break-word; }',
			output: 'a { overflow-wrap /* keep */: break-word; }',
			errors: [{messageId: 'no-deprecated-css-features/error'}],
		},
		{
			code: 'a { page-break-before: /* keep */ always; }',
			output: 'a { break-before: /* keep */ page; }',
			errors: [{messageId: 'no-deprecated-css-features/error'}],
		},
		{
			code: ':matches(/* keep */ a) {}',
			output: ':is(/* keep */ a) {}',
			errors: [{messageId: 'no-deprecated-css-features/error'}],
		},
		{
			code: 'a { appearance: button; }',
			output: null,
			errors: [
				{
					messageId: 'no-deprecated-css-features/error',
					suggestions: [{messageId: 'no-deprecated-css-features/suggestion', output: 'a { appearance: auto; }'}],
				},
			],
		},
		{
			code: 'a { -moz-box-align: center; }',
			output: null,
			errors: [
				{
					messageId: 'no-deprecated-css-features/error',
					suggestions: [{messageId: 'no-deprecated-css-features/suggestion', output: 'a { align-items: center; }'}],
				},
			],
		},
		{
			code: 'a { word-break: break-word; }',
			output: null,
			errors: [{messageId: 'no-deprecated-css-features/error', suggestions: 0}],
		},
		{
			code: 'a { page-break-before: var(--break); }',
			output: null,
			errors: [{messageId: 'no-deprecated-css-features/error', suggestions: 0}],
		},
		{
			code: '::content {}',
			output: null,
			errors: [{messageId: 'no-deprecated-css-features/error', suggestions: 0}],
		},
		{
			code: '@media not /* tv */ tv { a { color: red; } }',
			errors: [{messageId: 'no-deprecated-css-features/error', column: 21, endColumn: 23}],
		},
		{
			code: ':contains(popup), :drop(acronym) { color: red; }',
			errors: [
				{messageId: 'no-deprecated-css-features/error', data: {feature: 'selector', name: ':contains'}},
				{messageId: 'no-deprecated-css-features/error', data: {feature: 'selector', name: 'popup'}},
				{messageId: 'no-deprecated-css-features/error', data: {feature: 'selector', name: ':drop'}},
				{messageId: 'no-deprecated-css-features/error', data: {feature: 'selector', name: 'acronym'}},
			],
		},
		{
			code: ':contains(:matches(acronym)), :contains(:drop(acronym)) {}',
			output: ':contains(:is(acronym)), :contains(:drop(acronym)) {}',
			errors: 6,
		},
		{
			code: ':foo(:matches(acronym)), :--foo(:drop(popup)) {}',
			output: ':foo(:is(acronym)), :--foo(:drop(popup)) {}',
			errors: 4,
		},
		{
			code: '::cue(acronym), ::cue-region(:matches(acronym)) {}',
			output: '::cue(acronym), ::cue-region(:is(acronym)) {}',
			errors: 3,
		},
	],
});
