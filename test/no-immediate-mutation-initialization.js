import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import typescript from 'typescript';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta, 'no-immediate-mutation');

const checkConditionalsOptions = [{checkConditionals: true}];

// Consecutive declaration and initialization
ruleTest({
	valid: [
		...['[(foo)]', '[foo, ((bar))]', '[, (bar), foo]'].map(target => `let foo, bar;\n${target} = values;`),
		'let foo = 1;',
		'let [foo] = string.split(\',\', 1);',
		'let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; someOtherStatement(); foo = 1;',
		'let r; someOtherStatement(); let g, b; [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
		'let foo; ; foo = 1;',
		'let foo; { foo = 1; }',
		'let foo; if (enabled) { foo = 1; }',
		{code: 'let foo; if (enabled) { foo = 1; }', options: checkConditionalsOptions},
		'let foo; enabled && (foo = 1);',
		'let foo; consume(foo = 1);',
		'let foo; foo += 1;',
		'let foo; foo ??= 1;',
		'let foo; other = 1;',
		'let foo; foo.bar = 1;',
		'let foo; [foo, other] = values;',
		'let foo; [foo, foo] = values;',
		'let foo; [] = values;',
		'let foo; [,] = values;',
		'let foo; ({foo} = object);',
		'let foo; [[foo]] = values;',
		'let foo; [foo = 1] = values;',
		'let foo; [...foo] = values;',
		'let foo; [foo.bar] = values;',
		'let foo; foo = foo ?? 1;',
		'let foo; foo = (() => foo)();',
		'let foo; foo = class { static value = foo; };',
		'let foo; [foo] = [foo];',
		'let foo, bar; [foo, bar] = [bar, foo];',
		'let foo, bar = 1; foo = 2;',
		'var foo; var foo; foo = 1;',
		'var foo; foo = 1; var foo;',
		'function run(foo) { var foo; foo = 1; }',
		'export let foo; foo = 1;',
		'for (let foo; enabled;) { foo = 1; }',
		{code: 'declare let foo; foo = 1;', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		...[
			'let foo, /* Keep this comment. */ other;\nfoo = 1;',
			'let foo;\nfoo /* Keep this comment. */ = 1;',
			'let foo;\n(/* Keep this comment. */ foo = 1);',
		].map(code => ({
			code,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		...[
			['let foo;\n// Keep this comment.\nfoo = 1;', '// Keep this comment.\nlet foo = 1;'],
			['let foo;\nfoo = [/* Keep this comment. */ 1];', 'let foo = [/* Keep this comment. */ 1];'],
			['let foo;\nfoo = (/* Keep this comment. */ 1);', 'let foo = (/* Keep this comment. */ 1);'],
		].map(([code, output]) => ({
			code,
			output,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		...[
			['let foo: number, other: /* Keep this comment. */ number;\nfoo = 1;', 'let other: /* Keep this comment. */ number;\nlet foo: number = 1;'],
			['let foo: /* Keep this comment. */ number;\nfoo = 1;', 'let foo: /* Keep this comment. */ number = 1;'],
		].map(([code, output]) => ({
			code,
			output,
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		{
			code: 'let foo;\n[/* Keep this comment. */ foo] = values;',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [/* Keep this comment. */ foo] = values;'}],
			}],
		},
		...['let', 'var'].flatMap(kind => ['// Keep this comment.', '/* Keep this comment. */'].map(comment => ({
			code: `${comment}\n${kind} foo;\n\nfoo = "value"`,
			output: `${comment}\n\n${kind} foo = "value";`,
			errors: [{messageId: 'initialization', suggestions: []}],
		}))),
		...['``', '{values: [`text`]}'].map(initializer => ({
			code: `let foo;\nfoo = ${initializer};`,
			output: `let foo = ${initializer};`,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		...['-1', '-1n', '{values: [-1, -0, -1n]}'].map(initializer => ({
			code: `let foo;\nfoo = ${initializer};`,
			output: `let foo = ${initializer};`,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		...['-value', '-/pattern/'].map(initializer => ({
			code: `let foo;\nfoo = ${initializer};`,
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: `let foo = ${initializer};`}],
			}],
		})),
		...['(value as number)!', 'value satisfies number', '<number>value', '-(1 as number)'].map(initializer => ({
			code: `let foo: number;\nfoo = ${initializer};`,
			languageOptions: {parser: parsers.typescript},
			output: `let foo: number = ${initializer};`,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		{
			code: 'let foo: number;\nfoo = getValue() as number;',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo: number = getValue() as number;'}],
			}],
		},
		{
			code: 'let foo;\nfoo = value as number;',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = value as number;'}],
			}],
		},
		{
			code: 'let foo: number[];\nfoo = [(-1 as number)];',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: number[] = [(-1 as number)];',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo: (value: number) => number;\nfoo = identity<number>;',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: (value: number) => number = identity<number>;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = 1;',
			output: 'let foo = 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = {values: [bar, , () => 1]};',
			output: 'let foo = {values: [bar, , () => 1]};',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = {method() { return value; }, get value() { return other; }};',
			output: 'let foo = {method() { return value; }, get value() { return other; }};',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = {...source};',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = {...source};'}],
			}],
		},
		{
			code: 'let foo;\n[foo] = [1];',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [foo] = [1];'}],
			}],
		},
		{
			code: 'let foo;\n[foo] = string.split(\',\', 1);',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [foo] = string.split(\',\', 1);'}],
			}],
		},
		{
			code: 'let r, g, b;\n[r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));'}],
			}],
		},
		{
			code: 'let r, g, b, foo;\n[r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo;\nlet [r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));'}],
			}],
		},
		{
			code: 'let foo;\nfoo = getValue();',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = getValue();'}],
			}],
		},
		{
			code: 'async function run() {\n\tlet foo;\n\tfoo = await value;\n}',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'async function run() {\n\tlet foo = await value;\n}'}],
			}],
		},
		{
			code: 'function* run() {\n\tlet foo;\n\tfoo = yield value;\n}',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'function* run() {\n\tlet foo = yield value;\n}'}],
			}],
		},
		{
			code: 'let first, foo, last;\nfoo = last;',
			output: 'let first, last;\nlet foo = last;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'var foo, other, other;\nfoo = 1;',
			output: 'var other, other;\nvar foo = 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = 1;\n// Keep this comment.\nconsume(foo);',
			output: 'let foo = 1;\n// Keep this comment.\nconsume(foo);',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'function run() {\r\n  let foo, other;\r\n  foo = 1;\r\n}',
			output: 'function run() {\r\n  let other;\r\n  let foo = 1;\r\n}',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'function run() {\r\n  let foo\r\n  foo = 1\r\n  consume(foo)\r\n}',
			output: 'function run() {\r\n  let foo = 1;\r\n  consume(foo)\r\n}',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo: number;\nfoo = 1;',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: number = 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = 1;\nfoo = "x";'}],
			}],
		},
		{
			code: 'var foo;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'var foo = 1;\nfoo = "x";'}],
			}],
		},
		{
			code: 'let foo;\n[foo] = [1];\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let [foo] = [1];\nfoo = "x";'}],
			}],
		},
		{
			code: 'let foo;\nfoo = 1;',
			filename: 'example.ts',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = 1;'}],
			}],
		},
		{
			code: 'let foo: number | string;\nfoo = 1;\nfoo = "x";',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: number | string = 1;\nfoo = "x";',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
	],
});

