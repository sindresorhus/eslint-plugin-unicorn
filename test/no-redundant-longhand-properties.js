import {Linter} from 'eslint';
import test from 'ava';
import outdent from 'outdent';
import cssPlugin from '@eslint/css';
import {getTester, languages} from './utils/test.js';

const {test: testRule, rule} = getTester(import.meta);

const css = code => ({code, language: languages.css});

testRule.snapshot({
	valid: [
		'a { margin-top: 1px; margin-right: 2px; margin-bottom: 3px; }',
		'a { margin-top: 1px; margin-right: 2px; } b { margin-bottom: 3px; margin-left: 4px; }',
		'a { margin-top: 1px; margin-right: 2px; margin-bottom: 3px !important; margin-left: 4px; }',
		'a { margin-top: inherit; margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
		'a { margin-top: red; margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
		'a { margin-top: var(--top); margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
		'a { margin-top: env(safe-area-inset-top); margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
		'a { margin-top: inherit(--spacing); margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
		'a { margin-top: --spacing(); margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
		'a { margin-top: 1px; margin-top: 2px; margin-right: 3px; margin-bottom: 4px; margin-left: 5px; }',
		'a { margin-top: 1px; margin: 2px; margin-right: 3px; margin-bottom: 4px; margin-left: 5px; }',
		'a { margin-top: 1px; margin-right: 2px; margin-inline-start: 5px; margin-bottom: 3px; margin-left: 4px; }',
		'a { border-top-width: 1px; border-right-width: 2px; border-block-start-width: 5px; border-bottom-width: 3px; border-left-width: 4px; }',
		'a { border-image-source: url(border.png); border-width: 1px; border-style: solid; border-color: red; }',
		'a { font-feature-settings: "kern"; font-style: italic; font-variant: normal; font-weight: 700; font-stretch: normal; font-size: 16px; line-height: 1.5; font-family: serif; }',
		'a { font-style: italic; font-variant: normal; font-weight: 700; font-stretch: normal; font-size: 16px; line-height: 1.5; font-family: serif; }',
		'a { font: inherit; font-style: italic; font-variant: normal; font-weight: 700; font-stretch: normal; font-size: 16px; line-height: 1.5; font-family: serif; }',
		'a { border: nonsense; border-width: 1px; border-style: solid; border-color: red; }',
		'a { border: revert-rule; border-width: 1px; border-style: solid; border-color: red; }',
		'a { border: revert-layer/**/; border-width: 1px; border-style: solid; border-color: red; }',
		'a { border-image: initial; border-width: inherit; border-style: inherit; border-color: inherit; }',
		'a { border-image: initial !important; border-width: 1px; border-style: solid; border-color: red; }',
		'a { border-width: 1px; border-style: solid; border-color: red; }',
		'a { mask-image: none; mask-position: 0% 0%; mask-size: auto; mask-repeat: repeat; mask-origin: border-box; mask-clip: border-box; mask-composite: add; mask-mode: match-source; }',
		outdent`
			a {
				mask-border: initial;
				mask-border-source: url(border.svg);
				mask-image: none;
				mask-position: 0% 0%;
				mask-size: auto;
				mask-repeat: repeat;
				mask-origin: border-box;
				mask-clip: border-box;
				mask-composite: add;
				mask-mode: match-source;
			}
		`,
		'a { font-synthesis-position: auto; font-synthesis: none; font-synthesis-weight: auto; font-synthesis-style: auto; font-synthesis-small-caps: auto; }',
		'a { transition-property: opacity; transition-duration: 1s; transition-timing-function: ease; transition-delay: 0s; }',
		'a { transition: opacity 1s allow-discrete; transition-property: opacity; transition-duration: 1s; transition-timing-function: ease; transition-delay: 0s; }',
		outdent`
			a {
				animation-duration: 1s;
				animation-timing-function: ease;
				animation-delay: 0s;
				animation-iteration-count: 1;
				animation-direction: normal;
				animation-fill-mode: none;
				animation-play-state: running;
				animation-name: fade;
			}
		`,
		outdent`
			a {
				animation-range-start: initial;
				animation-range-end: initial;
				animation-range: entry;
				animation-composition: initial;
				animation-timeline: auto;
				animation-name: fade;
				animation-duration: 1s;
				animation-timing-function: ease;
				animation-delay: 0s;
				animation-iteration-count: 1;
				animation-direction: normal;
				animation-fill-mode: none;
				animation-play-state: running;
			}
		`,
		'a { transition-behavior: normal; transition-property: opacity; transition-duration: 1s, 2s; transition-timing-function: ease; transition-delay: 0s; }',
		outdent`
			a {
				animation-composition: initial;
				animation-timeline: auto;
				animation-range-start: initial;
				animation-range-end: initial;
				animation-name: fade;
				animation-duration: 1s, 2s;
				animation-timing-function: ease;
				animation-delay: 0s;
				animation-iteration-count: 1;
				animation-direction: normal;
				animation-fill-mode: none;
				animation-play-state: running;
			}
		`,
		outdent`
			a {
				background-image: url(a.png);
				background-position: 0 0, 10px 10px;
				background-size: auto;
				background-repeat: no-repeat;
				background-attachment: scroll;
				background-origin: padding-box;
				background-clip: border-box;
				background-color: red;
			}
		`,
		outdent`
			a {
				mask-border: initial;
				mask-image: url(a.svg);
				mask-position: 0 0, 10px 10px;
				mask-size: auto;
				mask-repeat: no-repeat;
				mask-origin: border-box;
				mask-clip: border-box;
				mask-composite: add;
				mask-mode: alpha;
			}
		`,
		'a { border-block-width: 1px; border-top-width: 2px; border-block-style: solid; border-block-color: red; }',
		'a { border-top-left-radius: 1px; border-start-start-radius: 2px; border-top-right-radius: 3px; border-bottom-right-radius: 4px; border-bottom-left-radius: 5px; }',
		'a { grid-template-rows: [foo] 1fr; grid-template-columns: 1fr; grid-template-areas: "a" "b"; }',
		'a { margin-top: 1px; margin-right: 2px; all: initial; margin-bottom: 3px; margin-left: 4px; }',
		'a { animation-composition: initial; animation-range: initial; animation-duration: 1s; animation-timing-function: ease; animation-delay: 0s; animation-iteration-count: 1; animation-direction: normal; animation-fill-mode: none; animation-play-state: running; animation-name: auto; animation-timeline: --timeline; }',
		'a { animation-composition: initial; animation-range: initial; animation-duration: 1s; animation-timing-function: ease; animation-delay: 0s; animation-iteration-count: 1; animation-direction: normal; animation-fill-mode: none; animation-play-state: running; animation-name: --keyframes; animation-timeline: auto; }',
		'a { -webkit-transition-property: opacity; transition-duration: 1s; -webkit-transition-timing-function: ease; -webkit-transition-delay: 0s; }',
		String.raw`a { m\61 rgin-top: 1px; margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }`,
		'a { --margin-top: 1px; margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
	].map(code => css(code)),
	invalid: [
		'a { margin-top: 1px; margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
		'a { MARGIN-TOP: 1px; margin-RIGHT: 2px; Margin-Bottom: 3px; MARGIN-left: 4px; }',
		'a { outline-color: red; outline-style: solid; outline-width: 1px; }',
		'a { row-gap: 1px; column-gap: 2px; }',
		outdent`
			a {
				margin-top: 1px;
				& b {
					margin-top: 1px;
					margin-right: 2px;
					margin-bottom: 3px;
					margin-left: 4px;
				}
				margin-right: 2px;
				margin-bottom: 3px;
				margin-left: 4px;
			}
		`,
	].map(code => css(code)),
});

