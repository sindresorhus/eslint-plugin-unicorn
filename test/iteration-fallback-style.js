import test from 'node:test';
import {runInNewContext} from 'node:vm';
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

ruleTest({
	valid: [],
	invalid: [
		{
			code: 'if (items) { for (const item of items) { /* keep */ use(item); } }',
			options: ['fallback'],
			output: 'for (const item of items || []) { /* keep */ use(item); }',
			errors: [{messageId: 'preferFallback'}],
		},
		{
			code: 'if (options.config != null) { for (const [key, value] of Object.entries(/* keep */ options.config)) { use(key, value); } }',
			options: ['fallback'],
			output: 'for (const [key, value] of Object.entries(/* keep */ options.config ?? {})) { use(key, value); }',
			errors: [{messageId: 'preferFallback'}],
		},
	],
});

ruleTest({
	valid: [],
	invalid: [
		...[
			['if (items) {\r\n  for (const item of items) {\r\n    // keep\r\n    use(item);\r\n  }\r\n}', 'for (const item of items || []) {\r\n  // keep\r\n  use(item);\r\n}'],
			['if (items != null) {\n\tfor (const item of items // keep\n\t) { use(item); }\n}', 'for (const item of items ?? [] // keep\n) { use(item); }'],
			['if (items) { for (const /* keep */ item of items) use(item); }', 'for (const /* keep */ item of items || []) use(item);'],
		].map(([code, output]) => ({
			code, output, options: ['fallback'], errors: [{messageId: 'preferFallback'}],
		})),
		{
			code: 'if (items) { for (const item of items) { use(item as /* keep */ string); } }',
			languageOptions: {parser: parsers.typescript},
			options: ['fallback'],
			output: 'for (const item of items || []) { use(item as /* keep */ string); }',
			errors: [{messageId: 'preferFallback'}],
		},
		...[
			'if (/* keep */ items) { for (const item of items) {} }',
			'if (items) { /* keep */ for (const item of items) {} }',
			'if (items) { for (const item of items) {} /* keep */ }',
		].map(code => ({code, options: ['fallback'], errors: [{messageId: 'preferFallback'}]})),
	],
});

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
		typescript('for (const item of items ?? (<Iterable<string>>[])) {}'),
		typescript('for (const item of items ?? ([]!)) {}'),
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
		fallbackStyle('if (items != other) { for (const item of items) {} }'),
		fallbackStyle('if (getItems() != null) { for (const item of getItems()) {} }'),
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
		verify(options);
	}

	for (const [options, message] of [
		[['invalid'], /Value "invalid" should be equal to one of the allowed values/u],
		[[{}], /Value \{\} should be equal to one of the allowed values/u],
		[['guard', 'fallback'], /should NOT have more than 1 items/u],
	]) {
		t.assert.throws(() => verify(options), {message});
	}
});

// The wrapped loop follows the file's indentation
ruleTest({
	valid: [],
	invalid: [
		{
			code: outdent`
				function run() {
				  for (const item of items ?? []) {
				    use(item);
				  }
				}
			`,
			output: outdent`
				function run() {
				  if ((items) != null) {
				    for (const item of items) {
				      use(item);
				    }
				  }
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				function run() {
				    for (const item of items || []) {
				        use(item);
				    }
				}
			`,
			output: outdent`
				function run() {
				    if (items) {
				        for (const item of items) {
				            use(item);
				        }
				    }
				}
			`,
			errors: 1,
		},
	],
});

// The wrapping `if` uses the file's line ending
ruleTest({
	valid: [],
	invalid: [
		{
			code: 'for (const item of items ?? []) {\r\n\tuse(item);\r\n}\r\n',
			output: 'if ((items) != null) {\r\n\tfor (const item of items) {\r\n\t\tuse(item);\r\n\t}\r\n}\r\n',
			errors: 1,
		},
	],
});

// The wrapped loop keeps nested indentation in space-indented files
ruleTest({
	valid: [],
	invalid: [
		{
			code: outdent`
				function run() {
				  for (const item of items ?? []) {
				    if (item) {
				      use(item);
				    }
				  }
				}
			`,
			output: outdent`
				function run() {
				  if ((items) != null) {
				    for (const item of items) {
				      if (item) {
				        use(item);
				      }
				    }
				  }
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				function run() {
				  if (items) {
				    for (const item of items) {
				      if (item) {
				        use(item);
				      }
				    }
				  }
				}
			`,
			options: ['fallback'],
			output: outdent`
				function run() {
				  for (const item of items || []) {
				    if (item) {
				      use(item);
				    }
				  }
				}
			`,
			errors: 1,
		},
	],
});

// Removing the guard must keep the boundary after an unbraced loop body.
ruleTest({
	valid: [],
	invalid: [{
		code: 'if (array) {\n\tfor (const value of array) consume(value)\n}\n[1].forEach(consume);',
		options: ['fallback'],
		output: 'for (const value of array || []) consume(value);\n[1].forEach(consume);',
		errors: 1,
	}],
});

ruleTest({
	valid: [],
	invalid: [
		...[
			['if (array) {\n\tfor (const value of array) consume(value)\n}\n(other)();', 'for (const value of array || []) consume(value);\n(other)();'],
			['if (array) {\n\tfor (const value of array) if (value) consume(value)\n}\n[1].forEach(consume);', 'for (const value of array || []) if (value) consume(value);\n[1].forEach(consume);'],
			['if (array) {\r\n\tfor (const value of (array)) consume(value)\r\n}\r\n[1].forEach(consume);', 'for (const value of (array || [])) consume(value);\r\n[1].forEach(consume);'],
		].map(([code, output]) => ({
			code, output, options: ['fallback'], errors: 1,
		})),
		{
			code: 'if (array) {\n\tfor (const value of array) consume(value) /* keep */\n}\n[1].forEach(consume);',
			options: ['fallback'],
			errors: 1,
		},
	],
});

test('removing the guard preserves the following statement', t => {
	const linter = new Linter();
	const code = outdent`
		const array = [2];
		const seen = [];
		const consume = value => {seen.push(value);};
		if (array) {
			for (const value of array) consume(value)
		}
		[1].forEach(consume);
		JSON.stringify(seen);
	`;
	const config = {plugins: {unicorn}, rules: {'unicorn/iteration-fallback-style': ['error', 'fallback']}};
	const {output, messages, fixed} = linter.verifyAndFix(code, config);
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
	t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
});

test('removing a guard with comments preserves loop results and evaluation count', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn}, rules: {'unicorn/iteration-fallback-style': ['error', 'fallback']}};
	for (const [guard, source, values] of [
		['items', 'items', [undefined, [], [1, 2]]],
		['items != null', 'items', [undefined, [], [1, 2]]],
		['items != null', 'Object.values(/* keep */ items)', [undefined, {}, {first: 1, second: 2}]],
	]) {
		const code = outdent`
			const seen = [];
			let calls = 0;
			if (${guard}) {
				for (const item of ${source}) { /* body */ calls++; seen.push(item); }
			}
			JSON.stringify({seen, calls});
		`;
		const {output, messages, fixed} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output.match(/\/\* body \*\//gu)?.length, 1);
		for (const items of values) {
			t.assert.strictEqual(runInNewContext(output, {items}), runInNewContext(code, {items}));
		}
	}
});
