import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { color: red; }',
		'a { &:hover { color: red; } }',
		'a { &.active { color: red; } }',
		'a { & > b { color: red; } }',
		'a { b & { color: red; } }',
		'a { && { color: red; } }',
		'& { color: red; }',
		'@media (width > 0px) { & { color: red; } }',
		'a, b { & { color: red; } }',
		'a::before { & { color: red; } }',
		...['after', 'before', 'first-letter', 'first-line'].map(pseudoElement => `a:${pseudoElement} { & { color: red; } }`),
		String.raw`a:\62 efore { & { color: red; } }`,
		String.raw`a:\66 irst-line { & { color: red; } }`,
		'@keyframes pulse { from { & { color: red; } } }',
		String.raw`@keyfr\61 mes pulse { from { & { color: red; } } }`,
		String.raw`@-webkit-keyfr\61 mes pulse { from { & { color: red; } } }`,
	].map(code => ({code, language: languages.css})),
	invalid: [
		'a { & { color: red; } }',
		'a { & { color: red } }',
		'a { & {} }',
		'a { & { color: red } background: blue; }',
		'a { & { color: red } @media (width > 0px) { background: blue; } }',
		outdent`
			a {
				& {
					color: red;
				}
			}
		`,
		outdent`
			a {
				& /* keep before block */ {
					/* keep inside block */
					color: red;
				}
			}
		`,
		outdent`
			a {
				@media (width > 0px) {
					& {
						color: red;
					}
				}
			}
		`,
		outdent`
			@media (width > 0px) {
				a {
					& {
						color: red;
					}
				}
			}
		`,
		outdent`
			a {
				& {
					@media (width > 0px) {
						color: red;
					}
				}
			}
		`,
		'a { & { color: red; } & { background: blue; } }',
		'a { & { & { color: red; } } }',
		'@scope (.component) { a { & { color: red; } } }',
	].map(code => ({code, language: languages.css})),
});
