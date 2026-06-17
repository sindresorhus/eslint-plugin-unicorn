import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Imports
test.snapshot({
	valid: [
		'import named from "foo";',
		'import "foo";',
		'import * as named from "foo";',
		'import defaultExport, * as named from "foo";',
		// Regular named imports are not the default
		'import {foo} from "foo";',
		'import {foo as bar} from "foo";',
		// The string literal form is left to `prefer-identifier-import-export-specifiers`
		'import {"default" as named} from "foo";',
		...[
			'import type {default as named} from "foo";',
			'import {type default as named} from "foo";',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		'import {default as named} from "foo";',
		'import {default as named,} from "foo";',
		'import {default as named, bar} from "foo";',
		'import {default as named, bar,} from "foo";',
		// `default as` is not the first named import
		'import {bar, default as named} from "foo";',
		'import {bar, default as named,} from "foo";',
		'import defaultExport, {default as named} from "foo";',
		'import defaultExport, {default as named,} from "foo";',
		'import defaultExport, {default as named, bar} from "foo";',
		'import defaultExport, {default as named, bar,} from "foo";',
		'import defaultExport, {bar, default as named} from "foo";',
		outdent`
			import {
				default as named,
				bar,
			} from "foo";
		`,
		'import{default as named}from"foo";',
		'import {default as named}from"foo";',
		'import{default as named} from"foo";',
		'import{default as named,}from"foo";',
		// Comments outside the removed range keep the autofix
		'import/*comment*/{default as named}from"foo";',
		'import /*comment*/{default as named}from"foo";',
		'import {default as named, /*comment*/bar} from "foo";',
		'import defaultExport/*comment*/, {default as named} from "foo";',
		// Comments inside the removed range disable the autofix
		'import{default as named}/*comment*/from"foo";',
		'import {/*comment*/default as named} from "foo";',
		'import {default/*comment*/as named} from "foo";',
		'import {default as named/*comment*/} from "foo";',
		'import {default as named} /*comment*/from "foo";',
		'import {default/*comment*/as named, bar} from "foo";',
		'import defaultExport,/*comment*/{default as named} from "foo";',
		// Line comments: outside the removed range keeps the autofix and reconstructs validly
		outdent`
			import {
				default as named,
				bar, // keep this
			} from "foo";
		`,
		// Line comment inside the removed range disables the autofix
		outdent`
			import {default as named} // comment
			from "foo";
		`,
		'import defaultExport,{default as named}from "foo";',
		'import defaultExport, {default as named} from "foo" with {type: "json"};',
		'import defaultExport, {default as named} from "foo" with {type: "json"}',
		'import {default as named1, default as named2,} from "foo";',
		{
			code: 'import {type Foo, default as named} from "foo";',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// Exports
test.snapshot({
	valid: [
		'export {foo as default} from "foo";',
		'export * as default from "foo";',
		// Regular named exports are not the default
		'const foo = 1; export {foo};',
		'const foo = 1; export {foo as bar};',
		// The string literal form is left to `prefer-identifier-import-export-specifiers`
		'const foo = 1; export {foo as "default"};',
		...[
			'export type {foo as default};',
			'export {type foo as default};',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		...[
			'export {foo as default};',
			'export {foo as default,};',
			'export {foo as default, bar};',
			'export {foo as default, bar,};',
			'export{foo as default};',
			// `as default` is not the first specifier
			'export {bar, foo as default};',
			// Comment outside the removed range keeps the autofix
			'export {foo as default, /*comment*/bar};',
			// Comments inside the removed range disable the autofix
			'export {foo as default/*comment*/};',
			'export {foo as/*comment*/default, bar};',
			// Line comment outside the removed range keeps the autofix and reconstructs validly
			outdent`
				export {
					foo as default,
					bar, // keep this
				};
			`,
			// Line comment inside the removed range disables the autofix
			outdent`
				export {
					foo as default // comment
				};
			`,
		].map(code => outdent`
			const foo = 1, bar = 2;
			${code}
		`),
		// Invalid, but TypeScript allow
		...[
			'export{foo as default, bar as default};',
			outdent`
				export default foo;
				export {foo as default};
			`,
			outdent`
				export default bar;
				export {foo as default};
			`,
		].map(code => ({
			code,
			languageOptions: {parser: parsers.typescript},
		})),
	],
});
