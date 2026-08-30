import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const asCss = code => ({code, language: languages.css});
const asCssWithScopingRootAtRules = (code, scopingRootAtRules = ['utility']) => ({
	code,
	language: languages.css,
	options: [{scopingRootAtRules}],
});

test.snapshot({
	valid: [
		'a {}',
		'a /* & */ {}',
		'a { & {} && {} & .foo {} .foo & {} :is(&, .foo) {} }',
		outdent`
			a {
				@media all { & { color: red; } }
				@layer components { & { color: red; } }
			}
		`,
		'@scope (.foo) { & {} @media all { & {} } }',
		'@scope { & {} }',
		'@SCOPE (.foo) { & {} }',
		String.raw`@\73 cope { & {} }`,
		'a { @scope (&) to (& .limit) {} }',
		'@supports selector(&) {}',
		'@keyframes foo { & {} } @-webkit-keyframes bar { & {} }',
	].map(code => asCss(code)),
	invalid: [
		'& {}',
		'&.foo {}',
		'.foo & .bar {}',
		':not(&) {}',
		'&& {}',
		'&.foo, &.bar {}',
		outdent`
			@media all { & {} }
			@supports (display: grid) { & {} }
			@layer components { & {} }
			@container (width > 1px) { & {} }
		`,
		'@scope (&) {}',
		'@scope (.foo) to (&) {}',
		'@scope (&) to (&) {}',
		'@scope (&) { & {} }',
		'@utility content-body { & p {} }',
		'@-custom-keyframes foo { & {} }',
		'@-ms-keyframes foo { & {} }',
		'a { @keyframes foo { from { & {} } } }',
	].map(code => asCss(code)),
});

test.snapshot({
	valid: [
		asCssWithScopingRootAtRules('@utility content-body { @media all { & p {} } }'),
		asCssWithScopingRootAtRules('@UTILITY content-body { & p {} }'),
		asCssWithScopingRootAtRules(String.raw`@\75 tility content-body { & p {} }`),
		asCssWithScopingRootAtRules('@utility content-body { @supports (display: grid) { & p {} } }', ['UTILITY']),
		asCssWithScopingRootAtRules('@utility content-body { & p {} }', ['variant', 'utility']),
	],
	invalid: [
		asCssWithScopingRootAtRules('@variant content-body { & p {} }'),
	],
});
