import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// Strict mode
test.snapshot({
	valid: [
		'const foo = "use strict";',
		'("use strict")',
		'"use strong";',
		'eval("\'use strict\'; var x = 42; x;");',
		'new Function("\'use strict\'; var x = 42; return x;");',
	],
	invalid: [
		outdent`
			'use strict';

			console.log(1);
		`,
		outdent`
			"use strict";

			console.log(1);
		`,
		outdent`
			function foo () {
				"use strict";
				console.log(1);
			}
		`,
		{
			code: outdent`
				'use strict';

				console.log(1);
			`,
			filename: 'example.mjs',
		},
	],
});

// Global return
test({
	valid: [
		outdent`
			function a() {
				return;
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				if (foo) {
					return;
				}
			`,
			errors: 1,
			languageOptions: {
				sourceType: 'script',
				parserOptions: {
					ecmaFeatures: {
						globalReturn: true,
					},
				},
			},
		},
	],
});

// `__dirname` and `__filename`
test.snapshot({
	valid: [
		outdent`
			const __filename = 1;
			const foo = __filename;
		`,
		outdent`
			const __dirname = 1;
			const foo = __dirname;
		`,
		'import {__filename as filename} from "foo.mjs"',
		'const foo = 1;export {foo as __dirname}',
	],
	invalid: [
		'const dirname = __dirname;',
		'const dirname = __filename;',
		'const foo = { __dirname};',
		'const foo = {__filename, };',
		'if (__dirname.startsWith("/project/src/")) {}',
		'if (__filename.endsWith(".js")) {}',
	],
});

// `require(…)`
test.snapshot({
	valid: [
		outdent`
			import {createRequire} from 'module';
			const require = createRequire(import.meta.url);
			const foo = require("foo");
		`,
		outdent`
			const require = function require(require, id) {
				return require(id);
			}
		`,
		outdent`
			const require = class A {
				require(require) {
					return require(id);
				}
			}
		`,
	],
	invalid: [
		'require("foo");',
		'require(\'foo\');',
		'require( (("foo")) );',
		'((require))("foo");',
		'(( require("foo") ));',
		'const foo=require("foo");',
		'const foo = require.resolve("foo");',
		outdent`
			const foo
				=
				require("foo");
		`,
		'const foo = require("foo");',
		'const foo = require( (("foo")) );',
		'const foo = ((require))("foo");',
		'const foo = (( require("foo") ));',
		'const {foo}=require("foo");',
		outdent`
			const {foo}
				=
				require("foo");
		`,
		'const {foo} = require("foo");',
		'const {foo} = require( (("foo")) );',
		'const {foo} = ((require))("foo");',
		'const {foo} = (( require("foo") ));',
		'const {foo} = (( require("foo") ));',
		'const {foo: foo}=require("foo");',
		outdent`
			const {foo: foo}
				=
				require("foo");
		`,
		'const {foo: foo} = require("foo");',
		'const {foo: foo} = require( (("foo")) );',
		'const {foo: foo} = ((require))("foo");',
		'const {foo: foo} = (( require("foo") ));',
		'const {foo: foo} = (( require("foo") ));',
		'const {foo:bar}=require("foo");',
		outdent`
			const {foo:bar}
				=
				require("foo");
		`,
		'const {foo:bar} = require("foo");',
		'const {foo:bar} = require( (("foo")) );',
		'const {foo:bar} = ((require))("foo");',
		'const {foo:bar} = (( require("foo") ));',
		'const {foo:bar} = (( require("foo") ));',
		'const {a   :foo, b:   bar, default   :   baz}=require("foo");',
		outdent`
			const {
				a   :foo,
				b:   bar,
				default   :   baz,
			}
				=
				require("foo");
		`,
		'const {a   :foo, b:   bar, default   :   baz} = require("foo");',
		'const {a   :foo, b:   bar, default   :   baz} = require( (("foo")) );',
		'const {a   :foo, b:   bar, default   :   baz} = ((require))("foo");',
		'const {a   :foo, b:   bar, default   :   baz} = (( require("foo") ));',
		'const {a   :foo, b:   bar, default   :   baz} = (( require("foo") ));',
		'const {} = require("foo");',
		'const{   }=require("foo");',
		// Not fixable
		outdent`
			const r = require;
			const foo = r("foo");
		`,
		'new require("foo")',
		'require("foo", extraArgument)',
		'const a = require()',
		'require(..."foo")',
		'require("../" + "file.js")',
		'require(file)',
		'a = require("foo")',
		'function a(a = require("foo")) {}',
		'let foo = require("foo");',
		'const foo = require("foo"), bar = require("bar");',
		'const {[foo]: foo} = require("foo");',
		'const {["foo"]: foo} = require("foo");',
		'if (foo) require("foo");',
		'const foo = require`foo`;',
		outdent`
			function loadModule() {
				return require("foo");
			}
		`,
		outdent`
			function loadModule() {
				const foo = require("foo");
				return foo;
			}
		`,
		'const foo = require("foo"), bar = 1;',
		'const foo = require("foo"), bar = require("bar");',
	],
});

