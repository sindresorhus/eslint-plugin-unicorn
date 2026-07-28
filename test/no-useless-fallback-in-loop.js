import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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

test.snapshot({
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
	],
	invalid: [
		'for (const item of items ?? []) {}',
		'for (const item of items || []) {}',
		'for (const [key, value] of Object.entries(options.config ?? {})) {}',
		'for (const value of Object.values(options.config || {})) {}',
		'for (const key of Object.keys(options.config ?? ({}))) {}',
		'for (const key in options.config ?? {}) {}',
		'for (const key in options.config || {}) {}',
		'for await (const item of items ?? []) {}',
		'for await (const item of Object.entries(options ?? {})) {}',
		'for (const item of getItems() ?? []) {}',
		'for (const [key, value] of Object.entries(getOptions() ?? {})) {}',
		'for (const item of items /* keep */ ?? []) {}',
		'for (const item of items ?? /* keep */ []) {}',
		'for (const item of Object.entries(options.config ?? /* keep */ {})) {}',
		'label: for (const item of items ?? []) { break label; }',
		'if (condition) for (const item of items ?? []) {} else foo();',
		typescript('for (const item of (items as Iterable<string> | undefined) ?? []) {}'),
		typescript('for (const key in (options.config ?? {}) as Record<string, unknown>) {}'),
		typescript('for (const item of (items! ?? []) as Iterable<string>) {}'),
		typescript('for (const item of (items satisfies Iterable<string> | undefined) ?? []) {}'),
		typescript('for (const item of (<Iterable<string> | undefined>items) ?? []) {}'),
		typescript('for (const [key, value] of Object.entries((options.config! ?? {}) as Record<string, unknown>)) {}'),
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
	],
});
