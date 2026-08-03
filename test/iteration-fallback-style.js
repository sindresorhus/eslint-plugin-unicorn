import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

const multilineTemplate = [
	'for (const item of items ?? []) {',
	'\tconst value = `',
	'\t\tkeep',
	'\t`;',
	'}',
].join('\n');

const multilineString = [
	'if (condition) {',
	'\tfor (const item of items ?? []) {',
	'\t\tconst value = \'keep\\',
	'\t\t\tindent\';',
	'\t}',
	'}',
].join('\n');

const multilineStringInHeader = [
	'for (const item of options[\'a\\',
	'\tb\'] ?? []) {}',
].join('\n');

const multilineJsx = [
	'for (const item of items ?? []) {',
	'\tconst value = <pre>',
	'\t\tkeep',
	'\t</pre>;',
	'}',
].join('\n');

const multilineBlockComment = [
	'for (const item of items ?? []) {',
	'\t/*',
	'\t\tKeep this comment.',
	'\t*/',
	'}',
].join('\n');

const multilineGuard = [
	'if (items) {',
	'\tfor (const item of items) {',
	'\t\tconst value = `',
	'\t\t\tkeep',
	'\t\t`;',
	'\t}',
	'}',
].join('\n');

const multilineGuardBody = outdent`
	if (items) {
		for (const item of items) {
			use(item);
		}
	}
`;

const guardStyle = code => ({code, options: ['guard']});
const fallbackStyle = code => ({code, options: ['fallback']});
const typescriptFallbackStyle = code => ({...typescript(code), options: ['fallback']});

