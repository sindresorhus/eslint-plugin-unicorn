import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'@property --brand { syntax: "<color>"; inherits: false; initial-value: red; }',
		'@property --brand { initial-value: red; inherits: true; syntax: "<color>"; }',
		'@property --brand { syntax: "*"; inherits: false; }',
		'@property --brand { syntax: \'*\'; inherits: true; initial-value: red; }',
		'@property --brand { syntax: " \t* \t"; inherits: false; }',
		String.raw`@property --brand { syntax: "\9\a\c\d *\20"; inherits: false; }`,
		String.raw`@property --brand { syntax: "\2a"; inherits: false; }`,
		String.raw`@pr\6f perty --brand { s\79 ntax: "*"; inh\65 rits: false; }`,
		'@PROPERTY --brand { SYNTAX: "*"; INHERITS: false; }',
		String.raw`@PROPERTY --brand { SYNTAX: "<color>"; INHERITS: false; INITIAL-\56 ALUE: red; }`,
		'@property --brand { syntax: /* keep */ "*" /* keep */; inherits: false; }',
		'@property --brand { syntax: "<color>"; syntax: "*"; inherits: false; }',
		String.raw`@property --brand { SYNTAX: "<color>"; s\79 ntax: "*"; inherits: false; }`,
		'@property --brand { syntax: "<color>" !important; inherits: false !important; initial-value: red !important; }',
		'@property --brand { syntax: "<color>"; inherits: false; initial-value:; }',
		'@property --brand { syntax:; inherits:; }',
		'@property --brand { syntax: invalid; inherits: false; }',
		'@property --brand { syntax: "*" "<color>"; inherits: false; }',
		'@property --brand { syntax: var(--syntax); inherits: false; }',
		'@supports (display: grid) { @property --brand { syntax: "*"; inherits: false; } }',
		'@property --first { syntax: "*"; inherits: false; } @property --second { syntax: "<color>"; inherits: true; initial-value: blue; }',
		'@property --brand;',
		'@font-face { font-family: brand; src: url(brand.woff2); }',
		'a { syntax: "<color>"; inherits: false; }',
		'@custom { syntax: "<color>"; inherits: false; }',
	].map(code => ({code, language: languages.css})),
	invalid: [
		'@property --brand {}',
		'@property --brand { syntax: "<color>"; inherits: false; }',
		'@property --brand { syntax: "<color>"; initial-value: red; }',
		'@property --brand { inherits: false; initial-value: red; }',
		'@property --brand { syntax: "<color>"; }',
		'@property --brand { inherits: false; }',
		'@property --brand { initial-value: red; }',
		'@property --brand { syntax: "*"; }',
		'@property --brand { syntax: "<length> | <color>"; inherits: false; }',
		'@property --brand { syntax: "brand"; inherits: false; }',
		'@property --brand { syntax: \'<number>\'; inherits: false; }',
		'@PROPERTY --brand { SYNTAX: "<color>"; INHERITS: false; }',
		String.raw`@pr\6f perty --brand { s\79 ntax: "<color>"; inh\65 rits: false; }`,
		'@property --brand { syntax: "*"; syntax: "<color>"; inherits: false; }',
		String.raw`@property --brand { s\79 ntax: "*"; SYNTAX: "<color>"; inherits: false; }`,
		'@property --brand { syntax: "<color>" !important; inherits: false; }',
		'@property --brand { syntax: "<color>"; inherits: false; unknown: red; }',
		'@property --brand { syntax: "<color>"; inherits: false; --initial-value: red; }',
		'@property --brand { syntax: "\u00A0*\u00A0"; inherits: false; }',
		'@property --brand { syntax: ""; inherits: false; }',
		'@property --brand { syntax: "<color>"; inherits:; }',
		'@supports (display: grid) { @property --brand { syntax: "<color>"; inherits: false; } }',
		'@property --first {} @property --second { syntax: "<color>"; inherits: false; }',
		outdent`
			@property --brand {
				/* keep */
				syntax: "<color>";
				inherits: false;
			}
		`,
		'@property --first { syntax: "<color>"; inherits: false; initial-value: red; } @property --second {}',
		'@property --brand { @custom { syntax: "<color>"; inherits: false; initial-value: red; } }',
	].map(code => ({code, language: languages.css})),
});

test({
	valid: [
		{
			code: '@property --brand { syntax: ???; inherits: false; }',
			language: languages.css.language,
			plugins: languages.css.plugins,
			languageOptions: {tolerant: true},
		},
	],
	invalid: [
		{
			code: '\n\t@property --brand {}',
			language: languages.css.language,
			plugins: languages.css.plugins,
			errors: ['syntax', 'inherits'].map(descriptor => ({
				messageId: 'require-property-descriptors',
				data: {descriptor},
				line: 2,
				column: 2,
				endLine: 2,
				endColumn: 11,
				suggestions: 0,
			})),
		},
		{
			code: String.raw`@pr\6f perty --brand { syntax: "<color>"; inherits: false; }`,
			language: languages.css.language,
			plugins: languages.css.plugins,
			errors: [{
				messageId: 'require-property-descriptors',
				data: {descriptor: 'initial-value'},
				line: 1,
				column: 1,
				endLine: 1,
				endColumn: 13,
				suggestions: 0,
			}],
		},
	],
});
