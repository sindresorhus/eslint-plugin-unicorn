import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const asCSS = code => ({code, language: languages.css});

test.snapshot({
	valid: [
		'a { font-family: Arial, Helvetica, sans-serif; }',
		'a { FONT-FAMILY: Arial, serif; }',
		'a { font-family: "sans-serif", sans-serif; }',
		String.raw`a { font-family: "serif", s\65 rif; }`,
		'a { font-family: "-apple-system", var(--fonts), -apple-system; }',
		'a { font-family: Times New Roman, "  times   new roman  ", serif; }',
		'a { font-family: Times New Roman, "Times  New Roman", serif; }',
		String.raw`a { font-family: Times\20 \20 New, "Times New", serif; }`,
		'a { font-family: Straße, STRASSE; }',
		'a { font-family: generic(fangsong), generic(kai), serif; }',
		'a { font-family: var(--fonts), Arial, sans-serif; }',
		'a { font-family: inherit; }',
		'a { font: italic 16px Arial, sans-serif; }',
		'a { font: 16px "serif", serif; }',
		'a { font: caption; }',
		'a { font: revert-layer; }',
		'a { font: var(--size) Arial, Arial; }',
		'a { --font-family: Arial, Arial; }',
		'@font-face { font-family: Arial, Arial; }',
		'@media (width > 1px) { @font-face { font-family: Arial, Arial; } }',
		'@font-palette-values --palette { font-family: Arial, Arial; }',
		'.foo { @supports (font-family: Arial, Arial) { color: red; } }',
		'.foo { @container style(font-family: Arial, Arial) { color: red; } }',
		'a { font-family: inherit, inherit; }',
		'a { font-family: default, default; }',
		'a { font-family: caption, caption; }',
		'a { font-family: revert-rule, revert-rule; }',
		String.raw`a { font-family: "Arial inherit", Arial \69 nherit; }`,
		'a { font-family: "Arial serif", Arial serif; }',
		String.raw`a { font-family: "Arial serif", Arial s\65 rif; }`,
	].map(code => asCSS(code)),
	invalid: [
		'a { font-family: Arial, Arial, sans-serif; }',
		'a { font-family: Arial, Helvetica, Arial, sans-serif; }',
		'a { font-family: "Arial", arial, sans-serif; }',
		'a { font-family: \'Arial\', arial, sans-serif; }',
		String.raw`a { f\6f nt-family: Arial, Arial, sans-serif; }`,
		String.raw`a { f\6f nt: 16px Arial, Arial, sans-serif; }`,
		'.foo { @media (width > 1px) { font-family: Arial, Arial, sans-serif; } }',
		'a { font-family: Times New Roman, "times new roman", serif; }',
		String.raw`a { font-family: Times New Roman, "Times\20 New Roman", serif; }`,
		String.raw`a { font-family: A\72 ial, Arial, sans-serif; }`,
		String.raw`a { font-family: Times\20 New\20 Roman, "Times New Roman", serif; }`,
		String.raw`a { font-family: "\41 rial", Arial, sans-serif; }`,
		String.raw`a { font-family: Arial, "A\
rial", sans-serif; }`,
		'a { font-family: SERIF, serif; }',
		String.raw`a { font-family: s\65 rif, serif; }`,
		'a { font-family: "serif", serif, "SERIF"; }',
		'a { font-family: "emoji", emoji, sans-serif; }',
		'a { font-family: "fangsong", fangsong, serif; }',
		'a { font-family: "BlinkMacSystemFont", BlinkMacSystemFont; }',
		'a { font-family: "BlinkMacSystemFont", var(--fonts), BlinkMacSystemFont; }',
		'a { font-family: "-webkit-body", -webkit-body; }',
		'a { font-family: generic(fangsong), GENERIC(FANGSONG), serif; }',
		String.raw`a { font-family: g\65 neric(f\61 ngsong), generic(fangsong); }`,
		'a { font-family: generic(khmer-mul), GENERIC(KHMER-MUL); }',
		String.raw`a { font-family: foo\,bar, "foo,bar", serif; }`,
		'a { font: 16px generic(fangsong), GENERIC(FANGSONG); }',
		'a { font: italic 16px italic, italic; }',
		'a { font: 16px Arial, Arial, sans-serif; }',
		'a { FONT: 16px Arial, serif, ARIAL; }',
		'a { font: 16px Arial, Arial, ARIAL; }',
		String.raw`a { font: 16px A\72 ial, Arial, sans-serif; }`,
		'a { font: 16px Arial, /* duplicate */ Arial, sans-serif; }',
		'a { font: 16px Arial, Arial /* duplicate */ !important; }',
		'a { font: italic small-caps 700 condensed 16px/1.5 Times New Roman, "times new roman", serif; }',
		'a { font-family: Arial, var(--fonts), arial, sans-serif; }',
		'a { font-family: Arial, Arial, ARIAL; }',
		'a { font-family: Arial /* first */, Arial, sans-serif; }',
		'a { font-family: Arial, /* duplicate */ Arial, sans-serif; }',
		'a { font-family: Arial, Arial /* duplicate */, sans-serif; }',
		'a { font-family: Arial, Arial /* duplicate */ !important; }',
		'a { font-family: Times New Roman, Times /* duplicate */ New Roman, serif; }',
		outdent`
			a {
				font-family:
					Arial,
					Arial,
					sans-serif;
			}
		`,
	].map(code => asCSS(code)),
});

test({
	testerOptions: languages.css,
	valid: [],
	invalid: [
		{
			code: 'a { font-family: Arial, Arial, ARIAL; }',
			output: 'a { font-family: Arial, ARIAL; }',
			errors: 2,
		},
		{
			code: 'a { font: 16px Arial, Arial, ARIAL; }',
			output: 'a { font: 16px Arial, ARIAL; }',
			errors: 2,
		},
		{
			code: 'a { font-family: Arial, Arial !important /* keep */; }',
			output: 'a { font-family: Arial !important /* keep */; }',
			errors: 1,
		},
		{
			code: 'a { font: 16px Arial, Arial !important /* keep */; }',
			output: 'a { font: 16px Arial !important /* keep */; }',
			errors: 1,
		},
		{
			code: 'a { font-family: Arial, Arial, /* next */ sans-serif; }',
			output: 'a { font-family: Arial, /* next */ sans-serif; }',
			errors: 1,
		},
		{
			code: String.raw`a { font-family: "foo\A \1b [31m\9b 31m\202e bar", "foo\A \1b [31m\9b 31m\202e bar"; }`,
			output: String.raw`a { font-family: "foo\A \1b [31m\9b 31m\202e bar"; }`,
			errors: [{message: 'Remove duplicate font family name `foo\\n\\u001b[31m\\u{9b}31m\\u{202e}bar`.'}],
		},
	],
});