// `exports` and `module`
test.snapshot({
	valid: [
		'function exports(exports) {}',
		'function module(module) {}',
		outdent`
			const exports = foo;
			exports.bar = bar;
		`,
		'const exports = 1;',
		outdent`
			const module = foo;
			module.exports = bar;
			module.exports.bar = bar;
		`,
		'const module = 1;',
	],
	invalid: [
		'exports = foo;',
		'module.exports = foo;',
		'(( ((exports)) = ((foo)) ));',
		'(( ((module.exports)) = ((foo)) ));',
		'const foo = 1;exports.foo = foo;',
		'const foo = 1;module.exports.foo = foo;',
		'exports["foo"] = foo;',
		'module.exports["foo"] = foo;',
		'const foo = exports;',
		'const foo = exports.foo;',
		'const foo = module.exports;',
		'const foo = module.exports.foo;',
		'module["exports"] = foo;',
		'module[exports] = foo;',
		'module.exports.foo.bar = foo;',
		'const foo = 1;exports.default = foo;',
		'const foo = 1;module.exports.default = foo;',
		'exports.foo.bar = foo;',
		'exports = 1;',
		'exports.foo = [];',
		'module.exports = function() {};',
		'module.exports.foo = foo || bar;',
		'exports += foo;',
		'const foo = module.children',
		'const parentModule = module.parent',
		outdent`
			function foo() {
				exports.foo = foo;
				module.exports.foo = foo;
			}
		`,
	],
});

test.typescript({
	valid: [
		'type module = number[];',
		'type ModuleRegistry = { [module: string]: string };',
		'const module = 1; type ModuleRegistry = { [module: string]: string };',
		'type module = number[]; type ModuleRegistry = { [module: string]: string };',
		'type Data = { [module in keyof string]: number; };',
		'type ModuleRegistry = { [exports: string]: string };',
	],
	invalid: [],
});

// `.cjs` file
test.snapshot({
	valid: [
		{
			code: '__dirname',
			filename: 'foo.cjs',
		},
		{
			code: '__dirname',
			filename: 'foo.cjS',
		},
	],
	invalid: [
		{
			code: '__filename',
			filename: 'foo.mjs',
		},
		{
			code: 'require("lodash")',
			filename: 'foo.js',
		},
		{
			code: 'require("lodash")',
			filename: 'foo.cjs/foo.js',
		},
	],
});

// `import.meta.dirname` and `import.meta.filename`
test.snapshot({
	valid: [
		'const __dirname = import.meta.dirname;',
		'const __filename = import.meta.filename;',
		outdent`
			import path from "path";
			const dirUrl = path.dirname(import.meta.url);
		`,
		'const url = import.meta.url;',
		'const dirname = new URL(".", import.meta.url).pathname;',
		'const filename = new URL(import.meta.url).pathname;',
	],
	invalid: [
		outdent`
			import path from "path";
			import { fileURLToPath } from "url";
			const dirname1 = path.dirname(fileURLToPath(import.meta.url));
			const dirname2 = path.dirname(import.meta.filename);
			const dirname3 = path.dirname(new URL(import.meta.url).pathname);
			const dirname4 = fileURLToPath(new URL(".", import.meta.url));
		`,
		outdent`
			import { fileURLToPath } from "url";
			const filename1 = fileURLToPath(import.meta.url);
			const filename2 = fileURLToPath(new URL(import.meta.url));
		`,
		outdent`
			import path from "node:path";
			import { fileURLToPath } from "node:url";
			const dirname = path.dirname(fileURLToPath(import.meta.url));
		`,
		outdent`
			import { fileURLToPath } from "node:url";
			const filename = fileURLToPath(import.meta.url);
		`,
		outdent`
			import * as path from "node:path";
			import url from "node:url";
			const dirname = path.dirname(url.fileURLToPath(import.meta.url));
		`,
		outdent`
			import url from "node:url";
			const filename = url.fileURLToPath(import.meta.url);
		`,
		outdent`
			import path from "node:path";
			import { fileURLToPath } from "node:url";
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);
		`,
		outdent`
			import path from "node:path";
			const __filename = new URL(import.meta.url).pathname;
			const __dirname = path.dirname(__filename);
		`,
		outdent`
			import path from "node:path";
			const __filename = import.meta.filename;
			const __dirname = path.dirname(__filename);
		`,
	],
});
