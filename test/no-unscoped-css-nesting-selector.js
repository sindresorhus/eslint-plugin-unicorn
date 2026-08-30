import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const asCss = code => ({code, language: languages.css});
const asCssWithScopingRoot = (code, scopingRootAtRule = 'utility') => ({
	code,
	language: languages.css,
	options: [{scopingRootAtRules: [scopingRootAtRule]}],
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
	].map(code => asCss(code)),
});

test.snapshot({
	valid: [
		asCssWithScopingRoot('@utility content-body { @media all { & p {} } }'),
		asCssWithScopingRoot('@UTILITY content-body { & p {} }'),
		asCssWithScopingRoot(String.raw`@\75 tility content-body { & p {} }`),
		asCssWithScopingRoot('@utility content-body { @supports (display: grid) { & p {} } }', 'UTILITY'),
	],
	invalid: [
		asCssWithScopingRoot('@variant content-body { & p {} }'),
	],
});
