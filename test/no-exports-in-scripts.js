import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescriptCode = code => ({
	code,
	languageOptions: {parser: parsers.typescript},
});

test.snapshot({
	valid: [
		'export const foo = 1;',
		'export default foo;',
		'export * from "./foo.js";',
		outdent`
			const foo = 1;
			export {foo};
		`,
		'export {};',
		typescriptCode('export type Foo = string;'),
		typescriptCode('export interface Foo {}'),
		outdent`
			#!/usr/bin/env node
			import process from 'node:process';

			console.log(process.argv);
		`,
		outdent`
			#!/usr/bin/env node
			const foo = 1;
			module.exports = foo;
		`,
		outdent`
			// #!/usr/bin/env node
			export const foo = 1;
		`,
		outdent`
			console.log('#!/usr/bin/env node');
			export const foo = 1;
		`,
	],
	invalid: [
		outdent`
			#!/usr/bin/env node
			export const foo = 1;
		`,
		outdent`
			#!/usr/bin/env node
			export default foo;
		`,
		outdent`
			#!/usr/bin/env node
			export * from './foo.js';
		`,
		outdent`
			#!/usr/bin/env node
			export * as foo from './foo.js';
		`,
		outdent`
			#!/usr/bin/env node
			const foo = 1;
			export {foo};
		`,
		outdent`
			#!/usr/bin/env node
			export {foo} from './foo.js';
		`,
		outdent`
			#!/usr/bin/env node
			export {};
		`,
		outdent`
			#!/usr/bin/env node
			export const foo = 1;
			export const bar = 2;
		`,
		typescriptCode(outdent`
			#!/usr/bin/env node
			export type Foo = string;
		`),
		typescriptCode(outdent`
			#!/usr/bin/env node
			export interface Foo {}
		`),
	],
});
