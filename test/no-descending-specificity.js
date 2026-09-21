import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const asCss = code => ({code, language: languages.css});
const tooManyTerminalKeys = `body { .x { ${Array.from({length: 65}, (_, index) => `&.item-${index}`).join(', ')} { &.leaf { color: red; } } } } .x.item-0.leaf { color: blue; }`;
const overlongClassName = 'x'.repeat(1030);
const tooLongTerminalKey = `body .${overlongClassName} { color: red; } .${overlongClassName} { color: blue; }`;
const tooManyTerminalKeyAssociations = `body { .x, .y { ${Array.from({length: 200}, () => '&.item').join(', ')} { color: red; } } } .x.item { color: blue; }`;

test.snapshot({
	valid: [
		'a { color: red; } b a { color: blue; }',
		'a { color: red; } a { color: blue; }',
		'b a.foo { color: red; } a { color: blue; }',
		'b a::before c { color: red; } a c { color: blue; }',
		'b a::before.foo { color: red; } a::before.foo { color: blue; }',
		'b a::before:not(.x) { color: red; } a::before { color: blue; }',
		'b a::before:has(#x) { color: red; } a::before { color: blue; }',
		'b a* { color: red; } a* { color: blue; }',
		'b a.foo::before::marker { color: red; } a.foo::before::marker { color: blue; }',
		'> b a { color: red; } a { color: blue; }',
		'b a { color: red; } a { background: blue; }',
		'a:hover { color: red; } a::before { color: blue; }',
		'a::before { color: red; } a { color: blue; }',
		'a:hover { color: red; } a:focus { color: blue; }',
		'#x a:hover { color: red; } a:not(:hover) { color: blue; }',
		'#x a:nth-child(odd) { color: red; } a:nth-child(even) { color: blue; }',
		'#x a:link { color: red; } a:visited { color: blue; }',
		'div.foo > a { color: red; } span > a { color: blue; }',
		'#header.foo > a { color: red; } #footer > a { color: blue; }',
		'a:matches(#dialog) { color: red; } .footer a { color: blue; }',
		'@scope (.page) { > b a { color: red; } > a { color: blue; } }',
		'#dialog, .dialog { & a { color: red; } } .footer a { color: blue; }',
		'#x a:hover { color: red; } b { a { color: blue; } }',
		'b a { color: red; } a { color: blue !important; }',
		'b a { color: red; } a { color: blue; color: green !important; }',
		'b a { color: red !important; } a { background: blue; }',
		'b a { --Theme: red; } a { --theme: blue; }',
		String.raw`@namespace foo "urn:foo"; b foo\|bar { color: red; } foo|bar { color: blue; }`,
		String.raw`b \2a { color: red; } * { color: blue; }`,
		'@scope (.root) { b :scope.foo { color: red; } .foo { color: blue; } }',
		'@scope (.root) { b :where(&).foo { color: red; } .foo { color: blue; } }',
		'#dialog a { color: red; :where(&) { color: blue; } }',
		'b { a:hover:where(&) { color: red; } } a { color: blue; }',
		'b { a:where(&) > c { color: red; } } c { color: blue; }',
		'b :scope.foo { color: red; } .foo { color: blue; }',
		'b :root.foo { color: red; } .foo { color: blue; }',
		'b :host.foo { color: red; } .foo { color: blue; }',
		'b :host-context(.foo).bar { color: red; } .bar { color: blue; }',
		':host(#dialog) a { color: red; } a { color: blue; }',
		'b :host a { color: red; } :host a { color: blue; }',
		'b foo|a { color: red; } foo|a { color: blue; }',
		'b a[foo|bar] { color: red; } a[foo|bar] { color: blue; }',
		'@namespace foo "urn:foo"; b foo|a { color: red; } foo|a { color: blue; }',
		'b :root.foo { c { color: red; } } c { color: blue; }',
		'#dialog a { color: red; } b & { a { color: blue; } }',
		'#dialog b { color: red; } a & b { color: blue; }',
		'#dialog a { color: red; } #other::before, .foo { a { color: blue; } }',
		'b foo|a { c { color: red; } } c { color: blue; }',
		'#dialog a { color: blue; :where(&) a { color: red; } }',
		'#dialog a, a { color: red; b :where(&) a { color: blue; } color: green; }',
		'b a { É: red; } a { é: blue; }',
		'b a { margin: 1px; } a { margin-top: 2px; }',
		'b a { word-wrap: break-word; } a { overflow-wrap: normal; }',
		'b a { all: unset; } a { color: blue; }',
		'b a, a { color: red; }',
		'b a, a { color: red; color: blue; }',
		'b a {} a { color: red; }',
		':hover { color: red; } :focus { color: blue; }',
		outdent`
			b a { color: red; }
			@media print {
				a { color: blue; }
			}
		`,
		outdent`
			@media print {
				b a { color: red; }
			}
			@media screen {
				a { color: blue; }
			}
		`,
		outdent`
			@supports (display: grid) {
				b a { color: red; }
			}
			@supports (display: flex) {
				a { color: blue; }
			}
		`,
		outdent`
			@media print {
				@supports (display: grid) {
					b a { color: red; }
				}
			}
			@supports (display: grid) {
				@media print {
					a { color: blue; }
				}
			}
		`,
		outdent`
			@container narrow (width < 20rem) {
				b a { color: red; }
			}
			@container wide (width > 40rem) {
				a { color: blue; }
			}
		`,
		outdent`
			@layer base {
				b a { color: red; }
			}
			@layer theme {
				a { color: blue; }
			}
		`,
		outdent`
			@layer {
				b a { color: red; }
			}
			@layer {
				a { color: blue; }
			}
		`,
		outdent`
			@scope (.first) {
				b a { color: red; }
			}
			@scope (.second) {
				a { color: blue; }
			}
		`,
		outdent`
			@unknown first {
				b a { color: red; }
			}
			@unknown second {
				a { color: blue; }
			}
		`,
		'@keyframes fade { from { color: red; } from:hover { color: blue; } }',
		'a:where(#dialog) { color: red; } a { color: blue; }',
		'a:unknown { color: red; } a { color: blue; }',
		'a:unknown, b a { color: red; } a { color: blue; }',
		'b a { color: red; } a:unknown, a { color: blue; }',
		'b a::unknown { color: red; } a::unknown { color: blue; }',
		'a:is(:unknown, *) { color: red; } a { color: blue; }',
		'a:matches(*) { color: red; } a { color: blue; }',
		'a:is(> #dialog, *) { color: red; } a { color: blue; }',
		'a:is(#dialog >, *) { color: red; } a { color: blue; }',
		'a:not(> #dialog, *) { color: red; } a { color: blue; }',
		'a:has(:has(#dialog)) { color: red; } a { color: blue; }',
		':host(#dialog a) a { color: red; } a { color: blue; }',
		'b a:is() { color: red; } a { color: blue; }',
		'b a:where() { color: red; } a { color: blue; }',
		'b a:not() { color: red; } a { color: blue; }',
		'b a:is { color: red; } a { color: blue; }',
		'b a:hover() { color: red; } a { color: blue; }',
		'b a:hover(value) { color: red; } a { color: blue; }',
		'b a::slotted() { color: red; } a::slotted() { color: blue; }',
		'b a:nth-child { color: red; } a { color: blue; }',
		'b a::slotted { color: red; } a::slotted { color: blue; }',
		'b a:lang { color: red; } a { color: blue; }',
		'b a:nth-of-type { color: red; } a { color: blue; }',
		'b a::part { color: red; } a::part { color: blue; }',
		'a:unknown(#dialog) { color: red; } a { color: blue; }',
		'b a, a:unknown(#dialog) { color: red; } a { color: blue; }',
		'a::before { .container b { color: red; } } b { color: blue; }',
		'b a:is(::before) { color: red; } a { color: blue; }',
		':is(:is(::before)) { #dialog a { color: red; } } a { color: blue; }',
		'a { && { color: red; } } aa { color: blue; }',
		'#foo { ::slotted(&) { color: red; } } .bar { ::slotted(&) { color: blue; } }',
		'b a { @scope (.page) { color: red; } } a { @scope (.page) { color: blue; } }',
		'#dialog a { :where(&) a { color: red; } color: blue; }',
		outdent`
			#dialog a {
				@media (width > 40rem) {
					:where(&) a { color: red; }
					color: blue;
				}
			}
		`,
	].map(code => asCss(code)),
	invalid: [
		'b a { color: red; } a { color: blue; }',
		'a:hover { color: red; } a { color: blue; }',
		'#x a:hover { color: red; } a:not(:hover), a { color: blue; }',
		'b a::before { color: red; } a::before { color: blue; }',
		'b a { color: red !important; } a { color: blue; }',
		'b a { color: red !important; } a { color: blue !important; }',
		'b a { color: red !important; } a { color: blue; color: green !important; }',
		'b a { color: red; background: white; } a { color: blue !important; background: black; }',
		'b a { COLOR: red; } a { color: blue; }',
		String.raw`b a { \63 olor: red; } a { color: blue; }`,
		'b a { --theme: red; } a { --theme: blue; }',
		'b a { -webkit-appearance: none; } a { -WEBKIT-APPEARANCE: auto; }',
		String.raw`b a.\66 oo { color: red; } a.foo { color: blue; }`,
		String.raw`b a#\66 oo { color: red; } a#foo { color: blue; }`,
		String.raw`b a[foo\|bar] { color: red; } a[foo\|bar] { color: blue; }`,
		String.raw`b foo\|a { color: red; } foo\|a { color: blue; }`,
		String.raw`b \61 { color: red; } a { color: blue; }`,
		'b a.foo.bar { color: red; } a.bar.foo { color: blue; }',
		'b a.é.é { color: red; } a.é.é { color: blue; }',
		'b a.foo.foo { color: red; } a.foo { color: blue; }',
		'b a.foo.bar::before { color: red; } a.bar.foo::before { color: blue; }',
		'b #dialog.a { &.c { color: red; } } #dialog.a.c { color: blue; }',
		'@scope (.root) { b .card { &.active { color: red; } } .card.active { color: blue; } }',
		'b a::MARKER { color: red; } a::marker { color: blue; }',
		String.raw`b a::\6d arker { color: red; } a::marker { color: blue; }`,
		'b a::SLOTTED(.foo) { color: red; } a::slotted(.foo) { color: blue; }',
		'b a { color: red; background: white; } a { color: blue; background: black; }',
		'b a, b button { color: red; } a, button { color: blue; }',
		'b .foo { color: red; } #other::before, .foo { color: blue; }',
		'b a { color: red; } #dialog a, a { color: green; } a { color: blue; }',
		'#dialog a, a { color: red; & { color: green; } color: blue; }',
		'a:is(#dialog) { color: red; } a { color: blue; }',
		'a:matches(#dialog) { color: red; } a { color: blue; }',
		'b a:is(::before, *) { color: red; } a { color: blue; }',
		'b a:is(:unknown, *) { color: red; } a { color: blue; }',
		'a:not(#dialog) { color: red; } a { color: blue; }',
		'a:has(#dialog) { color: red; } a { color: blue; }',
		'a:has(> #dialog) { color: red; } a { color: blue; }',
		'a:nth-child(2n of #dialog) { color: red; } a { color: blue; }',
		outdent`
			b a { /* keep */ color: red; }
			a { color: blue; }
		`,
		outdent`
			@media (width > 40rem) {
				b a { color: red; }
			}
			@media(width>40rem) {
				a { color: blue; }
			}
		`,
		outdent`
			@supports (display: grid) {
				b a { color: red; }
			}
			@supports(display:grid) {
				a { color: blue; }
			}
		`,
		outdent`
			@media print {
				@supports (display: grid) {
					b a { color: red; }
				}
			}
			@media print {
				@supports(display:grid) {
					a { color: blue; }
				}
			}
		`,
		outdent`
			@layer theme {
				b a { color: red; }
			}
			@layer theme {
				a { color: blue; }
			}
		`,
		outdent`
			@layer {
				b a { color: red; }
				a { color: blue; }
			}
		`,
		outdent`
			@container narrow (width < 20rem) {
				b a { color: red; }
			}
			@container   narrow   (width < 20rem) {
				a { color: blue; }
			}
		`,
		outdent`
			@scope (.page) {
				b a { color: red; }
			}
			@scope(.page) {
				a { color: blue; }
			}
		`,
		'@scope (.page) { > b a { color: red; } a { color: blue; } }',
		outdent`
			@starting-style {
				b a { color: red; }
			}
			@starting-style {
				a { color: blue; }
			}
		`,
		outdent`
			@unknown feature {
				b a { color: red; }
			}
			@unknown feature {
				a { color: blue; }
			}
		`,
		'a { & > b { color: red; } } b { color: blue; }',
		'a { b { color: red; } } b { color: blue; }',
		'#dialog, .dialog { & a { color: red; } } a { color: blue; }',
		'#dialog, .dialog { && { color: red; } } .dialog.dialog { color: blue; }',
		'.dialog:hover { & { color: red; } } .dialog { color: blue; }',
		'a { color: red; b & { color: blue; } color: green; }',
		'a { color: red !important; b & { color: blue !important; } color: green !important; }',
		'b a:before { color: red; } a::before { color: blue; }',
		'b a::before { color: red; } a:before { color: blue; }',
		'b a { @unknown feature { color: red; } } a { @unknown feature { color: blue; } }',
		outdent`
			.card {
				@media (width > 40rem) {
					&:hover { color: red; }
				}
			}
			@media (width > 40rem) {
				.card { color: blue; }
			}
		`,
	].map(code => asCss(code)),
});

test({
	valid: [
		{name: 'bounds propagated terminal-key count', code: tooManyTerminalKeys},
		{name: 'bounds terminal-key length', code: tooLongTerminalKey},
		{name: 'bounds terminal-key associations', code: tooManyTerminalKeyAssociations},
	],
	invalid: [],
	testerOptions: {
		language: languages.css.language,
		plugins: languages.css.plugins,
	},
});
