import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const css = code => ({code, language: languages.css});

test.snapshot({
	valid: [
		'a { color: red; margin: 1px; background: url("#ABC") no-repeat; }',
		String.raw`a { \63 olor: \72 gb(0 0 0); }`,
		'linearGradient, svg|foreignObject, .Class#ID { color: red; }',
		'[DATA-Foo="Value" I], :lang(en-US), :nth-child(2n of .Item) { color: red; }',
		':--Heading { color: red; }',
		':--Heading(:HOVER) { color: red; }',
		'@--Theme {}',
		'@--Theme CALC(1PX) #ABC {}',
		'@--Theme { Value: CALC(1PX) #ABC; }',
		'@--Theme { .Foo:HOVER { COLOR: RED; } }',
		'@media (--Wide) {}',
		'@supports at-rule(@--Theme) {}',
		'a { --ThemeColor: CALC(1PX) #ABC; color: --ThemeFunction(RED 1PX #ABC); }',
		'a { animation-name: FadeIn; font-family: Times New Roman; grid-area: MainContent; counter-reset: Section; }',
		'a { --Direction: ALTERNATE; animation: var(--Direction) NORMAL; }',
		'a { animation: env(--Direction) NORMAL; animation: attr(data-direction) NORMAL; animation: --direction() NORMAL; }',
		'a { font: var(--Size) CAPTION; }',
		'a { content: var(--Fallback) counter(NORMAL); }',
		'a { background: var(--Image), CENTER / COVER NO-REPEAT; background: --image(), CENTER / COVER NO-REPEAT; }',
		'a { content: counter(var(--Name), NORMAL); font-variant-alternates: styleset(var(--Name), NORMAL); }',
		'a { content: "UPPERCASE"; background-image: url("IMAGE.PNG#ABC"); }',
		'a { color: attr(RED); color: env(RED); display: env(BLOCK); }',
		String.raw`a { background-image: element(#\41 BC); background-image: var(--Fallback), element(#DEF); background-image: -moz-element(#ABC); }`,
		'a { color: red !IMPORTANT; } @charset "UTF-8";',
		'@property --ThemeColor { syntax: "<COLOR> | MyToken"; inherits: false; initial-value: CanvasText; }',
		'@property --ThemeColor { syntax: "<color>"; inherits: false; initial-value: #ABCDEF; }',
		'@font-face { font-weight: BOLDER; color: RED; }',
		outdent`
			@font-feature-values Font {
				@annotation { Note: 1; }
				@character-variant { Variant: 1 2; }
				@ornaments { Flourish: 1; }
				@styleset { NiceStyle: 1; }
				@stylistic { Alternate: 1; }
				@swash { FancySwash: 1; }
			}

			a { font-variant-alternates: annotation(Note) character-variant(Variant) ornaments(Flourish) styleset(NiceStyle) stylistic(Alternate) swash(FancySwash); }
		`,
		String.raw`a { color: #AB; outline-color: #ABCDE; color: #\61 bc; --Color: #ABCDEF; }`,
		'.İtem { color: İNITIAL; --Éxample: VALUE; }',
	].map(code => css(code)),
	invalid: [
		outdent`
			@MEDIA (MIN-WIDTH: 10PX) and (10EM < HEIGHT < 20REM) {
				.thing:HOVER::BEFORE {
					COLOR: RGB(0 0 0 / 50%);
					border: 1PX SOLID #AbCd;
					background: URL("#ABC") NO-REPEAT;
				}
			}
		`,
		'@media (/* before */ WIDTH > 1PX), (1EM < HEIGHT /* after */) {}',
		'@FONT-FACE { FONT-STYLE: OBLIQUE; src: LOCAL("Example"), URL(font.WOFF2) FORMAT("WOFF2"); }',
		'@font-feature-values Font { FONT-DISPLAY: SWAP; }',
		'@property --ThemeColor { SYNTAX: "<COLOR>"; INHERITS: FALSE; INITIAL-VALUE: #ABCDEF; }',
		String.raw`@\70 roperty --ThemeColor { inherits: FALSE; syntax: "<color>"; initial-value: red; }`,
		'@supports (COLOR: RED) {}',
		'a { @media (width > 1px) { color: RED; display: BLOCK; } }',
		'a { border: 1PX SOLID var(--Color); background: var(--Image) NO-REPEAT FIXED; animation: FadeIn 1S LINEAR; }',
		'a { transition-timing-function: var(--Fallback) STEPS(2, JUMP-START); transition-timing-function: STEPS(2, JUMP-START); transform: ROTATE(45DEG); }',
		'a { color: ATTR(RED); color: ENV(RED); }',
		String.raw`a { \43 OLOR: RED; color: \52 GB(0 0 0); }`,
		String.raw`a { color: R\45 D; border: var(--x) S\4f LID; border: S\4f LID; transition-timing-function: ST\45 PS(2, J\55 MP-START); }`,
		String.raw`a { background: \55 RL(#ABC); }`,
		'a { /* before */ COLOR /* after */: /* value */ RED /* end */; }',
		'a { font: CAPTION; }',
		'a { color: CanvasText; border-color: ActiveText; background-color: ReBeccAPurple; }',
		'a { color: #ABC; color: #1ABC; color: #12AB34; color: #1234ABCD; }',
		String.raw`a { color: #\41 BC; }`,
		'@-WEBKIT-KEYFRAMES Fade { from { -WEBKIT-TRANSFORM: ROTATE(1DEG); } }',
	].map(code => css(code)),
});

