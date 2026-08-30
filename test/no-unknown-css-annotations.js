import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const annotation = "!imprtant";',
		...[
			'a { color: red; }',
			'a { color: red !important; }',
			'a { color: red !IMPORTANT; }',
			'a { color: red !ImPoRtAnT; }',
			String.raw`a { color: red !\69mportant; }`,
			String.raw`a { color: red !\49 MPORTANT; }`,
			'a { color: red ! important; }',
			'a { color: red !/**/important; }',
			'a { color: red ! /* comment */ important; }',
			'a { content: "!imprtant"; }',
			'a { background-image: url(!imprtant); }',
			'a { color: fn("!imprtant"); }',
			'a { /* !imprtant */ color: red; }',
			'a { --priority: red !imprtant; }',
			'a { --priority: red ! /* comment */ IMPRTANT; }',
			String.raw`a { -\2d priority: red !imprtant; }`,
			String.raw`a { \2d\2d priority: red !imprtant; }`,
		].map(code => ({code, language: languages.css})),
	],
	invalid: [
		'a { color: red !imprtant; }',
		'a { color: red !other; }',
		'a { color: red !IMPRTANT; }',
		String.raw`a { color: red !\69mprtant; }`,
		'a { color: red ! imprtant; }',
		'a { color: red !/**/imprtant; }',
		'a { color: red ! /* comment */ imprtant; }',
		'a { color: red ! /* !imprtant */ imprtant /* imprtant ! */; }',
		'a { imprtant: imprtant !imprtant; }',
		'a { color: red !imprtant }',
		outdent`
			a {
				color: red
					! /* comment */
					imprtant;
			}
		`,
		'@font-face { font-family: Example !imprtant; }',
		'@media (width > 0px) { a { color: red !imprtant; } }',
		'a { &:hover { color: red !imprtant; } }',
		'@keyframes fade { to { opacity: 1 !imprtant; } }',
	].map(code => ({code, language: languages.css})),
});
