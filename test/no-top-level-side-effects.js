import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// Helper: wrap code so it has an export (rule only fires in files with exports)
const withExport = code => `${code}\nexport {};`;

test.snapshot({
	valid: [
		// Files with no exports are ignored
		'foo();',
		'foo();\nbar();',

		// Files with hashbang are ignored (CLI scripts)
		'#!/usr/bin/env node\nfoo();\nexport {};',

		// Assignments are allowed
		withExport('const x = 5;'),
		withExport('let y = foo();'),
		withExport('const obj = createConfig();'),
		withExport('x = 5;'),
		withExport('x.foo = bar();'),
		withExport('obj.method = () => {};'),

		// Declarations are allowed
		withExport('function foo() {}'),
		withExport('class Foo {}'),
		withExport('import foo from "bar";'),

		// "use strict" directive is allowed
		outdent`
			"use strict";
			export {};
		`,

		// Pure annotations suppress the error
		withExport('/* @__PURE__ */ foo();'),
		withExport('/* #__PURE__ */ foo();'),
		withExport('/* @__NO_SIDE_EFFECTS__ */ foo();'),
		withExport('/* #__NO_SIDE_EFFECTS__ */ foo();'),

		// export default with pure annotation
		'export default /* @__PURE__ */ foo();',
		'export default /* #__PURE__ */ bar();',

		// export default non-call (allowed)
		'export default 42;',
		'export default class Foo {}',
		'export default function foo() {}',
		'export default {};',
		'export default [];',

		// export const (named export with assignment — allowed)
		outdent`
			export const x = foo();
			export const y = 5;
		`,
	],
	invalid: [
		// Bare function calls
		withExport('foo();'),
		withExport('foo.bar();'),
		withExport('new Foo();'),

		// void wrapper bypass
		withExport('void foo();'),

		// Logical expression bypass
		withExport('condition && foo();'),
		withExport('condition || foo();'),
		withExport('condition ?? foo();'),

		// Sequence expression bypass
		withExport('foo(), bar();'),

		// export default call expression
		'export default foo();',
		'export default await foo();',
		'export default foo.bar();',

		// Top-level if statement
		withExport(outdent`
			if (condition) {
				foo();
			}
		`),

		// Top-level for loop
		withExport(outdent`
			for (const item of items) {
				process(item);
			}
		`),

		// Top-level try/catch
		withExport(outdent`
			try {
				foo();
			} catch {}
		`),

		// Multiple calls in a file
		outdent`
			foo();
			bar();
			export {};
		`,
	],
});