test({
	testerOptions: {
		language: languages.css.language,
		plugins: languages.css.plugins,
	},
	valid: [],
	invalid: [
		{
			code: '@media (\u00A0WIDTH: 1PX) {}',
			output: '@media (\u00A0width: 1px) {}',
			errors: 2,
		},
		{
			code: String.raw`@media (\57 IDTH: 1P\58) { a:\48 OVER::\42 EFORE { color: CURRENTCOLOR; } }`,
			output: '@media (width: 1px) { a:hover::before { color: currentcolor; } }',
			errors: 5,
		},
		{
			code: 'a { background-image: PAINT(MyPainter, #ABC, 1PX, CALC(1PX)); }',
			output: 'a { background-image: paint(MyPainter, #ABC, 1PX, CALC(1PX)); }',
			errors: 1,
		},
		{
			code: 'a { background: PAINT(MyPainter) NO-REPEAT; }',
			output: 'a { background: paint(MyPainter) no-repeat; }',
			errors: 2,
		},
		{
			code: 'a { animation: 1S EASE-IN EASE-OUT; }',
			output: 'a { animation: 1s ease-in EASE-OUT; }',
			errors: 2,
		},
		{
			code: '@property --Theme { SYNTAX: "*"; INHERITS: FALSE; INITIAL-VALUE: FOO(1PX) #ABC; }',
			output: '@property --Theme { syntax: "*"; inherits: false; initial-value: FOO(1PX) #ABC; }',
			errors: 4,
		},
		{
			code: 'a { font: var(--Style) BOLD 1PX Arial; background: var(--Color) CENTER / COVER NO-REPEAT; }',
			output: 'a { font: var(--Style) BOLD 1px Arial; background: var(--Color) CENTER / COVER NO-REPEAT; }',
			errors: 1,
		},
		{
			code: outdent`
				@supports SELECTOR(a:HOVER) {}
				@supports FONT-TECH(variations) {}
				@supports FONT-FORMAT(woff2) {}
				@supports AT-RULE(@MEDIA) {}
				@supports NAMED-FEATURE(foo) {}
				@supports ENV(foo) {}
				@container STYLE(COLOR: RED) {}
			`,
			output: outdent`
				@supports selector(a:hover) {}
				@supports font-tech(variations) {}
				@supports font-format(woff2) {}
				@supports at-rule(@media) {}
				@supports named-feature(foo) {}
				@supports env(foo) {}
				@container style(color: red) {}
			`,
			errors: 11,
		},
	],
});
