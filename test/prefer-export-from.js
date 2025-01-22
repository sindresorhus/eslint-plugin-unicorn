import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

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
		outdent`
			import * as namespace from 'foo';
			export default namespace;
			export {namespace};
		`,
		outdent`
			import * as namespace from 'foo';
			export {namespace};
			export default namespace;
		`,
		// String literal specifier
		outdent`
			import {'foo' as foo} from 'foo';
			export default foo;
		`,
		outdent`
			import {'foo' as foo} from 'foo';
			export {foo};
		`,
		outdent`
			import {'foo' as foo} from 'foo';
			export const bar = foo;
		`,
		outdent`
			import {'foo' as foo} from 'foo';
			export {foo as 'foo'};
		`,
		outdent`
			import {'foo' as foo} from 'foo';
			export {foo as "foo"};
		`,
		outdent`
			import {'fo\\u{20}o' as foo} from 'foo';
			export {foo as "fo o"};
		`,
		outdent`
			import {'fo\\no' as foo} from 'foo';
			export {foo as "fo\\u000ao"};
		`,
		outdent`
			import {'default' as foo} from 'foo';
			export {foo};
		`,
		outdent`
			import {'default' as foo} from 'foo';
			export default foo;
		`,
		outdent`
			import {'*' as foo} from 'foo';
			export {foo};
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [
		// #1579
		outdent`
			import {useDispatch as reduxUseDispatch} from 'react-redux'
			type MyDispatchType = Dispatch<MyActions>

			export const useDispatch: () => DispatchAllActions = reduxUseDispatch
		`,
		// #1645
		outdent`
			import React from "react";
			import React from "react";
			export {React}
		`,
		outdent`
			type AceEditor = import("ace-builds").Ace.Editor;
			import AceEditor from "./advanced-editor";
		`,
		outdent`
			type AceEditor = import("ace-builds").Ace.Editor;
			import AceEditor from "./advanced-editor";
			export {AceEditor};
		`,
		outdent`
			import AceEditor from "./advanced-editor";
			type AceEditor = import("ace-builds").Ace.Editor;
			export {AceEditor};
		`,
		'export type { bar, foo } from "foo";',
	],
	invalid: [
		outdent`
			import { foo } from "foo";
			export { foo };
			export type { bar } from "foo";
		`,
		outdent`
			import { foo } from "foo";
			export { foo };
			export { type bar } from "foo";
		`,
		outdent`
			import { foo } from 'foo';
			export { foo };
			export type { bar } from "foo";
			export { baz } from "foo";
		`,
		outdent`
			import { foo } from 'foo';
			export { foo };
			export { type bar } from "foo";
			export { baz } from "foo";
		`,
		outdent`
			import type { foo } from "foo";
			export type { foo };
			export type { bar } from "foo";
		`,
		outdent`
			import { foo } from 'foo';
			export { foo };
			export { baz } from "foo";
			export { type bar } from "foo";
		`,
		outdent`
			import type { foo } from "foo";
			export type { foo };
			export { type bar } from "foo";
		`,
		outdent`
			import type { foo } from 'foo';
			export type { foo };
			export type { bar } from "foo";
			export { baz } from "foo";
		`,
		outdent`
			import type { foo } from 'foo';
			export type { foo };
			export { baz } from "foo";
			export type { bar } from "foo";
		`,
		outdent`
			import type { foo } from 'foo';
			export type { foo };
			export { type bar } from "foo";
			export { baz } from "foo";
		`,
		outdent`
			import type { foo } from 'foo';
			export type { foo };
			export { baz } from "foo";
			export { type bar } from "foo";
		`,
		outdent`
			import { type foo } from 'foo';
			export type { foo };
		`,
		outdent`
			import { foo } from 'foo';
			export type { foo };
		`,
		outdent`
			import type { foo } from 'foo';
			export { type foo };
		`,
		outdent`
			import type foo from "foo";
			export default foo
		`,
		outdent`
			import {type foo} from 'foo';
			export {type foo as bar};
		`,
		outdent`
			import {type foo} from 'foo';
			export {type foo as bar};
			export {type bar} from 'foo';
		`,
		outdent`
			import {type foo as bar} from 'foo';
			export {type bar as baz};
		`,
		outdent`
			import {type foo as foo} from 'foo';
			export {type foo as bar};
		`,
		outdent`
			import {type foo as bar} from 'foo';
			export {type bar as bar};
		`,
		outdent`
			import {type foo as bar} from 'foo';
			export {type bar as foo};
		`,
		outdent`
			import json from './foo.json' assert { type: 'json' };
			export default json;
		`,
		outdent`
			import * as json from './foo.json' assert { type: 'json' };
			export {json};
		`,
		outdent`
			import {foo} from './foo.json' assert { type: 'unknown' };
			export {foo};
			export {bar} from './foo.json';
		`,
		outdent`
			import {foo} from './foo.json';
			export {foo};
			export {bar} from './foo.json' assert { type: 'unknown' };
		`,
	],
});

// `ignoreUsedVariables`
test.snapshot({
	valid: [
		outdent`
			import defaultExport from 'foo';
			use(defaultExport);
			export default defaultExport;
		`,
		outdent`
			import defaultExport from 'foo';
			use(defaultExport);
			export {defaultExport};
		`,
		outdent`
			import {named} from 'foo';
			use(named);
			export {named};
		`,
		outdent`
			import {named} from 'foo';
			use(named);
			export default named;
		`,
		outdent`
			import * as namespace from 'foo';
			use(namespace);
			export {namespace};
		`,
		outdent`
			import * as namespace from 'foo';
			use(namespace);
			export default namespace;
		`,
		outdent`
			import * as namespace from 'foo';
			export {namespace as default};
			export {namespace as named};
		`,
		outdent`
			import * as namespace from 'foo';
			export default namespace;
			export {namespace as named};
		`,
		outdent`
			import defaultExport, {named} from 'foo';
			use(defaultExport);
			export {named};
		`,
		outdent`
			import defaultExport, {named} from 'foo';
			use(named);
			export {defaultExport};
		`,
		outdent`
			import {named1, named2} from 'foo';
			use(named1);
			export {named2};
		`,
		outdent`
			import defaultExport, {named1, named2} from 'foo';
			use(defaultExport);
			export {named1, named2};
		`,
		outdent`
			import defaultExport, {named1, named2} from 'foo';
			use(named1);
			export {defaultExport, named2};
		`,
	].map(code => ({code, options: [{ignoreUsedVariables: true}]})),
	invalid: [
		outdent`
			import defaultExport from 'foo';
			export {defaultExport as default};
			export {defaultExport as named};
		`,
		outdent`
			import {named} from 'foo';
			export {named as default};
			export {named as named};
		`,
		outdent`
			import {named} from 'foo';
			export default named;
			export {named as named};
		`,
		outdent`
			import defaultExport, {named} from 'foo';
			export default defaultExport;
			export {named};
		`,
		outdent`
			import defaultExport, {named} from 'foo';
			export {defaultExport as default, named};
		`,
		outdent`
			import defaultExport from 'foo';
			export const variable = defaultExport;
		`,
		outdent`
			import {notUsedNotExported, exported} from 'foo';
			export {exported};
		`,
	].map(code => ({code, options: [{ignoreUsedVariables: true}]})),
});

