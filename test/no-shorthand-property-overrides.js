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
		'a { grid-row-gap: 1px; grid: 1fr / 1fr; }',
		'a { grid-column-gap: 1px; grid: 1fr / 1fr; }',
		'a { row-gap: 1px; column-gap: 2px; grid: 1fr / 1fr; }',
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

// An `!important` declaration beats any normal one, whatever the source order is
test.snapshot({
	valid: [
		'a { padding-left: 10px !important; padding: 20px; }',
		'a { padding-left: 10px !important; padding: 20px; padding-top: 30px; }',
		'a { padding: 20px; padding-left: 10px !important; }',
		'a { padding: 20px; padding-left: 10px !important; padding-top: 30px; }',
		'a { padding-inline-start: 10px !important; padding: 20px; }',
		// A later normal longhand does not beat the earlier `!important` one
		'a { padding-left: 10px !important; padding-left: 5px; padding: 20px; }',
		'a { padding: 1px !important; padding-left: 2px; padding: 3px; }',
		'a { padding: 1px !important; padding-left: 2px; padding-left: 3px; padding: 4px; }',
		'a { border: 1px solid !important; border-image-source: url(border.png); border: 2px solid; }',
		'a { -webkit-transition: opacity 1s !important; -webkit-transition-property: color; -webkit-transition: color 2s; }',
	].map(code => ({code, language: languages.css})),
	invalid: [
		'a { padding-left: 10px !important; padding: 20px !important; }',
		'a { padding-left: 10px; padding: 20px !important; padding: 30px; }',
		'a { padding: 10px !important; padding-left: 20px; padding: 30px !important; }',
	].map(code => ({code, language: languages.css})),
});

test({
	testerOptions: languages.css,
	valid: [
		'a { mask: none !important; mask-border-source: url(border.png); mask-border: none; }',
	],
	invalid: [
		{
			code: 'a { padding-left: 1px !important; padding-top: 2px; padding: 3px; }',
			errors: [{
				messageId: 'no-shorthand-property-overrides',
				data: {longhand: 'padding-top', shorthand: 'padding'},
			}],
		},
		{
			code: 'a { animation-range-start: 10% !important; animation-range-end: 90%; animation: fade 1s; }',
			errors: [{
				messageId: 'no-shorthand-property-overrides',
				data: {longhand: 'animation-range-end', shorthand: 'animation'},
			}],
		},
		{
			code: 'a { -webkit-transition: opacity 1s !important; transition-property: color; transition: color 2s; }',
			errors: [{
				messageId: 'no-shorthand-property-overrides',
				data: {longhand: 'transition-property', shorthand: 'transition'},
			}],
		},
	],
});

const modernDeclarations = [
	['animation-timeline: --timeline', 'animation: 1s ease fade'],
	['animation-range-start: 10%', 'animation: 1s ease fade'],
	['animation-range-end: 90%', 'animation: 1s ease fade'],
	['animation-range: 10% 90%', 'animation: 1s ease fade'],
	['animation-range-start: 10%', 'animation-range: 20% 80%'],
	['animation-range-end: 90%', 'animation-range: 20% 80%'],
	['transition-behavior: allow-discrete', 'transition: opacity 1s linear'],
	['font-synthesis-position: auto', 'font-synthesis: none'],
	['column-height: 100px', 'columns: 20rem 2'],
	['border-block-start-width: 1px', 'border-block-width: 2px'],
	['border-block-end-style: dashed', 'border-block-style: solid'],
	['border-block-start-color: red', 'border-block-color: blue'],
	['border-inline-end-width: 1px', 'border-inline-width: 2px'],
	['border-inline-start-style: dashed', 'border-inline-style: solid'],
	['border-inline-end-color: red', 'border-inline-color: blue'],
	['border-block-end-width: 1px', 'border-block: 2px solid'],
	['border-inline-start-color: red', 'border-inline: 2px solid blue'],
	['mask-border-source: url(border.png)', 'mask: none'],
	['mask-border: url(border.png)', 'mask: none'],
	['mask-border-source: url(border.png)', 'mask-border: none'],
	['mask-border-slice: 10', 'mask-border: none'],
	['mask-border-width: 2px', 'mask-border: none'],
	['mask-border-outset: 2px', 'mask-border: none'],
	['mask-border-repeat: round', 'mask-border: none'],
	['mask-border-mode: luminance', 'mask-border: none'],
];

for (const [longhand, shorthand] of modernDeclarations) {
	test({
		testerOptions: languages.css,
		valid: [
			`a { ${shorthand}; ${longhand}; }`,
			`a { ${longhand} !important; ${shorthand}; }`,
			`a { ${shorthand} !important; ${longhand}; ${shorthand}; }`,
		],
		invalid: [
			`a { ${longhand}; ${shorthand}; }`,
			`a { ${longhand}; ${shorthand} !important; }`,
			`a { ${longhand} !important; ${shorthand} !important; }`,
		].map(code => ({
			code,
			errors: [{
				messageId: 'no-shorthand-property-overrides',
				data: {
					longhand: longhand.split(':', 1)[0],
					shorthand: shorthand.split(':', 1)[0],
				},
			}],
		})),
	});
}

