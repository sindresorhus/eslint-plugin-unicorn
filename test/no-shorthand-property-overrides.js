import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { padding: 20px; padding-left: 10px; }',
		'a { padding-left: 10px; } b { padding: 20px; }',
		'a { -webkit-transition-property: opacity; transition: opacity 1s linear; }',
		'a { transition-property: opacity; -webkit-transition: opacity 1s linear; }',
		'a { --padding-left: 10px; padding: 20px; }',
		String.raw`a { p\61 dding-left: 10px; padding: 20px; }`,
		'a { color: red; padding: 20px; }',
		outdent`
			a {
				padding-left: 10px;
				@media (width > 0px) {
					padding: 20px;
				}
			}
		`,
	].map(code => ({code, language: languages.css})),
	invalid: [
		'a { padding-left: 10px; padding: 20px; }',
		'a { background-repeat: no-repeat; background: url(lion.png); }',
		'a { border-image-source: url(border.png); border: 1px solid; }',
		'a { font-variant-caps: small-caps; font: 1em sans-serif; }',
		'a { transition-property: opacity; transition: opacity 1s linear; }',
		'a { grid-row-start: 1; grid-row: 1 / 3; }',
		'a { inset-block-end: 1px; inset-block: 2px; }',
		'a { scroll-padding-left: 1px; scroll-padding: 2px; }',
		'a { PADDING-LEFT: 10px; PADDING: 20px; }',
		'a { -webkit-transition-property: opacity; -webkit-transition: opacity 1s linear; }',
		'a { padding-top: 10px; padding-left: 20px; padding: 30px; }',
	].map(code => ({code, language: languages.css})),
});