ruleTest({
	valid: [],
	invalid: [
		...[
			[
				'var addScript = () => {\n\tvar script;\n\tscript = document.createElement("script");\n\tscript.src = "https://example.com/script.js";\n\treturn document.head.append(script);\n};',
				'var addScript = () => {\n\tvar script = document.createElement("script");\n\tscript.src = "https://example.com/script.js";\n\treturn document.head.append(script);\n};',
			],
			[
				'var addTitle = async (iframe, title) => {\n\tvar element;\n\telement = (await waitElement(iframe));\n\treturn element.setAttribute("title", title);\n};',
				'var addTitle = async (iframe, title) => {\n\tvar element = (await waitElement(iframe));\n\treturn element.setAttribute("title", title);\n};',
			],
			['var foo;\nfoo = getValue();', 'var foo = getValue();'],
		].map(([code, output]) => ({
			code,
			output,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		{
			code: 'var foo: number;\nfoo = getValue();',
			languageOptions: {parser: parsers.typescript},
			output: 'var foo: number = getValue();',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'var foo;\nfoo = getValue();',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'var foo = getValue();'}],
			}],
		},
	],
});

test('preserves indirect reads when combining var initialization', t => {
	const linter = new Linter();
	for (const kind of ['var', 'let']) {
		const code = `function run() {\n\tfunction read() { return foo; }\n\t${kind} foo;\n\tfoo = read();\n\treturn foo;\n}\nrun();`;
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': 'error'},
		});

		t.assert.strictEqual(runInNewContext(code), undefined);
		t.assert.strictEqual(runInNewContext(result.output), undefined);
		t.assert.strictEqual(result.fixed, kind === 'var');
		if (kind === 'var') {
			t.assert.strictEqual(result.output, code.replace('var foo;\n\tfoo = read();', 'var foo = read();'));
			t.assert.deepStrictEqual(result.messages, []);
		} else {
			t.assert.strictEqual(result.output, code);
			t.assert.strictEqual(result.messages.length, 1);
			t.assert.strictEqual(result.messages[0].messageId, 'initialization');
			t.assert.strictEqual(result.messages[0].suggestions.length, 1);
		}
	}
});

