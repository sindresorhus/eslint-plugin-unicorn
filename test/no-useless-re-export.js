import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			export {foo} from './foo.js';
		`,
		outdent`
			import {foo} from './foo.js';
			export {foo};
		`,
		outdent`
			export * as namespace from './foo.js';
		`,
		outdent`
			import foo from './foo.js';
			export {foo as default};
		`,
		outdent`
			export * from './foo.js';
			export {foo as bar} from './foo.js';
		`,
		outdent`
			export * from './foo.js';
			export {foo as foo} from './foo.js';
		`,
		outdent`
			export * from './foo.js';
			export {default} from './foo.js';
		`,
		outdent`
			export * from './foo.js';
			export const foo = 1;
		`,
		outdent`
			export * from './foo.js';
			export * from './foo.js';
		`,
		outdent`
			import {foo} from './bar.js';
			export * from './foo.js';
			export {foo};
		`,
		outdent`
			import {foo} from './foo.js';
			export * from './foo.js';
			export {foo as bar};
		`,
		outdent`
			export * from './foo.js';
			export * from './bar.js';
			export {foo} from './foo.js';
		`,
		outdent`
			import {foo} from './foo.js';
			export * from './foo.js';
			export * from './bar.js';
			export {foo};
		`,
		outdent`
			import {foo} from './foo.js';
			export * from './foo.js';
			export {foo};
		`,
		outdent`
			import {foo as bar} from './foo.js';
			export * from './foo.js';
			export {bar as foo};
		`,
		outdent`
			export * from './foo.json' with {type: 'json'};
			export {foo} from './foo.json';
		`,
		{
			code: outdent`
				export type * from './foo.js';
				export {foo} from './foo.js';
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				import type {Foo} from './foo.js';
				export * from './foo.js';
				export {type Foo};
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			export * from './foo.js';
			export {foo} from './foo.js';
		`,
		outdent`
			export {foo} from './foo.js';
			export * from './foo.js';
		`,
		{
			code: outdent`
				export * from './foo.js';
				export type {Foo} from './foo.js';
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
});