test.snapshot({
	valid: [
		'a { -webkit-transition-behavior: allow-discrete; transition: opacity 1s; }',
		'a { transition-behavior: allow-discrete; -webkit-transition: opacity 1s; }',
		'a { animation-range-start: 10%; } b { animation: fade 1s; }',
	].map(code => ({code, language: languages.css})),
	invalid: [
		'a { padding: 1px !important; & b { padding-left: 2px; padding: 3px; } }',
		'a { padding-left: 1px; & b { padding: 2px !important; } padding: 3px; }',
		'a { TRANSITION-BEHAVIOR: allow-discrete; TRANSITION: opacity 1s; }',
		'a { -webkit-transition-behavior: allow-discrete; -webkit-transition: opacity 1s; }',
		'a { animation-range-start: 10%; /* Keep this comment. */ animation: fade 1s; }',
		'a { & b { mask-border-source: url(border.png); mask: none; } }',
	].map(code => ({code, language: languages.css})),
});

const jsxLanguageOptions = {parserOptions: {ecmaFeatures: {jsx: true}}};

test({
	testerOptions: {languageOptions: jsxLanguageOptions},
	valid: [
		'<div style={{padding: 20, paddingLeft: 10}} />;',
		'<><div style={{paddingLeft: 10}} /><div style={{padding: 20}} /></>;',
		'const object = {paddingLeft: 10, padding: 20};',
		'<Component style={{paddingLeft: 10, padding: 20}} />;',
		'<ui.div style={{paddingLeft: 10, padding: 20}} />;',
		'<div css={{paddingLeft: 10, padding: 20}} />;',
		'<div style={styles} />;',
		'<div style={{color: "red", padding: 20}} />;',
		'<div style={{WebkitTransitionProperty: "opacity", transition: "opacity 1s"}} />;',
		'<div style={{padding: 10, paddingLeft: 20, padding: 30}} />;',
		'<div style={{paddingLeft: 10, ...styles, padding: 20}} />;',
		'<div style={{paddingLeft: 10, [property]: 20, padding: 30}} />;',
		'<div style={{get paddingLeft() { return 10; }, padding: 20}} />;',
		'<div style={{paddingLeft() { return 10; }, padding: 20}} />;',
		...['null', 'undefined', 'false', 'true', '""', '"   "', '"10px !important"', '"10px ! IMPORTANT"', 'value', 'NaN', 'Infinity', '-Infinity', '+"10"'].flatMap(value => [
			`<div style={{paddingLeft: ${value}, padding: 20}} />;`,
			`<div style={{paddingLeft: 10, padding: ${value}}} />;`,
		]),
		'<div style={{paddingLeft: 10, paddingLeft: null, padding: 20}} />;',
	],
	invalid: [
		...[
			['<div style={{paddingLeft: 10, padding: 20}} />;', 'paddingLeft', 'padding'],
			['<div style={{"padding-left": "10px", padding: "20px"}} />;', 'padding-left', 'padding'],
			['<div style={{WebkitTransitionProperty: "opacity", WebkitTransition: "opacity 1s"}} />;', 'WebkitTransitionProperty', 'WebkitTransition'],
			['<div style={{msTransitionProperty: "opacity", msTransition: "opacity 1s"}} />;', 'msTransitionProperty', 'msTransition'],
			['<div style={{"-webkit-transition-property": "opacity", "-webkit-transition": "opacity 1s"}} />;', '-webkit-transition-property', '-webkit-transition'],
			['<div style={{borderImageSource: "url(border.png)", border: "1px solid"}} />;', 'borderImageSource', 'border'],
			['<div style={{paddingLeft: 10, paddingLeft: 30, padding: 20}} />;', 'paddingLeft', 'padding'],
			['<div style={{paddingLeft: null, padding: 20, paddingLeft: 10}} />;', 'paddingLeft', 'padding'],
			['<div style={{paddingLeft: 0, padding: 20}} />;', 'paddingLeft', 'padding'],
			['<div style={{marginLeft: -1, margin: "2px"}} />;', 'marginLeft', 'margin'],
			['<div style={{marginLeft: +1, margin: "2px"}} />;', 'marginLeft', 'margin'],
			['<div style={{paddingLeft: `10px`, padding: `20px`}} />;', 'paddingLeft', 'padding'],
		].map(([code, longhand, shorthand]) => ({
			code,
			errors: [{messageId: 'no-shorthand-property-overrides', data: {longhand, shorthand}}],
		})),
		{
			code: '<div style={{paddingTop: 10, paddingLeft: 20, padding: 30}} />;',
			errors: ['paddingTop', 'paddingLeft'].map(longhand => ({
				messageId: 'no-shorthand-property-overrides',
				data: {longhand, shorthand: 'padding'},
			})),
		},
	],
});

test.typescript({
	testerOptions: {languageOptions: jsxLanguageOptions},
	valid: [
		'<div style={({padding: 20, paddingLeft: 10} as Style)!} />;',
		'<div style={{padding: 20, paddingLeft: 10} satisfies Style} />;',
	].map(code => ({code, filename: 'file.tsx'})),
	invalid: [
		'<div style={({paddingLeft: 10, padding: 20} as Style)!} />;',
		'<div style={{paddingLeft: 10, padding: 20} satisfies Style} />;',
		'<div style={{paddingLeft: 10 as number, padding: 20 satisfies number}} />;',
		'<div style={{paddingLeft: -(10 as number), padding: 20}} />;',
	].map(code => ({
		code,
		filename: 'file.tsx',
		errors: [{messageId: 'no-shorthand-property-overrides', data: {longhand: 'paddingLeft', shorthand: 'padding'}}],
	})),
});
