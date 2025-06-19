import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescriptCode = code => ({
	code,
	languageOptions: {parser: parsers.typescript},
});

// `import`
test.snapshot({
	valid: [
		'import "foo"',
		'import foo from "foo"',
		'import * as foo from "foo"',
		'import {foo} from "foo"',
		'import foo,{bar} from "foo"',
		typescriptCode('import type foo from "foo"'),
		typescriptCode('import * as foo from "foo"'),
		typescriptCode('import type foo,{bar} from "foo"'),
		typescriptCode('import foo,{type bar} from "foo"'),
	],
	invalid: [
		'import {} from "foo";',
		'import{}from"foo";',
		outdent`
			import {
			} from "foo";
		`,
		'import foo, {} from "foo";',
		'import foo,{}from "foo";',
		outdent`
			import foo, {
			} from "foo";
		`,
		'import foo,{}/* comment */from "foo";',
		typescriptCode('import type {} from "foo";'),
		typescriptCode('import type{}from"foo";'),
		typescriptCode('import type foo, {} from "foo";'),
		typescriptCode('import type foo,{}from "foo";'),
	],
});

// `export`
test.snapshot({
	valid: [
		outdent`
			const foo = 1;
			export {foo};
		`,
		'export {foo} from "foo"',
		'export * as foo from "foo"',
		typescriptCode('export type {Foo}'),
		typescriptCode('export type {foo} from "foo"'),
		typescriptCode('export type * as foo from "foo"'),
		'export const foo = 1',
		'export function foo() {}',
		typescriptCode('export type foo = Foo'),
		'export const {} = foo',
		'export const [] = foo',
	],
	invalid: [
		'export {}',
		typescriptCode('export type{}'),
		typescriptCode('export type {} from "foo";'),
		typescriptCode('declare export type {} from "foo";'),
		'export {} from "foo";',
		'export{}from"foo";',
		outdent`
			export {
			} from "foo";
		`,
		'export {} from "foo" with {type: "json"};',
	],
});
