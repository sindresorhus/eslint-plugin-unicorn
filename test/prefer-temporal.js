import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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

		// Comments inside prevent the suggestion but the report stays
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
