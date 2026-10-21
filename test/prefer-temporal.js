import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['new Date(1000 /* keep */ + 2000);', 'Temporal.Instant.fromEpochMilliseconds(1000 /* keep */ + 2000);'],
		['new Date((/* keep */ 0));', 'Temporal.Instant.fromEpochMilliseconds((/* keep */ 0));'],
		['new Date([/* keep */ 1000][0]);', 'Temporal.Instant.fromEpochMilliseconds([/* keep */ 1000][0]);'],
		['new Date(-(1000 /* keep */ + 2000));', 'Temporal.Instant.fromEpochMilliseconds(-(1000 /* keep */ + 2000));'],
	].map(([code, output]) => ({code, errors: [{messageId: 'prefer-temporal', suggestions: [{messageId: 'prefer-temporal/suggestion', output}]}]})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'new Date((0 as /* keep */ number));',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-temporal', suggestions: [{messageId: 'prefer-temporal/suggestion', output: 'Temporal.Instant.fromEpochMilliseconds((0 as /* keep */ number));'}]}],
		},
		{
			code: 'new Date(1000 + // keep\r\n  2000);',
			errors: [{messageId: 'prefer-temporal', suggestions: [{messageId: 'prefer-temporal/suggestion', output: 'Temporal.Instant.fromEpochMilliseconds(1000 + // keep\r\n  2000);'}]}],
		},
		...[
			'new /* keep */ Date(0);',
			'new Date /* keep */ (0);',
			'new Date(0 /* keep */);',
			'new Date(/* keep */);',
			'new Date((/* keep */ 1.5));',
			'new Date((/* keep */ Infinity));',
			'new Date((/* keep */ 8_640_000_000_000_001));',
		].map(code => ({code, errors: [{messageId: 'prefer-temporal', suggestions: []}]})),
	],
});

// eslint-disable-next-line node-test/no-skip-test -- Temporal is unavailable on older supported Node.js versions.
nodeTest('commented epoch suggestions preserve timestamps and remain result type changes', {skip: globalThis.Temporal === undefined}, t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: {rules: {'prefer-temporal': rule}}}, rules: {'unicorn/prefer-temporal': 'error'}};
	for (const milliseconds of [0, 1000, -1000, 8_640_000_000_000_000, -8_640_000_000_000_000]) {
		const code = `new Date((/* keep */ ${milliseconds}));`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions?.length, 1);
		const {fix} = messages[0].suggestions[0];
		const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.ok(suggested.includes('/* keep */'));
		const date = runInNewContext(code, {Date});
		const instant = runInNewContext(suggested, {Temporal});
		t.assert.ok(date instanceof Date);
		t.assert.ok(instant instanceof Temporal.Instant);
		t.assert.strictEqual(date.getTime(), milliseconds);
		t.assert.strictEqual(instant.epochMilliseconds, date.getTime());
	}
});

// `checkMethods` needs type information. Use the raw TypeScript parser with `projectService`
// (the shared `parsers.typescript` injects `project: []`, which conflicts with `projectService`).
const typeAware = code => ({
	code,
	filename: 'file.ts',
	options: [{checkMethods: true}],
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		// Temporal usage
		'Temporal.Now.instant()',
		'Temporal.PlainDate.from("2024-08-16")',

		// `Date.now()` is allowed by default
		'Date.now()',

		// Bare references are not flagged by default
		'x instanceof Date',
		'const d = Date;',
		'foo(Date)',

		// Not the global `Date`
		'const Date = Foo; new Date();',
		'import Date from "foo"; new Date();',
		'class Date {} new Date();',
		'function foo(Date) { return new Date(); }',
		'foo.Date.parse("2024-08-16")',
		'foo.Date.UTC(2000, 11, 25)',

		// Type annotations are not value references
		{code: 'let x: Date;', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		// `new Date()` — current moment, suggestions offered
		'new Date()',
		'const now = new Date();',
		// Without parentheses
		'new Date',

		// `new Date(milliseconds)` — exact `Temporal.Instant.fromEpochMilliseconds()` suggestion
		'new Date(1_724_198_400_000)',
		'new Date(0)',
		'new Date(-1000)',
		'const ms = 1000; new Date(ms);',

		// `new Date(dateString)` — inconsistent parsing, no suggestion
		'new Date("2024-08-16")',
		'const modes = new Set([\'foo\']); modes.clear(); new Date(modes.size ? 0 : \'2020-01-01\')',
		'const modes = new Set([\'foo\']); modes.clear(); new Date((modes.size && 0) || timestamp)',
		'const object = {value: true}; Object.defineProperty(object, \'value\', {get() { return 0; }}); new Date(object.value ? 0 : timestamp)',
		'const string = "2024-08-16"; new Date(string);',
		// Template literal that resolves to a string
		'new Date(`2024-08-16`)',

		// `new Date(year, month, …)` — zero-indexed month message
		'new Date(2024, 0, 1)',
		'new Date(2024, 11, 25, 10, 30)',

		// Unknown single argument — generic message, no suggestion
		'new Date(input)',

		// Non-integer or out-of-range numbers — `Temporal.Instant.fromEpochMilliseconds()` throws on these, so no suggestion
		'new Date(NaN)',
		'new Date(Number.POSITIVE_INFINITY)',
		'new Date(1.5)',
		'new Date(9_000_000_000_000_000)',
		'new Date(1e21)',

		// A `BigInt` or spread argument is not a recognized number, so no suggestion
		'new Date(0n)',
		'new Date(...timestamps)',

		// Comments in removed syntax prevent the suggestion but the report stays
		'new Date(/* epoch */ 1000)',

		// `Date.parse()` — inconsistent parsing
		'Date.parse("2024-08-16")',

		// `Date.UTC()` — zero-indexed month message
		'Date.UTC(2000, 11, 25)',

		// `Date()` without `new`
		'Date()',

		// TypeScript
		{code: 'new Date()', languageOptions: {parser: parsers.typescript}},
		{code: 'new Date(x as number)', languageOptions: {parser: parsers.typescript}},

		// The parentheses around the argument must survive the suggestion
		'new Date((1))',
		'new Date((0, 1))',
		'new Date((1, 2).length)',
	],
});

