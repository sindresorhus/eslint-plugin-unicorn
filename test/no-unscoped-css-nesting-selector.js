import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const asCss = code => ({code, language: languages.css});

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
		'a { @scope (&) to (& .limit) {} }',
		'@supports selector(&) {}',
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
		'@utility content-body { & p {} }',
	].map(code => asCss(code)),
});

test.snapshot({
	valid: [
		'@utility content-body { @media all { & p {} } }',
		'@UTILITY content-body { & p {} }',
	].map(code => ({
		code,
		language: languages.css,
		options: [{scopingRootAtRules: ['utility']}],
	})),
	invalid: [
		{
			code: '@variant content-body { & p {} }',
			language: languages.css,
			options: [{scopingRootAtRules: ['utility']}],
		},
	],
});