ruleTest({
	valid: [],
	invalid: [
		...[
			['var foo;\nfoo = foo ?? 1;', 'var foo = foo ?? 1;'],
			['var foo;\nfoo = () => foo;', 'var foo = () => foo;'],
			['var foo, bar;\n[foo, bar] = getValues();', 'var [foo, bar] = getValues();'],
			['var foo, keep, bar;\n[bar, , foo] = [1, 2, bar];', 'var keep;\nvar [bar, , foo] = [1, 2, bar];'],
		].map(([code, output]) => ({
			code,
			output,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		{
			code: 'var foo: number | undefined;\nfoo = foo ?? 1;',
			languageOptions: {parser: parsers.typescript},
			output: 'var foo: number | undefined = foo ?? 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		...[
			['var foo;\nfoo = foo ?? 1;', 'var foo = foo ?? 1;'],
			['var foo;\n[foo] = values;', 'var [foo] = values;'],
		].map(([code, output]) => ({
			code,
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output}],
			}],
		})),
		{
			code: 'var foo;\n(foo) = () => foo;',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'var foo = () => foo;'}],
			}],
		},
		{
			code: 'var foo: number;\n[foo] = values;',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'var foo;\nfoo = /* Keep this comment. */ foo ?? 1;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
	],
});

test('preserves var bindings when combining self-references and destructuring', t => {
	const linter = new Linter();
	for (const [code, output, expected] of [
		['var foo;\nfoo = foo ?? 1;\nfoo;', 'var foo = foo ?? 1;\nfoo;', 1],
		['var foo;\nfoo = () => foo;\nfoo() === foo;', 'var foo = () => foo;\nfoo() === foo;', true],
		['var foo, bar;\n[foo, bar] = [1, foo + 1];\n[foo, bar].join();', 'var [foo, bar] = [1, foo + 1];\n[foo, bar].join();', '1,NaN'],
		[
			'const values = { *[Symbol.iterator]() { yield 1; yield foo + 1; } };\nvar foo, bar;\n[foo, bar] = values;\n[foo, bar].join();',
			'const values = { *[Symbol.iterator]() { yield 1; yield foo + 1; } };\nvar [foo, bar] = values;\n[foo, bar].join();',
			'1,2',
		],
	]) {
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': 'error'},
		});

		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(runInNewContext(code), expected);
		t.assert.strictEqual(runInNewContext(result.output), expected);
	}
});

