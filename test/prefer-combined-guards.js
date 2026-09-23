import {runInNewContext} from 'node:vm';
import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const checkCompoundConditionsOptions = [{checkCompoundConditions: true}];

testRule.snapshot({
	valid: [
		'function foo() { if (a) { return; } }',
		'function foo() { if (a) { return; } else if (b) { return; } }',
		'function foo() { if (a) { return; } else { bar(); } if (b) { return; } }',
		'function foo() { if (a) { return; } if (b) { return; } else { bar(); } }',
		'function foo() { if (a) { return; } bar(); if (b) { return; } }',
		'function foo() { if (a) { return; } ; if (b) { return; } }',
		'function foo() { if (a) { return; } { if (b) { return; } } }',
		'function foo() { if (a) { return; } if (b) { return undefined; } }',
		'function foo() { if (a) { return true; } if (b) { return false; } }',
		'function foo() { if (a) { return error; } if (b) { throw error; } }',
		'if (a) { throw firstError; } if (b) { throw secondError; }',
		'if (a) { count++; } if (b) { count++; }',
		'if (a) {} if (b) {}',
		'if (a) { ; } if (b) { ; }',
		'function foo() { if (a) { log(); return; } if (b) { log(); return; } }',
		'function foo() { if (a) { return; ; } if (b) { return; ; } }',
		'function foo() { if (a) { { return; } } if (b) { { return; } } }',
		'function foo() { if (a) { if (c) { return; } } if (b) { if (c) { return; } } }',
		'outer: for (;;) { if (a) { break outer; } if (b) { break; } }',
		'outer: for (;;) { inner: for (;;) { if (a) { continue outer; } if (b) { continue inner; } } }',
		'for (;;) { if (a) { break; } if (b) { continue; } }',
		'switch (value) { case 1: if (a) { break; } case 2: if (b) { break; } }',
		'if (a) { process.exit(1); } if (b) { process.exit(2); }',
		'if (a) { process.exit(1); } if (b) { process.exit( 1 ); }',
		'function foo(process) { if (a) { process.exit(1); } if (b) { process.exit(1); } }',
		'if (a) { process.exit?.(1); } if (b) { process.exit?.(1); }',
		'if (a) { process.exit(tag`code`); } if (b) { process.exit(tag`code`); }',
		'function foo() { if (a) { return getValue(a); } if (b) { return getValue(b); } }',
		// Do not try to prove semantic equivalence or normalize expression formatting.
		'function foo() { if (a) { return value + 1; } if (b) { return value+1; } }',
		'function foo() { if (a) { return () => { return value; }; } if (b) { return () => { return\nvalue; }; } }',
		'function foo() { if (a) { return tag`value`; } if (b) { return tag`value`; } }',
		'function foo() { if (a) { return () => tag`value`; } if (b) { return () => tag`value`; } }',
		{
			code: 'function foo() { if (a) { throw error; } if (b) { throw error; } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			options: checkCompoundConditionsOptions,
			code: outdent`
				type A = {type: 'a'; exitCode(value: string): number};
				type B = {type: 'b'; exitCode(value: number): number};
				function run(subject: A | B, argument: string | number) {
					if (subject.type === 'a' && typeof argument === 'string') {
						process.exit(subject.exitCode(argument));
					}
					if (subject.type === 'b' && typeof argument === 'number') {
						process.exit(subject.exitCode(argument));
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			options: checkCompoundConditionsOptions,
			code: outdent`
				type A = {type: 'a'; method(value: string): string};
				type B = {type: 'b'; method(value: number): string};
				function run(subject: A | B, argument: string | number) {
					if (subject.type === 'a' && typeof argument === 'string') {
						return subject.method(argument);
					}
					if (subject.type === 'b' && typeof argument === 'number') {
						return subject.method(argument);
					}
				}
			`,
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		{
			options: checkCompoundConditionsOptions,
			code: outdent`
				function check(context) {
					if (context.finished) {
						return;
					}
					if (!context.hasResult && !context.hasError) {
						return;
					}
				}
			`,
		},
		'if (value < 0) { throw invalidValue; } if (!Number.isFinite(value)) { throw invalidValue; }',
		'function foo() { if (a) { return result; } if (b) { return result; } }',
		'function foo() { if (first()) { return result(); } if (second()) { return result(); } }',
		'function foo() { if (a) return; if (b) return; }',
		'function foo() { if (a) return; if (b) { return; } }',
		'function foo() { if (a) { return; } if (b) return; }',
		'function foo() { if (a) { return result; } if (b) { return result } }',
		'function foo() { if (a) { return result } if (b) { return result; } }',
		'function foo() { if (a) { return; } if (b) { return; } if (c) { return; } }',
		'function foo() { if (a) { return first; } if (b) { return first; } if (c) { return second; } if (d) { return second; } }',
		'for (;;) { if (a) { continue; } if (b) { continue; } }',
		'for (;;) { if (a) { break; } if (b) { break; } }',
		'outer: for (;;) { for (;;) { if (a) { continue outer; } if (b) { continue outer; } } }',
		'outer: { if (a) { break outer; } if (b) { break outer; } }',
		'switch (value) { case 1: if (a) { break; } if (b) { break; } }',
		'if (a) { process.exit(1); } if (b) { process.exit(1); }',
		{
			code: 'if (a) { process.exit(); } if (b) { process.exit(); }',
			languageOptions: {parser: parsers.typescript},
		},
		'class Foo { static { if (a) { throw error; } if (b) { throw error; } } }',
		'async function foo() { if (await a) { return await result; } if (await b) { return await result; } }',
		{
			code: 'function* foo() { if (yield a) { return yield result; } if (yield b) { return yield result; } }',
			options: checkCompoundConditionsOptions,
		},
		...['a || b', '((a))', '!a', '!!a', 'a || (b || c)', 'predicate(a && b)'].map(condition => `function foo() { if (${condition}) { return; } if (${condition}) { return; } }`),
		'function foo() { if (a?.b) { return result?.(); } if (c?.[d]) { return result?.(); } }',
		'function foo() { if (tag`first`) { return [...values]; } if (tag`second`) { return [...values]; } }',
		'function foo({a, b}) { if (a) { return {value}; } if (b) { return {value}; } }',
		'function foo() { if (a) return value\nif (b) { return value }\n[1].forEach(log) }',
		'function foo() { if (a) { return value }\nif (b) return value\ndone() }',
		'for (;;) { if (a) break\nif (b) break\ndone() }',
		'function foo() { if (a) { return; } if (b) { return; } /* Keep trailing comment. */ }',
		...['a as boolean', '<boolean>a', 'a!', 'a satisfies boolean', 'predicate<string>(a)', '(a || b) as boolean'].map(condition => ({
			code: `function foo() { if (${condition}) { return; } if (b) { return; } }`,
			languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'function foo() { if (a) { return <Component value={value} />; } if (b) { return <Component value={value} />; } }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'function foo() { if (a) { return result; } if (b) { return (((result))); } }',
		{
			code: 'function foo() { if (<First />) { return; } if (<Second />) { return; } }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'if (a) { process.exit(1); } if (b) { process.exit(1); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo() { if (a) { return false; } if (b) { return false; } }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

testRule({
	valid: [
		'function foo() { /* First reason. */ if (a) { return; } if (b) { return; } }',
		'function foo() { // First reason.\nif (a) { return; } if (b) { return; } }',
		'function foo() { if (a) { /* First guard. */ return; } if (b) { return; } }',
		'function foo() { if (a) { return; } /* Between guards. */ if (b) { return; } }',
		'function foo() { if (a) { return; } if (b) { /* Second guard. */ return; } }',
		'function foo() { if (a /* Condition. */) { return; } if (b) { return; } }',
		'function foo() { if (a) { return; } if (b /* Condition. */) { return; } }',
		'function foo() { if (a) { return; } // First guard.\nif (b) { return; } }',
		'function foo() { if (a) { return; }\n// eslint-disable-next-line no-console\nif (b) { return; } }',
		'if (a) { process.exit(/* Exit code. */ 1); } if (b) { process.exit(/* Exit code. */ 1); }',
	].flatMap(code => [
		{code},
		{code, options: checkCompoundConditionsOptions},
	]),
	invalid: [],
});

const nonSimpleConditions = [
	'a && b',
	'a ?? b',
	'a ? b : c',
	'a = b',
	'a, b',
	'() => a',
	'a || (b && c)',
	'(a && b) || c',
	'!(a || b)',
	'!!(a && b)',
	'!(a ? b : c)',
];
const nonSimpleConditionCases = [
	...nonSimpleConditions.flatMap(condition => [
		`function foo() { if (${condition}) { return; } if (other) { return; } }`,
		`function foo() { if (other) { return; } if (${condition}) { return; } }`,
	]),
	...['a && b', 'a || b'].map(condition => `async function foo() { if (await (${condition})) { return; } if (other) { return; } }`),
];
const wrappedNonSimpleConditionCases = ['(a && b) as boolean', '<boolean>(a && b)', '(a && b)!', '(a && b) satisfies boolean', '!((a || b) as boolean)'].map(condition => ({
	code: `function foo() { if (${condition}) { return; } if (other) { return; } }`,
	languageOptions: {parser: parsers.typescript},
}));

testRule.snapshot({
	valid: [
		...nonSimpleConditionCases,
		'function* foo() { if (yield a) { return; } if (b) { return; } }',
		...wrappedNonSimpleConditionCases,
		{
			code: 'function foo() { if (a && b) { return; } if (c) { return; } }',
			options: [{checkCompoundConditions: false}],
		},
		outdent`
			for (const comment of comments) {
				// Exclude explicitly linked comments #5363
				if (commentText === linkedComment) {
					continue;
				}

				if (!isLowQualityComment(commentText.textContent) && isFocused(comment)) {
					continue;
				}

				// Comments that contain useful images or links shouldn't be removed
				// Images are wrapped in <a> tags on GitHub hence included in the selector
				if (elementExists('a', commentText)) {
					continue;
				}
			}
		`,
		outdent`
			function processCommit() {
				if (!commit) {
					return;
				}

				if (
					// Skip commits that are only "ci:" without anything else.
					commit.raw === textNode.textContent
					&& !commitTitleElement.nextElementSibling

					// Ensure that the element contains only plain text, not stuff like <code>.
					&& commitTitleElement.childElementCount < 1
				) {
					return;
				}
			}
		`,
	],
	invalid: [
		...nonSimpleConditionCases.map(code => ({code, options: checkCompoundConditionsOptions})),
		...wrappedNonSimpleConditionCases.map(testCase => ({...testCase, options: checkCompoundConditionsOptions})),
	],
});

const withCheckMultiStatementBodies = testCases => testCases.map(testCase => ({
	...(typeof testCase === 'string' ? {code: testCase} : testCase),
	options: testCase.options ?? [{checkMultiStatementBodies: true}],
}));
const typeAware = (code, filename = 'file.ts') => ({
	code,
	filename,
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts', '*.tsx']}},
	},
});

testRule.snapshot({
	valid: withCheckMultiStatementBodies([
		{
			code: 'function foo() { if (a) { log(); return; } if (b) { log(); return; } }',
			options: [{checkMultiStatementBodies: false}],
		},
		'function foo() { if (a) { log(a); return; } if (b) { log(b); return; } }',
		'function foo() { if (a) { log(); return; } if (b) { log(); log(); return; } }',
		'function foo() { if (a) { log(); return; } if (b) { return; } }',
		'function foo() { if (a) { log(); return; } if (b) { log(); throw error; } }',
		'function foo() { if (a) { log(); return first; } if (b) { log(); return second; } }',
		'function foo() { if (a) { log(); } if (b) { log(); } }',
		'function foo() { if (a) { return; log(); } if (b) { return; log(); } }',
		'function foo() { if (a) { log(); return; } else { log(); } if (b) { log(); return; } }',
		// Statements are compared by source text.
		'function foo() { if (a) { log(value + 1); return; } if (b) { log(value+1); return; } }',
		'function foo() { if (a) { log(); return; } if (b) { log()\nreturn; } }',
		'function foo() { if (a) { log(tag`value`); return; } if (b) { log(tag`value`); return; } }',
		'function foo() { if (a) { log(); /* Log. */ return; } if (b) { log(); return; } }',
		'function foo() { if (a) { log(); return; } if (b) { // Log.\nlog(); return; } }',
		'function foo() { if (a && c) { log(); return; } if (b) { log(); return; } }',
		'function foo() { if (a) { first(); second(); return; } if (b) { second(); first(); return; } }',
		'function foo() { if (a) { log((a)); return; } if (b) { log(a); return; } }',
		'function foo() { if (a) { const first = 1; return; } if (b) { const second = 1; return; } }',
		'function foo() { if (a) { log(); foo(); } if (b) { log(); foo(); } }',
		'function foo() { if (a) { process.exit(1); log(); } if (b) { process.exit(1); log(); } }',
		'function foo(process) { if (a) { log(); process.exit(1); } if (b) { log(); process.exit(1); } }',
		'for (;;) { if (a) { log(); break; } if (b) { log(); continue; } }',
		'outer: for (;;) { inner: for (;;) { if (a) { log(); continue outer; } if (b) { log(); continue inner; } } }',
		'function foo() { if (a) { log(); return; } if (b) { log(); return; } else { log(); } }',
		'function foo() { if (a) { log(); return; } done(); if (b) { log(); return; } }',
		'function foo() { if (a) { log(); return; } { if (b) { log(); return; } } }',
		'function foo() { if (a) { first(); return; } if (b) { second(); return; } if (c) { first(); return; } }',
		'function foo() { if (a) { const handler = () => tag`value`; register(handler); return; } if (b) { const handler = () => tag`value`; register(handler); return; } }',
		'function foo() { if (a) { log(); return; } if (b /* Condition. */) { log(); return; } }',
		// Comments still prevent reporting.
		'function foo() { /* Reason. */ if (a) { log(); return; } if (b) { log(); return; } }',
		// Statements before the exit may depend on each guard's TypeScript narrowing.
		{
			code: outdent`
				function run(value: string | number | undefined) {
					if (value === undefined) {
						log(value);
						return;
					}
					if (typeof value === 'number') {
						log(value);
						return;
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo() { if (a) { log(); return; } if (b) { log(); return; } }',
			languageOptions: {parser: parsers.typescript},
		},
		// With type information, references must have the same type in both bodies.
		typeAware(outdent`
			declare function log(value: unknown): void;
			function run(value: string | number | undefined) {
				if (value === undefined) {
					log(value);
					return;
				}
				if (typeof value === 'number') {
					log(value);
					return;
				}
			}
		`),
		typeAware(outdent`
			type A = {type: 'a'; method(value: string): void};
			type B = {type: 'b'; method(value: number): void};
			function run(subject: A | B) {
				if (subject.type === 'a') {
					subject.method;
					return;
				}
				if (subject.type === 'b') {
					subject.method;
					return;
				}
			}
		`),
		typeAware(outdent`
			declare function log(value: unknown): void;
			function run(options: {value?: string}, other: boolean) {
				if (options.value === undefined) {
					log(options.value);
					return;
				}
				if (other) {
					log(options.value);
					return;
				}
			}
		`),
		typeAware(outdent`
			declare function log(value: unknown): void;
			class Base {
				isSpecial(): this is Special {
					return false;
				}
				run(other: boolean) {
					if (this.isSpecial()) {
						log(this);
						return;
					}
					if (other) {
						log(this);
						return;
					}
				}
			}
			class Special extends Base {
				special = true;
			}
		`),
		typeAware(outdent`
			declare function log(value: unknown): void;
			function run(value: string | undefined, other: boolean) {
				if (other) {
					log(value);
					return;
				}
				if (value === undefined) {
					log(value);
					return;
				}
			}
		`),
		typeAware(outdent`
			declare function length(value: string): number;
			declare function length(value: number): string;
			class Foo {
				#value: string | number = 1;
				run() {
					if (typeof this.#value === 'string') {
						length(this.#value);
						return;
					}
					if (typeof this.#value === 'number') {
						length(this.#value);
						return;
					}
				}
			}
		`),
		typeAware(outdent`
			declare function length(value: string): number;
			declare function length(value: number): string;
			function run(object: {value: string | number}) {
				if (typeof object['value'] === 'string') {
					length(object['value']);
					return;
				}
				if (typeof object['value'] === 'number') {
					length(object['value']);
					return;
				}
			}
		`),
		'function foo() { if (a) { return; } if (b) {} }',
		'function foo() { if (a) {} if (b) { return; } }',
		// JSX tag names can be narrowed.
		typeAware(outdent`
			declare namespace JSX {
				interface Element {}
			}
			declare function render(element: JSX.Element): void;
			declare function A(properties: {value: string}): JSX.Element;
			declare function B(properties: {value: number}): JSX.Element;
			declare const value: any;
			function run(options: {kind: 'a'; Component: typeof A} | {kind: 'b'; Component: typeof B}) {
				if (options.kind === 'a') {
					render(<options.Component value={value} />);
					return;
				}
				if (options.kind === 'b') {
					render(<options.Component value={value} />);
					return;
				}
			}
		`, 'file.tsx'),
		typeAware(outdent`
			declare namespace JSX {
				interface Element {}
			}
			declare function render(element: JSX.Element): void;
			declare function A(properties: {value: string}): JSX.Element;
			declare function B(properties: {value: number}): JSX.Element;
			declare const value: any;
			function run({kind, Component}: {kind: 'a'; Component: typeof A} | {kind: 'b'; Component: typeof B}) {
				if (kind === 'a') {
					render(<Component value={value} />);
					return;
				}
				if (kind === 'b') {
					render(<Component value={value} />);
					return;
				}
			}
		`, 'file.tsx'),
		typeAware(outdent`
			declare function log(value: unknown): void;
			function run(value: string | undefined, other: boolean) {
				if (value === undefined) {
					log(value!);
					return;
				}
				if (other) {
					log(value!);
					return;
				}
			}
		`),
		// Declarations inside the bodies get a new type in each body.
		typeAware(outdent`
			declare function log(value: unknown): void;
			function run(first: boolean, second: boolean) {
				if (first) {
					const options = {value: 1};
					log(options);
					return;
				}
				if (second) {
					const options = {value: 1};
					log(options);
					return;
				}
			}
		`),
	]),
	invalid: withCheckMultiStatementBodies([
		outdent`
			function check(context) {
				if (context.finished) {
					cleanup();
					return;
				}

				if (context.cancelled) {
					cleanup();
					return;
				}

				doSomething();
			}
		`,
		outdent`
			for (const item of items) {
				if (item.hidden) {
					logSkip(item);
					continue;
				}

				if (item.disabled) {
					logSkip(item);
					continue;
				}

				processItem(item);
			}
		`,
		'function foo() { if (a) { const message = format(a); log(message); throw new Error(message); } if (b) { const message = format(a); log(message); throw new Error(message); } }',
		'function foo() { if (a) { if (c) { return first; } return second; } if (b) { if (c) { return first; } return second; } }',
		'function foo() { if (a) { log(); return; } if (b) { log(); return; } if (c) { log(); return; } }',
		'function foo() { if (a) { log(); return; } if (b) { log(); return; } if (c) { return; } if (d) { return; } }',
		'function foo() {\n    if (a) {\n        log();\n        return;\n    }\n    if (b) {\n            log();\n            return;\n    }\n}',
		'function foo() { if (a) { log(); return } if (b) { log(); return }\n[1].forEach(log) }',
		'if (a) { log(); process.exit(1); } if (b) { log(); process.exit(1); }',
		'function foo() { if (a) return; if (b) { return; } }',
		{
			code: 'function foo() { if (a) { log(); return; } if (b && c) { log(); return; } }',
			options: [{checkCompoundConditions: true, checkMultiStatementBodies: true}],
		},
		{
			code: 'function foo() { if (a) { return; } if (b) { return; } }',
			languageOptions: {parser: parsers.typescript},
		},
		'function foo() { if (a) { var value = compute(); return value; } if (b) { var value = compute(); return value; } }',
		'function foo() { if (a) { function helper() {} register(helper); return; } if (b) { function helper() {} register(helper); return; } }',
		'function foo() { if (a) { class Helper {} register(Helper); return; } if (b) { class Helper {} register(Helper); return; } }',
		'function foo() { if (a) { const {x, y: [z]} = value; log(x, z); return; } if (b) { const {x, y: [z]} = value; log(x, z); return; } }',
		'function foo() { if (a) { for (const item of items) { log(item); } return; } if (b) { for (const item of items) { log(item); } return; } }',
		'function foo() { if (a) { try { cleanup(); } catch {} return; } if (b) { try { cleanup(); } catch {} return; } }',
		'function foo() { if (a) { switch (value) { case 1: { log(); break; } } return; } if (b) { switch (value) { case 1: { log(); break; } } return; } }',
		'function foo() { if (a) { const handler = () => { return value; }; register(handler); return; } if (b) { const handler = () => { return value; }; register(handler); return; } }',
		'outer: { if (a) { log(); break outer; } if (b) { log(); break outer; } }',
		'outer: for (;;) { for (;;) { if (a) { log(); continue outer; } if (b) { log(); continue outer; } } }',
		'switch (value) { case 1: if (a) { log(); break; } if (b) { log(); break; } }',
		'class Foo { static { if (a) { this.cleanup(); throw error; } if (b) { this.cleanup(); throw error; } } }',
		'async function foo() { if (await a) { await cleanup(); return; } if (await b) { await cleanup(); return; } }',
		'function* foo() { if (a) { yield value; return; } if (b) { yield value; return; } }',
		'function foo() { if (a) { this.cleanup?.(); return; } if (b) { this.cleanup?.(); return; } }',
		'function foo() { if (a) { log();; return; } if (b) { log();; return; } }',
		'if (a) { log(); process.exit(); } if (b) { log(); process.exit(); }',
		'function foo() { if (value < 0) { log(); return; } if (value instanceof Error) { log(); return; } }',
		'function foo() { if (a) { log({\nvalue,\n}); return; } if (b) { log({\nvalue,\n}); return; } }',
		'function foo() {\r\n\tif (a) {\r\n\t\tlog();\r\n\t\treturn;\r\n\t}\r\n\tif (b) {\r\n\t\tlog();\r\n\t\treturn;\r\n\t}\r\n}',
		'function foo() { if (a) { log(); return; } if (b) { log(); return; } /* Keep trailing comment. */ }',
		'function foo() { if (a) { log(); return } if (b) { log(); return }\n(value || other).run() }',
		{
			code: 'function foo() { if (a) { render(<Spinner />); return; } if (b) { render(<Spinner />); return; } }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'function foo() { if (a ?? b) { log(); return; } if (c ? d : e) { log(); return; } }',
			options: [{checkCompoundConditions: true, checkMultiStatementBodies: true}],
		},
		typeAware(outdent`
			declare function log(value: unknown): void;
			function run(value: string | undefined, other: number) {
				if (value === undefined) {
					log(other);
					return;
				}
				if (other > 1) {
					log(other);
					return;
				}
			}
		`),
		typeAware(outdent`
			declare function cleanup(): void;
			function run(first: boolean, second: boolean) {
				if (first) {
					cleanup();
					return;
				}
				if (second) {
					cleanup();
					return;
				}
			}
		`),
		typeAware(outdent`
			declare function format(value: number): string;
			declare function log(value: string): void;
			function run(items: number[], first: boolean, second: boolean) {
				outer: for (const item of items) {
					if (first) {
						const message: string = format(item);
						log(message);
						continue outer;
					}
					if (second) {
						const message: string = format(item);
						log(message);
						continue outer;
					}
				}
			}
		`),
		typeAware(outdent`
			declare function log(value: unknown): void;
			class Logger {
				value = 1;
				run(first: boolean, second: boolean) {
					if (first) {
						log(this.value);
						return;
					}
					if (second) {
						log(this.value);
						return;
					}
				}
			}
		`),
		typeAware(outdent`
			declare function log(value: unknown): void;
			function run(value: string | number, first: boolean) {
				if (typeof value === 'string') {
					return;
				}
				if (first) {
					log(value);
					return;
				}
				if (value > 1) {
					log(value);
					return;
				}
			}
		`),
		'function foo() { if (a) { using resource = open(); return; } if (b) { using resource = open(); return; } }',
		'async function foo() { if (a) { await using resource = open(); return; } if (b) { await using resource = open(); return; } }',
		'function foo() { if (a) { if (c) { return; } if (d) { return; } return; } if (b) { if (c) { return; } if (d) { return; } return; } }',
		'function foo() { if (a) { log(...values); return; } if (b) { log(...values); return; } }',
		typeAware(outdent`
			declare function log(value: unknown): void;
			function run(value: string | undefined, other: number | undefined, first: boolean) {
				if (value === undefined) {
					log(other!);
					return;
				}
				if (first) {
					log(other!);
					return;
				}
			}
		`),
		typeAware(outdent`
			declare namespace JSX {
				interface Element {}
			}
			declare function render(element: JSX.Element): void;
			declare function Spinner(properties: {size: number}): JSX.Element;
			function run(first: boolean, second: boolean) {
				if (first) {
					render(<Spinner size={1} />);
					return;
				}
				if (second) {
					render(<Spinner size={1} />);
					return;
				}
			}
		`, 'file.tsx'),
	]),
});

const config = {
	plugins: {unicorn: plugin},
	rules: {'unicorn/prefer-combined-guards': 'error'},
};

test('repeated fixes combine all consecutive guards', t => {
	const linter = new Linter();
	const {output, messages} = linter.verifyAndFix('function foo() { if (a) { return; } if (b) { return; } if (c) { return; } }', config);
	t.is(output, 'function foo() { if (a || b || c) { return; } }');
	t.deepEqual(messages, []);
});

test('repeated fixes preserve compound and documented guard boundaries', t => {
	const linter = new Linter();
	const code = outdent`
		function foo() {
			if (a) { return; }
			if (b || c) { return; }
			if (d && e) { return; }
			if (f) { return; }
			// A separate reason.
			if (g) { return; }
			if (h) { return; }
		}
	`;
	const {output, messages} = linter.verifyAndFix(code, config);
	t.is(output, code.replace('if (a) { return; }\n\tif (b || c)', 'if (a || b || c)'));
	t.deepEqual(messages, []);
	t.false(linter.verifyAndFix(output, config).fixed);
});

test('fixes compose with related control-flow rules', t => {
	const linter = new Linter();
	const {output, messages} = linter.verifyAndFix(outdent`
		function foo(a, b) {
			if (a) {
				return false;
			} else if (b) {
				return false;
			}
			return true;
		}
	`, {
		...config,
		rules: {
			...config.rules,
			'unicorn/no-duplicate-if-branches': 'error',
			'unicorn/no-useless-else': 'error',
			'unicorn/prefer-else-if': 'error',
			'unicorn/prefer-boolean-return': 'error',
		},
	});
	t.is(output, 'function foo(a, b) {\n\treturn !(a || b);\n}');
	t.deepEqual(messages, []);
});

test('fixes preserve exit values and evaluation order', t => {
	const linter = new Linter();
	for (const exit of ['return result()', 'throw result()', 'break', 'continue']) {
		for (const first of [false, true]) {
			for (const second of [false, true]) {
				const code = `
					const events = [];
					function condition(name, value) { events.push(name); return value; }
					function result() { events.push('result'); return 42; }
					function run() {
						for (let index = 0; index < 2; index++) {
							if (condition('first', ${first})) { ${exit}; }
							if (condition('second', ${second})) { ${exit}; }
							events.push('body');
						}
						events.push('after');
					}
					try { events.push(run()); } catch (error) { events.push('caught', error); }
					JSON.stringify(events);
				`;
				const {output, messages, fixed} = linter.verifyAndFix(code, config);
				t.true(fixed);
				t.deepEqual(messages, []);
				t.is(runInNewContext(output), runInNewContext(code));
			}
		}
	}
});

test('fixes preserve statements before the exit and evaluation order', t => {
	const linter = new Linter();
	const multiStatementConfig = {
		...config,
		rules: {'unicorn/prefer-combined-guards': ['error', {checkMultiStatementBodies: true}]},
	};
	const bodies = [
		'events.push(\'cleanup\'); events.push(index);',
		'const value = index * 2; events.push(value);',
		'var hoisted = index; events.push(hoisted);',
		'function helper() { return index; } events.push(helper());',
		'for (const item of [1, 2, 3]) { if (item === 2) { break; } events.push(item); }',
		'try { throw index; } catch (error) { events.push(\'caught\', error); } finally { events.push(\'finally\'); }',
		'inner: { if (index === 0) { break inner; } events.push(\'inner\'); }',
	];
	for (const body of bodies) {
		for (const exit of ['return result()', 'throw result()', 'break', 'continue']) {
			for (const first of [false, true]) {
				for (const second of [false, true]) {
					const code = `
						const events = [];
						function condition(name, value) { events.push(name); return value; }
						function result() { events.push('result'); return 42; }
						function run() {
							for (let index = 0; index < 2; index++) {
								if (condition('first', ${first})) { ${body} ${exit}; }
								if (condition('second', ${second})) { ${body} ${exit}; }
								events.push('body');
							}
							events.push('after');
						}
						try { events.push(run()); } catch (error) { events.push('caught', error); }
						JSON.stringify(events);
					`;
					const {output, messages, fixed} = linter.verifyAndFix(code, multiStatementConfig);
					t.true(fixed, body);
					t.deepEqual(messages, []);
					t.is(runInNewContext(output), runInNewContext(code), body);
				}
			}
		}
	}
});
