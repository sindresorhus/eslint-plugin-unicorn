import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const css = code => ({code, language: languages.css});
const MESSAGE_ID_ERROR = 'prefer-media-feature-range-syntax/error';
const MESSAGE_ID_SUGGESTION = 'prefer-media-feature-range-syntax/suggestion';

test({
	testerOptions: languages.css,
	valid: [],
	invalid: [
		{
			code: '@media (min-width: 500px) and (max-width: 999.0000000000000001px) {}',
			errors: [{
				messageId: MESSAGE_ID_ERROR,
				suggestions: [{
					messageId: MESSAGE_ID_SUGGESTION,
					output: '@media (500px <= width <= 999.0000000000000001px) {}',
				}],
			}],
		},
		{
			code: '@media (min-width: 500px) and (max-width: -1e-400px) {}',
			errors: [{
				messageId: MESSAGE_ID_ERROR,
				suggestions: [{
					messageId: MESSAGE_ID_SUGGESTION,
					output: '@media (500px <= width <= -1e-400px) {}',
				}],
			}],
		},
		{
			code: '@media (min-width /* inside */: 500px) and /* between */ (max-width: 999px) {}',
			output: '@media (min-width /* inside */: 500px) and /* between */ (width <= 999px) {}',
			errors: [
				{messageId: MESSAGE_ID_ERROR},
				{messageId: MESSAGE_ID_ERROR},
			],
		},
	],
});

test.snapshot({
	valid: [
		...[
			'@media (width >= 500px) {}',
			'@media (width <= 999px) {}',
			'@media (500px <= width < 1000px) {}',
			'@media (1000px > width >= 500px) {}',
			'@media (width: 500px) {}',
			'@media (width) {}',
			'@media (pointer: fine) {}',
			'@media (min-pointer: 1) {}',
			'@media (min-unknown-feature: 1px) {}',
			'@container (min-width: 500px) {}',
			'@import url("layout.css") (min-width: 500px);',
		].map(code => css(code)),
		{code: '@custom-media --narrow (max-width: 30em);', language: languages.css, languageOptions: {tolerant: true}},
	],
	invalid: [
		'@media (min-width: 500px) {}',
		'@media (max-width: 999px) {}',
		'@media (min-aspect-ratio: 4/3) {}',
		'@media (max-resolution: 2dppx) {}',
		'@media (min-color: 8) {}',
		'@media (max-color-index: 255) {}',
		'@media (min-monochrome: 1) {}',
		'@media (min-horizontal-viewport-segments: 2) {}',
		'@media (max-vertical-viewport-segments: 3) {}',
		'@media (min-device-width: 320px) {}',
		'@media (max-device-height: 1024px) {}',
		'@media (max-device-aspect-ratio: 16/9) {}',
		'@media (min-width: calc(30em + 1px)) {}',
		'@media (MIN-WIDTH: 500PX) {}',
		String.raw`@media (m\69n-width: 500px) {}`,
		'@media screen and (min-width: 500px) {}',
		'@media print, (max-width: 999px) {}',
		'@media (min-width: 500px) { @media (max-height: 999px) {} }',
	].map(code => css(code)),
});

test.snapshot({
	valid: [],
	invalid: [
		'@media (min-width: 500px) and (max-width: 999px) {}',
		'@media (max-width: 999px) and (min-width: 500px) {}',
		'@media screen and (min-width: 500px) and (max-width: 999px) {}',
		String.raw`@media (MIN-WIDTH: 500px) AnD (max-w\69 dth: 999px) {}`,
		'@media (min-width: 30em) and (max-width: 50em) {}',
		'@media (min-aspect-ratio: 4/3) and (max-aspect-ratio: 16/9) {}',
		'@media (min-resolution: 1.5dppx) and (max-resolution: 2dppx) {}',
		'@media (min-width: 500px) and (max-width: 999.5px) {}',
		'@media (min-width: 500px) and (max-width: -1px) {}',
		'@media (min-width: 500px) and (max-width: 9007199254740992px) {}',
		'@media (min-width: 500px) and (max-width: 999PX) {}',
		String.raw`@media (min-width: 500px) and (max-width: 999P\58) {}`,
		'@media (min-width: 500px) and (max-width: 999px), (min-height: 300px) and (max-height: 599px) {}',
		'@media (min-width: 500px) and (max-width: 999px) and (min-height: 300px) and (max-height: 599px) {}',
	].map(code => css(code)),
});

test.snapshot({
	valid: [],
	invalid: [
		'@media (min-width: 500px) and (max-height: 999px) {}',
		'@media (min-width: 500px) and (min-width: 600px) {}',
		'@media (min-width: 500px) or (max-width: 999px) {}',
		'@media (min-width: 500px) and (orientation: landscape) and (max-width: 999px) {}',
		'@media (min-width: 500px) /* keep */ and (max-width: 999px) {}',
		'@media (min-width /* keep */: 500px) {}',
		'@media (min-width /* keep */: 500px) and (max-width: 999px) {}',
		'@media (min-width: 500px) and (max-width: /* keep */ 999px) {}',
		outdent`
			@media (min-width: 500px)
				and /* keep */ (max-width: 999px) {}
		`,
	].map(code => css(code)),
});