ruleTest({
	valid: [],
	invalid: [
		...[
			'void 0',
			'!enabled',
			'!!value',
			'typeof value',
			'this',
			'+1',
			'~1n',
			'enabled && value',
			'value || fallback',
			'value ?? fallback',
			'enabled ? first : second',
			'(first, second)',
			'first === second',
			'first !== second',
			'{values: [!enabled, value ?? 0], kind: typeof value}',
		].map(initializer => ({
			code: `let foo;\nfoo = ${initializer};`,
			output: `let foo = ${initializer};`,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		...[
			'!getValue()',
			'void object.value',
			'typeof object.value',
			'getValue() && 1',
			'value || getValue()',
			'getValue() ?? fallback',
			'getValue() ? 1 : 2',
			'enabled ? getValue() : 0',
			'enabled ? 0 : getValue()',
			'(getValue(), 1)',
			'1 === object.value',
			'object.value !== 0',
			'+value',
			'~value',
			'value == 1',
			'value + 1',
		].map(initializer => ({
			code: `let foo;\nfoo = ${initializer};`,
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: `let foo = ${initializer};`}],
			}],
		})),
		{
			code: 'let foo: boolean;\nfoo = !(value satisfies unknown);',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: boolean = !(value satisfies unknown);',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = !value;',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = !value;'}],
			}],
		},
	],
});

ruleTest({
	valid: [],
	invalid: [
		...[
			'() => foo',
			'function () { return foo; }',
			'function* () { yield foo; }',
			'async () => foo',
			'async function* () { yield foo; }',
			'(value = foo) => value',
		].map(initializer => ({
			code: `let foo;\nfoo = ${initializer};`,
			output: `let foo = ${initializer};`,
			errors: [{messageId: 'initialization', suggestions: []}],
		})),
		{
			code: 'let foo: () => unknown;\nfoo = (() => foo) satisfies () => unknown;',
			languageOptions: {parser: parsers.typescript},
			output: 'let foo: () => unknown = (() => foo) satisfies () => unknown;',
			errors: [{messageId: 'initialization', suggestions: []}],
		},
		{
			code: 'let foo;\nfoo = () => foo;',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = () => foo;'}],
			}],
		},
		{
			code: 'let foo;\n(foo) = () => foo;',
			errors: [{
				messageId: 'initialization',
				suggestions: [{messageId: 'suggestion/initialization', output: 'let foo = () => foo;'}],
			}],
		},
	],
});

test('preserves recursive function behavior when combining let initialization', async t => {
	const linter = new Linter();
	await Promise.all([
		['value => value === 0 ? 1 : value * foo(value - 1)', 'foo(4)', 24],
		['function (value) { return value === 0 ? 1 : value * foo(value - 1); }', 'foo(4)', 24],
		['(value = foo) => value', 'foo() === foo', true],
		['function* () { yield foo; }', 'foo().next().value === foo', true],
		['async () => foo', 'foo().then(value => value === foo)', true],
		['async function* () { yield foo; }', 'foo().next().then(({value}) => value === foo)', true],
	].map(async ([initializer, use, expected]) => {
		const code = `let foo;\nfoo = ${initializer};\n${use};`;
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': 'error'},
		});

		t.assert.strictEqual(result.fixed, true, initializer);
		t.assert.strictEqual(result.output, `let foo = ${initializer};\n${use};`, initializer);
		t.assert.deepStrictEqual(result.messages, [], initializer);
		t.assert.strictEqual(await runInNewContext(code), expected, initializer);
		t.assert.strictEqual(await runInNewContext(result.output), expected, initializer);
		t.assert.strictEqual(runInNewContext(`let foo;\nfoo = ${initializer};\nfoo.name;`), 'foo', initializer);
		t.assert.strictEqual(runInNewContext(`let foo = ${initializer};\nfoo.name;`), 'foo', initializer);
	}));
});

test('preserves values when combining non-coercing initializers', t => {
	const linter = new Linter();
	const setup = 'const value = { [Symbol.toPrimitive]() { throw new Error("Unexpected coercion"); } };\n';
	for (const [initializer, expected] of [
		['void value', undefined],
		['!value', false],
		['typeof value', 'object'],
		['value && 1', 1],
		['0 || 2', 2],
		['undefined ?? 3', 3],
		['value ? 4 : 5', 4],
		['(value, 6)', 6],
		['value === value', true],
		['value !== 0', true],
		['+1', 1],
		['~1n', -2n],
	]) {
		const code = `${setup}let foo;\nfoo = ${initializer};\nfoo;`;
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': 'error'},
		});

		t.assert.strictEqual(result.fixed, true, initializer);
		t.assert.strictEqual(result.output, `${setup}let foo = ${initializer};\nfoo;`, initializer);
		t.assert.deepStrictEqual(result.messages, [], initializer);
		t.assert.strictEqual(runInNewContext(code), expected, initializer);
		t.assert.strictEqual(runInNewContext(result.output), expected, initializer);
	}
});

