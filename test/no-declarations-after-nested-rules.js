import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const withCssLanguage = testCases => testCases.map(code => ({code, language: languages.css}));

test.snapshot({
	valid: withCssLanguage([
		'a { color: red; }',
		'a { color: red; b {} }',
		'a { color: red; @media (width > 0px) {} }',
		'a { b {} }',
		'a { b {} & { color: red; } }',
		'a { @layer theme; color: red; }',
		'a { @unknown; color: red; }',
		'a { @media (width > 0px) { color: red; } }',
		'a { b { color: red; c {} } }',
		'a { b {} /* comment */ }',
		'@page { margin: 1cm; @top-left { content: "Page"; } }',
	]),
	invalid: withCssLanguage([
		'a { b {} color: red; }',
		'a { & {} color: red; }',
		'a { @media (width > 0px) {} color: red; }',
		'a { @starting-style {} color: red; }',
		'a { @unknown {} color: red; }',
		'a { b {} --custom-property: value; }',
		'a { b {} @layer theme; color: red; }',
		'@page { @top-left { content: "Page"; } margin: 1cm; }',
		'a { color: red; b {} background: blue; border: 0; c {} opacity: 1; }',
		outdent`
			a {
				@media (width > 0px) {
					b {}
					color: red;
				}
			}
		`,
		outdent`
			.message {
				@media (width >= 600px) {
					padding: 16px;
				}

				/* Keep this comment. */
				padding: 8px;
			}
		`,
	]),
});