// `checkDateNow` — exact autofix to `Temporal.Now.instant().epochMilliseconds`
test.snapshot({
	valid: [
		// `checkReferences` alone does not flag `Date.now()`
		{code: 'Date.now()', options: [{checkReferences: true}]},
	],
	invalid: [
		'Date.now()',
		'const start = Date.now();',
		'const duration = Date.now() - start;',
		// Computed and optional access still resolve to the global
		'Date["now"]()',
		'Date?.now()',
		// Accessed through the global object
		'globalThis.Date.now()',
	].map(code => ({code, options: [{checkDateNow: true}]})),
});

// `checkReferences`
test.snapshot({
	valid: [
		// Member access on `Date` is left to the construction and static-method checks
		{code: 'Date.prototype', options: [{checkReferences: true}]},
		{code: 'Date.length', options: [{checkReferences: true}]},
	],
	invalid: [
		'x instanceof Date',
		'const d = Date;',
		'foo(Date)',
		'[Date]',
		'typeof Date === "function"',
		// Construction is still reported only once, not double-reported as a reference
		'new Date()',
		'Date.parse("2024-08-16")',
	].map(code => ({code, options: [{checkReferences: true}]})),
});

// `checkMethods` — requires type information
test.snapshot({
	valid: [
		// Without type information the option is a no-op, so a method on an untyped value is not flagged
		{code: 'function f(x) { return x.getFullYear(); }', options: [{checkMethods: true}]},
		// Static methods live on `DateConstructor`, not on a `Date` instance
		typeAware('Date.now()'),
		// Not a `Date`
		typeAware('const string = "x"; const length = string.length;'),
		typeAware('const object = {getFullYear() {}}; object.getFullYear();'),
		typeAware('function f(date: Date & {tag: string}) { return date.tag; }'),
		typeAware('function f(date: Date & {tag(): string}) { return date.tag(); }'),
		// Subclasses of `Date` are not detected (the type symbol is the subclass, not `Date`)
		typeAware('class SubDate extends Date {} function f(date: SubDate) { return date.getTime(); }'),
	],
	invalid: [
		typeAware('function f(date: Date) { return date.getFullYear(); }'),
		typeAware('declare const date: Date; date.toISOString();'),
		typeAware('function f(date: Date) { return date.setUTCFullYear(2024); }'),
		// Computed access falls back to the generic description
		typeAware('function f(date: Date) { return date["getTime"](); }'),
		// Narrowed through optional chaining
		typeAware('function f(date: Date | undefined) { return date?.getMonth(); }'),
		// Intersection type
		typeAware('function f(date: Date & {tag: string}) { return date.getTime(); }'),
		// Chained directly on a construction (also reported at `new Date()`)
		typeAware('new Date().getFullYear();'),
	],
});

// The replacement call must not become an enclosing constructor's argument list.
test({
	valid: [],
	invalid: [{
		code: 'new new Date(0).toString.constructor("return 42")();',
		errors: [{
			messageId: 'prefer-temporal', suggestions: [{
				messageId: 'prefer-temporal/suggestion',
				output: 'new (Temporal.Instant.fromEpochMilliseconds(0)).toString.constructor("return 42")();',
			}],
		}],
	}],
});

test({
	valid: [],
	invalid: [
		...[
			['new (new Date(0)).toString.constructor("return 42")();', 'new (Temporal.Instant.fromEpochMilliseconds(0)).toString.constructor("return 42")();'],
			['new new Date(0) /* keep */ .toString.constructor("return 42")();', 'new (Temporal.Instant.fromEpochMilliseconds(0)) /* keep */ .toString.constructor("return 42")();'],
		].map(([code, output]) => ({
			code,
			errors: [{messageId: 'prefer-temporal', suggestions: [{messageId: 'prefer-temporal/suggestion', output}]}],
		})),
		{
			code: 'new new Date(0)!.toString.constructor("return 42")();',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'prefer-temporal',
				suggestions: [{messageId: 'prefer-temporal/suggestion', output: 'new (Temporal.Instant.fromEpochMilliseconds(0))!.toString.constructor("return 42")();'}],
			}],
		},
		{
			code: 'new new Date(/* keep */ 0).toString.constructor("return 42")();',
			errors: [{messageId: 'prefer-temporal', suggestions: []}],
		},
	],
});

nodeTest('Temporal suggestions preserve the enclosing constructor target', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: {rules: {'prefer-temporal': rule}}}, rules: {'unicorn/prefer-temporal': 'error'}};
	const code = 'new new Date((/* keep */ 0)).toString.constructor("return 42")();';
	const [message] = linter.verify(code, config);
	const {range, text} = message.suggestions[0].fix;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	const temporal = {Instant: {fromEpochMilliseconds: () => ({})}};

	t.assert.ok(output.includes('/* keep */'));
	t.assert.strictEqual(runInNewContext(output, {Temporal: temporal}), runInNewContext(code));
	t.assert.deepStrictEqual(linter.verify(output, config), []);
});