test('preserves this when combining initialization', t => {
	const linter = new Linter();
	const code = 'function read() {\n\tlet foo;\n\tfoo = this;\n\treturn foo;\n}\nread.call(receiver);';
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});
	const receiver = {value: 1};

	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, 'function read() {\n\tlet foo = this;\n\treturn foo;\n}\nread.call(receiver);');
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(runInNewContext(code, {receiver}), receiver);
	t.assert.strictEqual(runInNewContext(result.output, {receiver}), receiver);
});

test('preserves anonymous function names in composed initializers', t => {
	const linter = new Linter();
	for (const initializer of [
		'true ? () => 1 : () => 2',
		'false || (() => 1)',
		'true && (() => 1)',
		'undefined ?? (() => 1)',
		'(0, () => 1)',
	]) {
		const code = `let foo;\nfoo = ${initializer};\nfoo.name;`;
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': 'error'},
		});

		t.assert.strictEqual(result.fixed, true, initializer);
		t.assert.strictEqual(result.output, `let foo = ${initializer};\nfoo.name;`, initializer);
		t.assert.deepStrictEqual(result.messages, [], initializer);
		t.assert.strictEqual(runInNewContext(code), '', initializer);
		t.assert.strictEqual(runInNewContext(result.output), '', initializer);
	}
});

test('preserves suspension when combining var initialization', t => {
	const linter = new Linter();
	const code = 'function* read() {\n\tvar foo;\n\tfoo = yield 1;\n\treturn foo;\n}\nread();';
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, 'function* read() {\n\tvar foo = yield 1;\n\treturn foo;\n}\nread();');
	t.assert.deepStrictEqual(result.messages, []);
	for (const source of [code, result.output]) {
		const generator = runInNewContext(source);
		const first = generator.next();
		t.assert.strictEqual(first.value, 1);
		t.assert.strictEqual(first.done, false);
		const last = generator.next(2);
		t.assert.strictEqual(last.value, 2);
		t.assert.strictEqual(last.done, true);
	}
});

test('preserves var bindings during awaited thenable resolution', async t => {
	const linter = new Linter();
	const code = 'async function run() {\n\tconst value = {then(resolve) { resolve(foo === undefined ? 1 : 2); }};\n\tvar foo;\n\tfoo = await value;\n\treturn foo;\n}\nrun();';
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, code.replace('var foo;\n\tfoo = await value;', 'var foo = await value;'));
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(await runInNewContext(code), 1);
	t.assert.strictEqual(await runInNewContext(result.output), 1);
});

test('keeps potentially reentrant operands suggestion-only', t => {
	const linter = new Linter();
	const setup = 'const value = { valueOf() { return foo === undefined ? 1 : 2; } };\n';
	for (const [initializer, expected] of [
		['!+value', false],
		['void +value', undefined],
		['typeof +value', 'number'],
		['true && +value', 1],
		['false || +value', 1],
		['undefined ?? +value', 1],
		['true ? +value : 0', 1],
		['(0, +value)', 1],
		['(+value) === 1', true],
		['(+value) !== 0', true],
	]) {
		const code = `${setup}let foo;\nfoo = ${initializer};\nfoo;`;
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': 'error'},
		});

		t.assert.strictEqual(result.fixed, false, initializer);
		t.assert.strictEqual(result.output, code, initializer);
		t.assert.strictEqual(result.messages.length, 1, initializer);
		t.assert.strictEqual(result.messages[0].messageId, 'initialization', initializer);
		t.assert.strictEqual(result.messages[0].suggestions.length, 1, initializer);
		t.assert.strictEqual(runInNewContext(result.output), expected, initializer);
	}
});