ruleTest.snapshot({
	valid: [
		'for (const item of items) {}',
		'for await (const item of items) {}',
		'for (const key in object) {}',
		'for (const item of items ?? [fallback]) {}',
		'for (const item of items || [fallback]) {}',
		'for (const [key, value] of Object.entries(options.config ?? {fallback: true})) {}',
		'for (const key of Object.keys(options.config ?? undefined)) {}',
		'for (const item of Foo.entries(options ?? {})) {}',
		'for (const item of Object?.entries(options ?? {})) {}',
		'for (const item of Object.entries?.(options ?? {})) {}',
		'for (const item of Object[\'entries\'](options ?? {})) {}',
		'for (const item of Object.entries(...[options ?? {}])) {}',
		'for (const item of Object.entries(options ?? {}, extra)) {}',
		'for (const item of Object.getOwnPropertyNames(options ?? {})) {}',
		'const items = options.items ?? [];',
		'Object.entries(options.config ?? {});',
		'items.map(item => item ?? []);',
		typescript('for (const item of (items as Iterable<string> | undefined) ?? [fallback]) {}'),
		guardStyle('if (items) { for (const item of items) {} }'),
	],
	invalid: [
		'for (const item of items ?? []) {}',
		'for (const item of items || []) {}',
		'for (const item of (items ?? [])) {}',
		'for (const [key, value] of Object.entries(options.config ?? {})) {}',
		'for (const value of Object.values(options.config || {})) {}',
		'for (const key of Object.keys(options.config ?? ({}))) {}',
		'for (const key in options.config ?? {}) {}',
		'for (const key in options.config || {}) {}',
		'for await (const item of items ?? []) {}',
		'for await (const item of items || []) {}',
		'for await (const item of Object.entries(options ?? {})) {}',
		'for (const item of options?.items ?? []) {}',
		'for (const item of getItems() ?? []) {}',
		'for (const [key, value] of Object.entries(getOptions() ?? {})) {}',
		'for (const item of items /* keep */ ?? []) {}',
		'for (const item of items ?? /* keep */ []) {}',
		'for (const item of items ?? [/* keep */]) {}',
		'for (const item of Object.entries(options.config ?? /* keep */ {})) {}',
		'label: for (const item of items ?? []) { break label; }',
		'if (condition) for (const item of items ?? []) {} else foo();',
		typescript('for (const item of (items as Iterable<string> | undefined) ?? []) {}'),
		typescript('for (const key in (options.config ?? {}) as Record<string, unknown>) {}'),
		typescript('for (const item of (items! ?? []) as Iterable<string>) {}'),
		typescript('for (const item of (items satisfies Iterable<string> | undefined) ?? []) {}'),
		typescript('for (const item of (<Iterable<string> | undefined>items) ?? []) {}'),
		typescript('for (const item of items ?? ([] as Iterable<string>)) {}'),
		typescript('for (const [key, value] of Object.entries((options.config! ?? {}) as Record<string, unknown>)) {}'),
		typescript('for (const item of Object.entries(options ?? ({} satisfies Record<string, unknown>))) {}'),
		typescript('for (const item of Object.entries<Record<string, unknown>>(options.config ?? {})) {}'),
		'for (const item of items ?? []) use(item);',
		outdent`
			for (const item of items ?? []) {
				// Keep this comment.
				use(item);
			}
		`,
		outdent`
			if (condition) {
				for (const item of items ?? []) {
					use(item);
				}
			}
		`,
		multilineTemplate,
		multilineString,
		multilineStringInHeader,
		{
			code: multilineJsx,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		multilineBlockComment,
		guardStyle('for (const item of items ?? []) {}'),
	],
});

ruleTest.snapshot({
	valid: [
		fallbackStyle('for (const item of items ?? []) {}'),
		fallbackStyle('for (const item of items || []) {}'),
		fallbackStyle('for (const [key, value] of Object.entries(options.config ?? {})) {}'),
		fallbackStyle('for (const value of Object.values(options.config || {})) {}'),
		fallbackStyle('for (const key of Object.keys(options.config ?? {})) {}'),
		fallbackStyle('for (const key in options.config ?? {}) {}'),
		fallbackStyle('for (const key in options.config || {}) {}'),
		fallbackStyle('for await (const item of items ?? []) {}'),
		fallbackStyle('for await (const item of Object.values(options ?? {})) {}'),
		fallbackStyle('if (other) { for (const item of items) {} }'),
		fallbackStyle('if (items) { for (const item of items) {} } else foo();'),
		fallbackStyle('if (items) { const value = 1; for (const item of items) {} }'),
		fallbackStyle('if (items && enabled) { for (const item of items) {} }'),
		fallbackStyle('if (items) { for (const item of getItems()) {} }'),
		fallbackStyle('if (items) { for (const item of items ?? []) {} }'),
		fallbackStyle('if (items?.length) { for (const item of items?.length) {} }'),
	],
	invalid: [
		fallbackStyle('if (items) { for (const item of items) {} }'),
		fallbackStyle('if (items) for (const item of items) {}'),
		fallbackStyle('if (items) { for (const item of (items)) {} }'),
		fallbackStyle('if (items != null) { for (const item of items) {} }'),
		fallbackStyle('if (null != items) { for (const item of items) {} }'),
		fallbackStyle('if (options.config) { for (const [key, value] of Object.entries(options.config)) {} }'),
		fallbackStyle('if (options.config != null) { for (const value of Object.values(options.config)) {} }'),
		fallbackStyle('if (options.config) { for (const key of Object.keys(options.config)) {} }'),
		fallbackStyle('if (options.config) { for (const key in options.config) {} }'),
		fallbackStyle('if (items) { for await (const item of items) {} }'),
		typescriptFallbackStyle('if (items) { for (const item of (items as Iterable<string>)) {} }'),
		fallbackStyle('if (items) { for (const item of items) { /* Keep this comment. */ } }'),
		fallbackStyle('label: if (items) { for (const item of items) {} }'),
		fallbackStyle(multilineGuard),
		fallbackStyle(multilineGuardBody),
	],
});

test('iteration-fallback-style rejects invalid style options', t => {
	const linter = new Linter({configType: 'flat'});
	const verify = options => linter.verify('for (const item of items) {}', {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: {unicorn},
		rules: {
			'unicorn/iteration-fallback-style': ['error', ...options],
		},
	});

	for (const options of [[], ['guard'], ['fallback']]) {
		t.notThrows(() => verify(options));
	}

	for (const options of [['invalid'], [{}], ['guard', 'fallback']]) {
		t.throws(() => verify(options));
	}
});