testRule({
	testerOptions: languages.css,
	valid: [
		{
			code: 'a { padding-top: 1px; padding-right: 2px; padding-bottom: 3px; padding-left: 4px; }',
			options: [{ignoreShorthands: ['padding']}],
		},
		{
			code: 'a { -webkit-transition-property: opacity; -webkit-transition-duration: 1s; -webkit-transition-timing-function: ease; -webkit-transition-delay: 0s; }',
			options: [{ignoreShorthands: ['transition']}],
		},
	],
	invalid: [
		{
			code: 'a { padding-top: 1px; padding-right: 2px; padding-bottom: 3px; padding-left: 4px; }',
			output: 'a { padding: 1px 2px 3px 4px; }',
			errors: 1,
		},
		{
			code: 'a { border-top-left-radius: 50% 10%; border-top-right-radius: 50% 10%; border-bottom-right-radius: 50% 10%; border-bottom-left-radius: 50% 10%; }',
			output: 'a { border-radius: 50% / 10%; }',
			errors: 1,
		},
		{
			code: 'a { border-image-source: none; border-image-slice: 100%; border-image-width: 1; border-image-outset: 0; border-image-repeat: stretch; }',
			output: 'a { border-image: none 100% / 1 / 0 stretch; }',
			errors: 1,
		},
		{
			code: outdent`
				a {
					font-feature-settings: initial;
					font-kerning: initial;
					font-language-override: initial;
					font-optical-sizing: initial;
					font-size-adjust: initial;
					font-variation-settings: initial;
					font-style: italic;
					font-variant: normal;
					font-weight: 700;
					font-stretch: normal;
					font-size: 16px;
					line-height: 1.5;
					font-family: serif;
				}
			`,
			output: outdent`
				a {
					font: italic normal 700 normal 16px / 1.5 serif;
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				a {
					animation-composition: initial;
					animation-range: initial;
					animation-duration: 1s;
					animation-timing-function: ease;
					animation-delay: 0s;
					animation-iteration-count: 1;
					animation-direction: normal;
					animation-fill-mode: none;
					animation-play-state: running;
					animation-name: fade;
					animation-timeline: auto;
				}
			`,
			output: outdent`
				a {
					animation: 1s ease 0s 1 normal none running fade auto;
				}
			`,
			errors: 1,
		},
		{
			code: 'a { animation-composition: initial; animation-range: initial; animation-duration: 1s; animation-timing-function: ease; animation-delay: 0s; animation-iteration-count: 1; animation-direction: normal; animation-fill-mode: none; animation-play-state: running; animation-name: none; animation-timeline: --timeline; }',
			output: 'a { animation: 1s ease 0s 1 normal none running none --timeline; }',
			errors: 1,
		},
		{
			code: outdent`
				a {
					animation: initial;
					animation-duration: 1s;
					animation-timing-function: ease;
					animation-delay: 0s;
					animation-iteration-count: 1;
					animation-direction: normal;
					animation-fill-mode: none;
					animation-play-state: running;
					animation-name: fade;
					animation-timeline: auto;
				}
			`,
			output: outdent`
				a {
					animation: 1s ease 0s 1 normal none running fade auto;
				}
			`,
			errors: 1,
		},
		{
			code: 'a { font-synthesis-weight: auto; font-synthesis-style: none; font-synthesis-small-caps: auto; font-synthesis-position: none; }',
			output: 'a { font-synthesis: weight small-caps; }',
			errors: 1,
		},
		{
			code: 'a { font-synthesis-weight: auto; font-synthesis-style: none; font-synthesis-small-caps: none; font-synthesis-position: auto; }',
			output: 'a { font-synthesis: weight position; }',
			errors: 1,
		},
		{
			code: outdent`
				a {
					font-variant-ligatures: normal;
					font-variant-position: normal;
					font-variant-caps: small-caps;
					font-variant-numeric: normal;
					font-variant-alternates: normal;
					font-variant-east-asian: normal;
					font-variant-emoji: normal;
				}
			`,
			output: outdent`
				a {
					font-variant: small-caps;
				}
			`,
			errors: 1,
		},
		{
			code: 'a { grid-row-start: 1; grid-column-start: 2; grid-row-end: 3; grid-column-end: 4; }',
			output: 'a { grid-area: 1 / 2 / 3 / 4; }',
			errors: 1,
		},
		{
			code: 'a { grid-template-rows: 1fr 2fr; grid-template-columns: 1fr; grid-template-areas: "header" "main"; }',
			output: 'a { grid-template: "header" 1fr "main" 2fr / 1fr; }',
			errors: 1,
		},
		{
			code: 'a { transition-behavior: normal, allow-discrete; transition-property: ease-in, color; transition-duration: 1s; transition-timing-function: linear, ease; transition-delay: 0s; }',
			output: 'a { transition: 1s linear 0s normal ease-in, 1s ease 0s allow-discrete color; }',
			errors: 1,
		},
		{
			code: outdent`
				a {
					animation-composition: initial;
					animation-timeline: auto, --timeline;
					animation-range-start: initial;
					animation-range-end: initial;
					animation-name: fade, slide;
					animation-duration: 1s;
					animation-timing-function: ease;
					animation-delay: 0s;
					animation-iteration-count: 1;
					animation-direction: normal;
					animation-fill-mode: none;
					animation-play-state: running;
				}
			`,
			output: outdent`
				a {
					animation: 1s ease 0s 1 normal none running fade auto, 1s ease 0s 1 normal none running slide --timeline;
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				a {
					background-image: none;
					background-size: auto;
					background-position: 0% 0%;
					background-repeat: repeat;
					background-origin: padding-box;
					background-clip: border-box;
					background-attachment: scroll;
					background-color: transparent;
				}
			`,
			output: outdent`
				a {
					background: none 0% 0% / auto repeat scroll padding-box border-box transparent;
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				a {
					mask-border: initial;
					mask-image: none;
					mask-mode: match-source;
					mask-position: 0% 0%;
					mask-size: auto;
					mask-repeat: repeat;
					mask-origin: border-box;
					mask-clip: border-box;
					mask-composite: add;
				}
			`,
			output: outdent`
				a {
					mask: none 0% 0% / auto repeat border-box border-box add match-source;
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				a {
					grid-column-gap: initial;
					grid-row-gap: initial;
					grid-template-rows: 1fr;
					grid-template-columns: 1fr;
					grid-template-areas: none;
					grid-auto-rows: auto;
					grid-auto-columns: auto;
					grid-auto-flow: row;
				}
			`,
			output: outdent`
				a {
					grid-gap: initial;
					grid: 1fr / 1fr;
				}
			`,
			errors: 2,
		},
		{
			code: 'a { grid-template-rows: 100px; grid-template-columns: none; grid-template-areas: none; grid-auto-rows: auto; grid-auto-columns: 1fr; grid-auto-flow: row dense; }',
			output: 'a { grid-template: 100px / none; grid-auto-rows: auto; grid-auto-columns: 1fr; grid-auto-flow: row dense; }',
			errors: 1,
		},
		{
			code: 'a { grid-template-rows: none; grid-template-columns: 100px; grid-template-areas: none; grid-auto-rows: 1fr; grid-auto-columns: auto; grid-auto-flow: column dense; }',
			output: 'a { grid-template: none / 100px; grid-auto-rows: 1fr; grid-auto-columns: auto; grid-auto-flow: column dense; }',
			errors: 1,
		},
		{
			code: outdent`
				a {
					grid-column-gap: initial;
					grid-row-gap: initial;
					grid-template-rows: 100px;
					grid-template-columns: none;
					grid-template-areas: none;
					grid-auto-rows: auto;
					grid-auto-columns: 1fr;
					grid-auto-flow: column dense;
				}
			`,
			output: outdent`
				a {
					grid-gap: initial;
					grid: 100px / auto-flow dense 1fr;
				}
			`,
			errors: 2,
		},
		{
			code: outdent`
				a {
					grid-column-gap: initial;
					grid-row-gap: initial;
					grid-template-rows: none;
					grid-template-columns: 100px;
					grid-template-areas: none;
					grid-auto-rows: 1fr;
					grid-auto-columns: auto;
					grid-auto-flow: row dense;
				}
			`,
			output: outdent`
				a {
					grid-gap: initial;
					grid: auto-flow dense 1fr / 100px;
				}
			`,
			errors: 2,
		},
		{
			code: outdent`
				a {
					background-image: url(a.png), url(b.png);
					background-position: 0 0, 10px 10px;
					background-size: auto;
					background-repeat: no-repeat;
					background-attachment: scroll;
					background-origin: padding-box;
					background-clip: border-box;
					background-color: red;
				}
			`,
			output: outdent`
				a {
					background: url(a.png) 0 0 / auto no-repeat scroll padding-box border-box, url(b.png) 10px 10px / auto no-repeat scroll padding-box border-box red;
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				a {
					mask-border: initial;
					mask-image: url(a.svg), url(b.svg);
					mask-position: 0 0, 10px 10px;
					mask-size: auto;
					mask-repeat: no-repeat;
					mask-origin: border-box;
					mask-clip: border-box;
					mask-composite: add;
					mask-mode: alpha;
				}
			`,
			output: outdent`
				a {
					mask: url(a.svg) 0 0 / auto no-repeat border-box border-box add alpha, url(b.svg) 10px 10px / auto no-repeat border-box border-box add alpha;
				}
			`,
			errors: 1,
		},
		{
			code: 'a { -webkit-transition-property: opacity; -webkit-transition-duration: 1s; -webkit-transition-timing-function: ease; -webkit-transition-delay: 0s; }',
			output: 'a { -webkit-transition: 1s ease 0s opacity; }',
			errors: 1,
		},
		{
			code: 'a { -webkit-transition-property: ease-in; -webkit-transition-duration: 1s; -webkit-transition-timing-function: linear; -webkit-transition-delay: 0s; }',
			output: 'a { -webkit-transition: 1s linear 0s ease-in; }',
			errors: 1,
		},
		{
			code: 'a { -webkit-animation-duration: 1s; -webkit-animation-timing-function: ease; -webkit-animation-delay: 0s; -webkit-animation-iteration-count: 1; -webkit-animation-direction: normal; -webkit-animation-fill-mode: none; -webkit-animation-play-state: running; -webkit-animation-name: fade; }',
			output: 'a { -webkit-animation: 1s ease 0s 1 normal none running fade; }',
			errors: 1,
		},
		{
			code: 'a { list-style-type: inside; list-style-position: outside; list-style-image: none; }',
			output: 'a { list-style: outside inside none; }',
			errors: 1,
		},
		{
			code: 'a { overflow-x: hidden; overflow-y: auto; }',
			output: 'a { overflow: hidden auto; }',
			errors: 1,
		},
		{
			code: 'a { margin-inline-start: 1px; margin-inline-end: 2px; }',
			output: 'a { margin-inline: 1px 2px; }',
			errors: 1,
		},
		{
			code: 'a { border-top-width: 1px; border-right-width: 2px; border-bottom-width: 3px; border-left-width: 4px; }',
			output: 'a { border-width: 1px 2px 3px 4px; }',
			errors: 1,
		},
		{
			code: 'a { border-image: initial; border-width: 1px; border-style: solid; border-color: red; }',
			output: 'a { border: 1px solid red; }',
			errors: 1,
		},
		{
			code: 'a { border-image: inherit; border-width: inherit; border-style: inherit; border-color: inherit; }',
			output: 'a { border: inherit; }',
			errors: 1,
		},
		{
			code: 'a { border-image: initial; border-top-width: 1px; border-right-width: 1px; border-bottom-width: 1px; border-left-width: 1px; border-top-style: solid; border-right-style: solid; border-bottom-style: solid; border-left-style: solid; border-top-color: red; border-right-color: red; border-bottom-color: red; border-left-color: red; }',
			output: 'a { border-image: initial; border-width: 1px; border-style: solid; border-color: red; }',
			errors: 3,
		},
		{
			code: 'a { scroll-padding-top: 1px; scroll-padding-right: 2px; scroll-padding-bottom: 3px; scroll-padding-left: 4px; }',
			output: 'a { scroll-padding: 1px 2px 3px 4px; }',
			errors: 1,
		},
		{
			code: 'a { top: inherit; right: inherit; bottom: inherit; left: inherit; }',
			output: 'a { inset: inherit; }',
			errors: 1,
		},
		{
			code: 'a { padding-top: 1px !important; padding-right: 2px !important; padding-bottom: 3px !important; padding-left: 4px !important; }',
			output: 'a { padding: 1px 2px 3px 4px !important; }',
			errors: 1,
		},
		{
			code: 'a { margin-top: 1px; color: red; margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
			output: null,
			errors: 1,
		},
		{
			code: 'a { grid-row-gap: 1px; grid: 1fr / 1fr; grid-column-gap: 2px; }',
			output: null,
			errors: 1,
		},
		{
			code: 'a { margin-top: 1px; /* Keep this explanation. */ margin-right: 2px; margin-bottom: 3px; margin-left: 4px; }',
			output: null,
			errors: 1,
		},
		{
			code: 'a {\r\n\tmargin-top: 1px;\r\n\tmargin-right: 2px;\r\n\tmargin-bottom: 3px;\r\n\tmargin-left: 4px;\r\n}',
			output: 'a {\r\n\tmargin: 1px 2px 3px 4px;\r\n}',
			errors: 1,
		},
		{
			code: 'a { margin-top: 1px; margin-right: 2px; margin-bottom: 3px; margin-left: 4px }',
			output: 'a { margin: 1px 2px 3px 4px }',
			errors: 1,
		},
	],
});

test('rejects unknown ignored shorthands', t => {
	const linter = new Linter();

	t.throws(() => linter.verify(
		'a {}',
		{
			files: ['**'],
			language: 'css/css',
			plugins: {
				css: cssPlugin,
				test: {rules: {rule}},
			},
			rules: {
				'test/rule': ['error', {ignoreShorthands: ['unknown']}],
			},
		},
		{filename: 'test.css'},
	), {message: /Value "unknown" should be equal to one of the allowed values\./u});
});