ruleTest.snapshot({
	valid: [],
	invalid: [
		'var foo;\nfoo = 1;',
		'var r, g, b;\n[b, r, g] = values;',
		'let first, foo, last;\nfoo = 1;',
		'let r, keep, g, b;\n[g, , b, r] = values;',
		'let foo;\n((foo)) = ((1));',
		'let foo;\n((foo = (first, second)));',
		'let foo;\n[foo] = ((values));',
		'let foo;\nfoo = (other => other)(1);',
		'let foo;\nfoo = (foo => foo)(1);',
		'let foo;\nfoo = () => 1;',
		'let foo;\nfoo = other?.value;',
		'let foo;\nfoo = other?.getValue();',
		{code: 'let foo;\nfoo = <Component />;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'let foo;\nfoo = 1;\nfoo = 2;',
		'let foo\nfoo = 1\n;[1].map(callback)',
		'let foo;\nfoo = 1;\n[1].map(callback);',
		'function run() {\n\tlet foo;\n\tfoo = 1;\n}',
		'let foo;\nfoo = 1; // Keep this comment.',
		'let foo; // Keep this comment.\nfoo = 1;',
		'let /* Keep this comment. */ foo;\nfoo = 1;',
		'let foo;\n/* Keep this comment. */ foo = 1;',
		'let foo;\nfoo = /* Keep this comment. */ 1;',
		'let foo;\nfoo = getValue(/* Keep this comment. */);',
		{code: 'let foo;\nfoo = 1;', options: checkConditionalsOptions},
		{code: 'let foo: number;\nfoo = value as number;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number, other: string;\nfoo = value!;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo;\nfoo = value satisfies number;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number, bar: string;\n[foo, bar] = values;', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo: number;\n[foo] = getValues();', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo;\n[foo] = values as number[];', languageOptions: {parser: parsers.typescript}},
		{code: 'let foo!: number;\nfoo = 1;', languageOptions: {parser: parsers.typescript}},
	],
});

test('combines consecutive initialization and mutation across autofix passes', t => {
	const linter = new Linter();
	const code = 'let array;\narray = [1];\narray.push(2);\nif (enabled) { array.push(3); }';
	for (const [checkConditionals, output] of [
		[false, 'let array = [1, 2];\nif (enabled) { array.push(3); }'],
		[true, 'let array = [1, 2, ...((enabled) ? [3] : [])];'],
	]) {
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': ['error', {checkConditionals}]},
		});

		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
	}
});

test('does not autofix destructuring whose iterator reads an initialization target', t => {
	const linter = new Linter();
	const code = 'const values = { *[Symbol.iterator]() { yield foo; } };\nlet foo;\n[foo] = values;\nfoo;';
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});

	t.assert.strictEqual(runInNewContext(code), undefined);
	t.assert.strictEqual(runInNewContext(result.output), undefined);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].messageId, 'initialization');
	t.assert.strictEqual(result.messages[0].suggestions.length, 1);
});

test('preserves anonymous function names when combining initialization', t => {
	const linter = new Linter();
	for (const initializer of ['(function () {})', '(() => 1)', '(async () => 1)', '(function* () {})']) {
		for (const target of ['foo', '((foo))']) {
			const code = `let foo;\n${target} = ${initializer};\nfoo.name;`;
			const result = linter.verifyAndFix(code, {
				plugins: {unicorn: plugin},
				rules: {'unicorn/no-immediate-mutation': 'error'},
			});
			const isPlainTarget = target === 'foo';
			const expectedName = isPlainTarget ? 'foo' : '';

			t.assert.strictEqual(runInNewContext(code), expectedName, code);
			t.assert.strictEqual(runInNewContext(result.output), expectedName, code);
			t.assert.strictEqual(result.fixed, isPlainTarget, code);
			if (isPlainTarget) {
				t.assert.strictEqual(result.output, `let foo = ${initializer};\nfoo.name;`, code);
				t.assert.deepStrictEqual(result.messages, [], code);
			} else {
				t.assert.strictEqual(result.output, code);
				t.assert.strictEqual(result.messages.length, 1);
				t.assert.strictEqual(result.messages[0].messageId, 'initialization');
				t.assert.strictEqual(result.messages[0].suggestions.length, 1);
			}
		}
	}
});

