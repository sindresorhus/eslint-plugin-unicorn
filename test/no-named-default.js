import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Imports
test.snapshot({
	valid: [
		'import named from "foo";',
		'import "foo";',
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
		'import defaultExport, {default as named} from "foo";',
		'import defaultExport, {default as named,} from "foo";',
		'import defaultExport, {default as named, bar} from "foo";',
		'import defaultExport, {default as named, bar,} from "foo";',
		'import{default as named}from"foo";',
		'import {default as named}from"foo";',
		'import{default as named} from"foo";',
		'import{default as named,}from"foo";',
		'import/*comment*/{default as named}from"foo";',
		'import /*comment*/{default as named}from"foo";',
		'import{default as named}/*comment*/from"foo";',
		'import defaultExport, {default as named} from "foo" with {type: "json"};',
		'import defaultExport, {default as named} from "foo" with {type: "json"}',
		'import {default as named1, default as named2,} from "foo";',
	],
});

// Exports
test.snapshot({
	valid: [
		'export {foo as default} from "foo";',
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
		].map(code => outdent`
			const foo = 1, bar = 2;
			${code}
		`),
		// Invalid, but typescript allow
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
