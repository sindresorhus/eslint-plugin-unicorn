import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'import "foo";',
		'import {} from "foo";',
		'import * as namespace from "foo";',
		'import defaultExport from "foo";',
		'import {named} from "foo";',
		outdent`
			const named = import(foo);
			export {named};
		`,
		'export * from "foo";',
		'export {default} from "foo";',
		'export {named} from "foo";',
		outdent`
			const defaultExport = require('foo');
			export default defaultExport;
		`,

		// Variable is not `const`
		outdent`
			import defaultExport from 'foo';
			export var variable = defaultExport;
		`,
		outdent`
			import defaultExport from 'foo';
			export let variable = defaultExport;
		`,

		// Exported variable is reused
		outdent`
			import defaultExport from 'foo';
			export const variable = defaultExport;
			use(variable);
		`,
		outdent`
			import defaultExport from 'foo';
			export let variable = defaultExport;
			variable = 1;
		`,
		// Export namespace as default
		outdent`
			import * as namespace from 'foo';
			export default namespace;
		`,
		outdent`
			import * as namespace from 'foo';
			export {namespace as default};
		`,
		// Cases we are not handled
		outdent`
			import defaultExport from 'foo';
			const variable = defaultExport;
			export {variable}
		`,
		outdent`
			import defaultExport from 'foo';
			export const {variable} = {variable: defaultExport};
		`,
	],
	invalid: [
		// `default`
		outdent`
			import defaultExport from 'foo';
			export default defaultExport;
		`,
		outdent`
			import defaultExport from 'foo';
			export {defaultExport as default};
		`,
		outdent`
			import defaultExport from 'foo';
			export {defaultExport as named};
		`,
		outdent`
			import defaultExport from 'foo';
			export const variable = defaultExport;
		`,
		outdent`
			import {default as defaultExport} from 'foo';
			export default defaultExport;
		`,
		outdent`
			import {default as defaultExport} from 'foo';
			export {defaultExport as default};
		`,
		outdent`
			import {default as defaultExport} from 'foo';
			export {defaultExport as named};
		`,
		outdent`
			import defaultExport from 'foo';
			export const variable = defaultExport;
		`,
		outdent`
			import defaultExport from 'foo';
			defaultExport.bar = 1;
			export {defaultExport as named};
			export {defaultExport as default};
			export const variable = defaultExport;
		`,
		// `named`
		outdent`
			import {named} from 'foo';
			export default named;
		`,
		outdent`
			import {named} from 'foo';
			export {named as default};
		`,
		outdent`
			import {named} from 'foo';
			export {named as named};
		`,
		outdent`
			import {named} from 'foo';
			export {named as renamed};
		`,
		outdent`
			import {named} from 'foo';
			export const variable = named;
		`,
		outdent`
			import {named} from 'foo';
			named.bar = 1;
			export {named as named};
			export {named as default};
			export const variable = named;
		`,
		// Namespace
		outdent`
			import * as namespace from 'foo';
			export {namespace as namespace};
		`,
		outdent`
			import * as namespace from 'foo';
			export {namespace as renamed};
		`,
		outdent`
			import * as namespace from 'foo';
			export const variable = namespace;
		`,
		outdent`
			import * as namespace from 'foo';
			namespace.bar = 1;
			export {namespace as named};
			export {namespace as default};
			export const variable = namespace;
		`,
		// Some not exported
		outdent`
			import {named1, named2} from 'foo';
			export {named1};
		`,
		outdent`
			import defaultExport, {named} from 'foo';
			export {defaultExport};
		`,
		outdent`
			import defaultExport, {named} from 'foo';
			export {named};
		`,
		outdent`
			import defaultExport, * as namespace from 'foo';
			export {defaultExport};
		`,
		// Existing export
		outdent`
			import * as foo from 'foo';
			export {foo};
			export * as bar from 'foo';
		`,
		outdent`
			import * as foo from 'foo';
			export {foo};
			export {bar} from 'foo';
		`,
		outdent`
			import * as foo from 'foo';
			export {foo};
			export {} from 'foo';
		`,
		outdent`
			import * as foo from 'foo';
			export {foo};
			export * from 'foo';
		`,
		outdent`
			import foo from 'foo';
			export {foo};
			export * as bar from 'foo';
		`,
		outdent`
			import foo from 'foo';
			export {foo};
			export {bar} from 'foo';
		`,
		outdent`
			import foo from 'foo';
			export {foo};
			export {bar,} from 'foo';
		`,
		outdent`
			import foo from 'foo';
			export {foo};
			export {} from 'foo';
		`,
		outdent`
			import foo from 'foo';
			export {foo};
			export * from 'foo';
		`,
		// Multiple
		outdent`
			import {named1, named2} from 'foo';
			export {named1, named2};
		`,
		outdent`
			import {named} from 'foo';
			export {named as default, named};
		`,
		outdent`
			import {named, named as renamed} from 'foo';
			export {named, renamed};
		`,
		outdent`
			import defaultExport, {named1, named2} from 'foo';
			export {named1 as default};
			export {named2};
			export {defaultExport};
		`,
		outdent`
			import * as foo from 'foo';
			import * as bar from 'foo';
			export {foo, bar};
		`,
		outdent`
			import * as foo from 'foo';
			export {foo, foo as bar};
		`,
		outdent`
			import defaultExport from 'foo';
			export * from 'foo';
			export default defaultExport;
		`,
		outdent`
			import defaultExport from 'foo';
			export {named} from 'foo';
			export * from 'foo';
			export default defaultExport;
		`,
		outdent`
			import defaultExport from './foo.js';
			export {named} from './foo.js';
			export default defaultExport;
		`,
		outdent`
			import defaultExport from './foo.js';
			export {named} from './foo.js?query';
			export default defaultExport;
		`,
	],
});

// Strange case
// TODO: confirm how should this work
test.snapshot({
	valid: [
		outdent`
			import * as namespace from 'foo';
			export default namespace;
			export {namespace};
		`,
	],
	invalid: [
		outdent`
			import * as namespace from 'foo';
			export {namespace};
			export default namespace;
		`,
	],
});