test('preserves anonymous function names with parentheses around the assignment', t => {
	const linter = new Linter();
	const code = 'let foo;\n((foo = (() => 1)));\nfoo.name;';
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(runInNewContext(code), 'foo');
	t.assert.strictEqual(runInNewContext(result.output), 'foo');
});

test('preserves negative zero when combining initialization', t => {
	const linter = new Linter();
	const code = 'let foo;\nfoo = -0;\nfoo;';
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(Object.is(runInNewContext(code), -0), true);
	t.assert.strictEqual(Object.is(runInNewContext(result.output), -0), true);
});

test('preserves multiline template text and line endings when combining initialization', t => {
	const linter = new Linter();
	const code = 'let foo;\r\nfoo = `first\r\nsecond`;\r\nfoo;';
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, 'let foo = `first\r\nsecond`;\r\nfoo;');
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(runInNewContext(code), 'first\nsecond');
	t.assert.strictEqual(runInNewContext(result.output), 'first\nsecond');
});

test('preserves contextual callback typing when combining initialization', t => {
	const linter = new Linter();
	const code = 'let callback: (value: number) => number;\ncallback = value => value * 2;';
	const result = linter.verifyAndFix(code, {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-immediate-mutation': 'error'},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, 'let callback: (value: number) => number = value => value * 2;');
	t.assert.deepStrictEqual(result.messages, []);
	for (const source of [code, result.output]) {
		const filename = 'file.ts';
		const options = {
			strict: true,
			noEmit: true,
			noLib: true,
			types: [],
		};
		const host = typescript.createCompilerHost(options);
		host.getSourceFile = name => name === filename ? typescript.createSourceFile(name, source, typescript.ScriptTarget.Latest) : undefined;
		const program = typescript.createProgram([filename], options, host);

		t.assert.deepStrictEqual(program.getSemanticDiagnostics(), []);
	}
});

test('does not autofix initialization whose implicit calls read an initialization target', t => {
	const linter = new Linter();
	for (const {setup, initializer, read = 'foo', expected} of [
		{
			setup: 'const value = { valueOf() { return foo === undefined ? 2 : 3; } };',
			initializer: '+value',
			expected: 2,
		},
		{
			setup: 'const value = { valueOf() { return foo === undefined ? 2 : 3; } };',
			initializer: 'value ** 2',
			expected: 4,
		},
		{
			setup: 'function tag() { return foo; }',
			initializer: 'tag`text`',
			expected: undefined,
		},
		{
			setup: 'const value = { toString() { return foo === undefined ? "key" : "other"; } };',
			initializer: '`${value}`', // eslint-disable-line no-template-curly-in-string
			expected: 'key',
		},
		{
			setup: 'const value = { toString() { return foo === undefined ? "key" : "other"; } };',
			initializer: '{[value]: 1}',
			read: 'foo.key',
			expected: 1,
		},
		{
			setup: 'const values = { *[Symbol.iterator]() { yield foo; } };',
			initializer: '{values: [...values]}',
			read: 'foo.values.length',
			expected: 1,
		},
		{
			setup: 'const Constructor = { [Symbol.hasInstance]() { return foo === undefined; } };',
			initializer: '{} instanceof Constructor',
			expected: true,
		},
	]) {
		const code = `${setup}\nlet foo;\nfoo = ${initializer};\n${read};`;
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/no-immediate-mutation': 'error'},
		});

		t.assert.strictEqual(runInNewContext(code), expected, initializer);
		t.assert.strictEqual(runInNewContext(result.output), expected, initializer);
		t.assert.strictEqual(result.fixed, false, initializer);
		t.assert.strictEqual(result.output, code, initializer);
		t.assert.strictEqual(result.messages.length, 1, initializer);
		t.assert.strictEqual(result.messages[0].messageId, 'initialization', initializer);
		t.assert.strictEqual(result.messages[0].suggestions.length, 1, initializer);
	}
});
