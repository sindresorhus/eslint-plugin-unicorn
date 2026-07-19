import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'import "foo";',
		'import {} from "foo";',
		'import {} from "foo"; export {bar} from "bar";',
		'import {foo} from "foo"; export const bar = foo;',
		'export {};',
		'export {} from "foo";',
		'const foo = 1; export {foo};',
		'export {foo} from "foo"; const bar = 1;',
		'export const foo = 1;',
		'export default foo;',
		'export default function foo() {}',
		'import "foo"; export {bar} from "bar";',
		outdent`
			import {foo} from './foo.js';
			const bar = foo;
			export {bar};
		`,
	],
	invalid: [
		'export {foo} from "foo";',
		'export * from "foo";',
		'export * as namespace from "foo";',
		'export {}; export {foo} from "foo";',
		'import {foo} from "foo"; export {foo};',
		'import {foo as bar} from "foo"; export {bar};',
		'import foo from "foo"; export default foo;',
		'export default foo; import foo from "foo";',
		'import * as namespace from "foo"; export {namespace as default};',
		outdent`
			import {foo} from './foo.js';
			export {foo};
			export {bar} from './bar.js';
		`,
		outdent`
			// This is still a barrel file.
			export {};
			export {foo} from './foo.js';
			export {bar} from './bar.js';
		`,
		{
			code: 'export type {Foo} from "foo";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'export type * from "foo";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				import type {Foo} from './foo.js';
				export type {Foo};
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
});
