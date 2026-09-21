import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const asCss = code => ({code, language: languages.css});

test.snapshot({
	valid: [
		outdent`
			@keyframes fade {
				to { opacity: 1; }
			}
			a { animation-name: fade; }
		`,
		outdent`
			a { animation: 1s ease fade; }
			@keyframes fade {
				to { opacity: 1; }
			}
		`,
		outdent`
			a { animation: fade 1s, slide 2s; }
			@keyframes fade {}
			@keyframes slide {}
		`,
		'@keyframes fade {} a { animation-name: "fade"; }',
		'@keyframes "fade" {} a { animation-name: fade; }',
		'@keyframes "none" {} a { animation-name: "none"; }',
		'@keyframes "inherit" {} a { animation-name: "inherit"; }',
		String.raw`@keyframes f\61 de {} a { animation-name: fade; }`,
		String.raw`@keyframes fade {} a { animation-name: f\61 de; }`,
		String.raw`@keyframes "f\61 de" {} a { animation-name: fade; }`,
		String.raw`@keyfr\61 mes fade {} a { anim\61 tion-name: fade; }`,
		'@KEYFRAMES fade {} a { ANIMATION-NAME: fade; }',
		'@keyframes ease-out {} a { animation: ease-in ease-out; }',
		'@keyframes backwards {} a { animation: 3s none backwards; }',
		'@keyframes Fade {} a { animation-name: Fade; }',
		'@-webkit-keyframes fade {} a { animation-name: fade; }',
		'@-moz-keyframes fade {} a { animation-name: fade; }',
		'@-o-keyframes fade {} a { animation-name: fade; }',
		outdent`
			@media (prefers-reduced-motion: no-preference) {
				@keyframes fade {}
			}
			a {
				&:hover { animation-name: fade; }
			}
		`,
		'a { animation: none; }',
		'a { animation-name: none; }',
		'a { animation-name: inherit; }',
		'a { animation: 1s ease infinite alternate both paused; }',
		'a { animation-name: var(--animation); }',
		'a { animation-name: var(--animation, missing); }',
		'a { animation: var(--animation, missing 1s ease); }',
		'@keyframes fade {} a { animation: fade var(--duration); }',
		'@keyframes fade {} a { animation-name: fade, var(--animation); }',
		'@keyframes ease-out {} a { animation: ease-in ease-out, var(--animation); }',
		'a { -webkit-animation-name: missing; -moz-animation: missing 1s; -o-animation-name: missing; }',
		'@supports (animation-name: missing) { a { color: red; } }',
		'a { transition-property: missing; --animation-name: missing; }',
		'a { animation-name: ""; }',
	].map(code => asCss(code)),
	invalid: [
		'a { animation-name: missing; }',
		'a { animation: missing 1s ease; }',
		outdent`
			a { animation-name: fade, missing; }
			@keyframes fade {}
		`,
		'a { animation-name: missing, missing; }',
		outdent`
			a { animation-name: Fade; }
			@keyframes fade {}
		`,
		'a { animation-name: "missing"; }',
		'a { animation-name: ease; }',
		String.raw`a { animation-name: m\69 ssing; }`,
		String.raw`a { anim\61 tion-name: missing; }`,
		outdent`
			a {
				&:hover { animation-name: missing; }
			}
		`,
		'a { animation: missing var(--duration); }',
		'a { animation-name: missing, var(--animation); }',
		'a { animation: ease-in ease-out; }',
		'a { animation: ease-in ease-out, var(--animation); }',
		'a { animation: 3s none backwards; }',
		'a { animation: missing 100px; }',
		'@keyframes none {} a { animation-name: "none"; }',
		'@keyframes inherit {} a { animation-name: "inherit"; }',
		'@keyframes fade; a { animation-name: fade; }',
		'@Keyframes fade {} a { animation-name: fade; }',
		'@-ms-keyframes fade {} a { animation-name: fade; }',
		'@-custom-keyframes fade {} a { animation-name: fade; }',
		'@supports (animation-name: ignored) { a { animation-name: missing; } }',
	].map(code => asCss(code)),
});
