import outdent from 'outdent';
import test from 'ava';
import {Linter} from 'eslint';
import {getTester, languages} from './utils/test.js';

const {ruleId, rule, test: ruleTest} = getTester(import.meta);

const asCss = code => ({code, language: languages.css});
const asCssWithScopingRootAtRules = (code, scopingRootAtRules = ['utility']) => ({
	code,
	language: languages.css,
	options: [{scopingRootAtRules}],
});

ruleTest.snapshot({
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
		'@scope (.foo) to (& .limit) {}',
		'@scope to (&) {}',
		'@scope to (:is(&, .limit)) {}',
		'@scope (.outer) { @scope (:is(&)) to (:not(&)) { @layer components { & {} } } }',
		'@supports selector(&) {}',
		'@keyframes foo { & {} } @-moz-keyframes bar { & {} } @-o-keyframes baz { & {} } @-webkit-keyframes qux { & {} }',
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
		'@scope (&) to (&) {}',
		'@scope (:is(&, .root)) to (:is(&, .limit)) {}',
		'@scope (&) { & {} }',
		'@utility content-body { & p {} }',
		'@-custom-keyframes foo { & {} }',
		'@-ms-keyframes foo { & {} }',
		String.raw`a { @\4B EYFRAMES foo { from { & {} } } }`,
		'@scope { @keyframes foo { from { & {} } } }',
	].map(code => asCss(code)),
});

ruleTest.snapshot({
	valid: [
		asCssWithScopingRootAtRules('@utility content-body { @media all { & p {} } }'),
		asCssWithScopingRootAtRules('@UTILITY content-body { & p {} }'),
		asCssWithScopingRootAtRules(String.raw`@\75 tility content-body { & p {} }`),
		asCssWithScopingRootAtRules('@utility content-body { @supports (display: grid) { & p {} } }', ['UTILITY']),
		asCssWithScopingRootAtRules('@utility content-body { & p {} }', ['variant', 'utility']),
		asCssWithScopingRootAtRules('@K content-body { & p {} }', ['K']),
		asCssWithScopingRootAtRules(String.raw`@foo\@bar { & {} }`, ['foo@bar']),
		asCssWithScopingRootAtRules('@utility content-body { @scope (:is(&)) {} }'),
	],
	invalid: [
		asCssWithScopingRootAtRules('@variant content-body { & p {} }'),
		asCssWithScopingRootAtRules('@k content-body { & p {} }', ['K']),
		asCssWithScopingRootAtRules('@K content-body { & p {} }', ['k']),
		asCssWithScopingRootAtRules('@keyframes foo { from { & {} } }', ['keyframes']),
		asCssWithScopingRootAtRules('@utility content-body { @keyframes foo { from { & {} } } }'),
		{
			code: '@utility content-body { & p {} }',
			language: languages.css,
			options: [{}],
		},
	],
});

test('rejects a leading `@` in scoping root at-rule names', t => {
	const linter = new Linter();

	t.throws(
		() => linter.verify('& {}', {
			...languages.css,
			files: ['**'],
			plugins: {
				...languages.css.plugins,
				'rule-to-test': {
					rules: {[ruleId]: rule},
				},
			},
			rules: {
				[`rule-to-test/${ruleId}`]: [
					'error',
					{scopingRootAtRules: ['@utility']},
				],
			},
		}, {filename: 'index.css'}),
		{message: /Value "@utility" should match pattern/u},
	);
});
