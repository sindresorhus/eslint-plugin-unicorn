import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	testerOptions: languages.css,
	valid: [
		'a { color: #fff; background: #abcd; }',
		'a { color: #a4a4a4; background: #aabbccdf; }',
		'#ffffff { color: red; }',
		'a { content: "#ffffff"; background: url(#ffffff); background-image: url("#aabbccdd"); /* #ffffff */ }',
		'a { background-image: element(#ffffff); background-image: -moz-element(#aabbccdd); }',
		String.raw`a { background: u\72l(#ffffff); --image: u\72l(#aabbccdd); --upper-image: U\52L(#ffffff); color: custom(u\72l(#ffffff)); }`,
		String.raw`a { color: #\66fffff; color: #fffff; }`,
	],
	invalid: [
		{
			code: 'a { color: #ffffff; }',
			output: 'a { color: #fff; }',
			errors: 1,
		},
		{
			code: 'a { color: #aabbccdd; }',
			output: 'a { color: #abcd; }',
			errors: 1,
		},
		{
			code: 'a { color: #112233; background: #11223344; }',
			output: 'a { color: #123; background: #1234; }',
			errors: 2,
		},
		{
			code: String.raw`a { color: #\46 FFFFF; background: #\61 abbccdd; }`,
			output: 'a { color: #FFF; background: #abcd; }',
			errors: 2,
		},
		{
			code: 'a {\n\tcolor: var(--color,\n\t\t#ffffff);\n}',
			output: 'a {\n\tcolor: var(--color,\n\t\t#fff);\n}',
			errors: [{
				messageId: 'prefer-short-hex-color', line: 3, column: 3, endLine: 3, endColumn: 10,
			}],
		},
		{
			code: 'a { color: #aABbcC; background: #AaBbCcDd; }',
			output: 'a { color: #aBc; background: #ABCD; }',
			errors: 2,
		},
		{
			code: 'a { --theme: #ffffff; unknown: #aabbccdd; }',
			output: 'a { --theme: #fff; unknown: #abcd; }',
			errors: 2,
		},
		{
			code: String.raw`a { --image: custom(u\72l(#ffffff)) #aabbcc; }`,
			output: String.raw`a { --image: custom(u\72l(#ffffff)) #abc; }`,
			errors: 1,
		},
		{
			code: 'a { --image: element(#ffffff) -moz-element(#aabbccdd) #112233; }',
			output: 'a { --image: element(#ffffff) -moz-element(#aabbccdd) #123; }',
			errors: 1,
		},
		{
			code: '@supports (color: #ffffff) { a { color: custom(#aabbccdd); } }',
			output: '@supports (color: #fff) { a { color: custom(#abcd); } }',
			errors: 2,
		},
		{
			code: 'a { color: #ffffff /* keep */ #aabbccdd; }',
			output: 'a { color: #fff /* keep */ #abcd; }',
			errors: 2,
		},
	],
});
