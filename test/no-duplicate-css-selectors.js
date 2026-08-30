import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const asCss = code => ({code, language: languages.css});

test.snapshot({
	valid: [
		'.card { color: red; } .button { color: blue; }',
		'.card, .featured { color: red; } .card { color: blue; }',
		'.card, .featured { color: red; } .featured, .card { color: blue; }',
		'.card.featured { color: red; } .featured.card { color: blue; }',
		'.Card { color: red; } .card { color: blue; }',
		String.raw`.u-m\2b { color: red; } .u-m\00002b { color: blue; }`,
		outdent`
			.card { color: red; }
			@media (width > 10px) {
				.card { color: blue; }
			}
		`,
		outdent`
			@media (width > 10px) {
				.card { color: red; }
			}
			@media (width > 20px) {
				.card { color: blue; }
			}
		`,
		outdent`
			@media (width > 10px) and (height > 10px) {
				.card { color: red; }
			}
			@media (height > 10px) and (width > 10px) {
				.card { color: blue; }
			}
		`,
		outdent`
			.parent {
				.child { color: red; }
			}
			.other-parent {
				.child { color: blue; }
			}
		`,
		outdent`
			.parent .child { color: red; }
			.parent {
				& .child { color: blue; }
			}
		`,
		outdent`
			@layer {
				.card { color: red; }
			}
			@layer {
				.card { color: blue; }
			}
		`,
		outdent`
			@keyframes fade {
				from { opacity: 0; }
				from { opacity: 1; }
			}
		`,
		outdent`
			@-webkit-keyframes fade {
				from { opacity: 0; }
				from { opacity: 1; }
			}
		`,
	].map(code => asCss(code)),
	invalid: [
		'.card { color: red; } .other { color: green; } .card { color: blue; }',
		'a > b { color: red; } a/* comment */>b { color: blue; }',
		'.card, .featured { color: red; } .card,.featured { color: blue; }',
		'.button, .button { padding: 8px; }',
		'a, b, a { color: red; }',
		'a, a, a { color: red; }',
		'a, /* keep */ a { color: red; }',
		'a, a /* keep */, b { color: red; }',
		'a, a /* keep */ { color: red; }',
		outdent`
			a,
			b,
			a { color: red; }
		`,
		outdent`
			@media (width > 10px) {
				.card { color: red; }
			}
			@media(width>10px) {
				.card { color: blue; }
			}
		`,
		outdent`
			@supports (display: grid) {
				.card { color: red; }
			}
			@supports(display:grid) {
				.card { color: blue; }
			}
		`,
		outdent`
			@container card (width > 10px) {
				.card { color: red; }
			}
			@container card (width>10px) {
				.card { color: blue; }
			}
		`,
		outdent`
			@scope (.component) {
				.card { color: red; }
			}
			@scope(.component) {
				.card { color: blue; }
			}
		`,
		outdent`
			@layer components {
				.card { color: red; }
			}
			@layer components {
				.card { color: blue; }
			}
		`,
		outdent`
			@layer {
				.card { color: red; }
				.card { color: blue; }
			}
		`,
		outdent`
			.component {
				.title { color: red; }
			}
			.component {
				.title { color: blue; }
			}
		`,
		outdent`
			@media (width > 10px) {
				.component {
					.title { color: red; }
				}
			}
			@media(width>10px) {
				.component {
					.title { color: blue; }
				}
			}
		`,
	].map(code => asCss(code)),
});

test({
	testerOptions: languages.css,
	valid: [],
	invalid: [
		{
			code: 'a, b, a, b { color: red; }',
			output: 'a, b { color: red; }',
			errors: 2,
		},
		{
			code: 'a /* keep */, b, a { color: red; }',
			output: 'a /* keep */, b { color: red; }',
			errors: 1,
		},
	],
});
