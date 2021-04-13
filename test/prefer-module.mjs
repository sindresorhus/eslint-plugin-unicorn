import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// Strict mode
test.snapshot({
	valid: [
		'const foo = "use strict";',
		'("use strict")',
		'"use strong";',
		'eval("\'use strict\'; var x = 42; x;");',
		'new Function("\'use strict\'; var x = 42; return x;");'
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
		`
	]
});

// Global return
test({
	valid: [
		outdent`
			function a() {
				return;
			}
		`
	],
	invalid: [
		{
			code: outdent`
				if (foo) {
					return;
				}
			`,
			output: outdent`
				if (foo) {
					return;
				}
			`,
			errors: 1,
			parserOptions: {
				sourceType: 'script',
				ecmaFeatures: {
					globalReturn: true
				}
			}
		}
	]
});

// `__dirname` and `__filename`
test.snapshot({
	testerOptions: {
		globals: {
			__dirname: true,
			__filename: true
		}
	},
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
		'const foo = 1;export {foo as __dirname}'
	],
	invalid: [
		'const dirname = __dirname;',
		'const dirname = __filename;',
		'const foo = { __dirname};',
		'const foo = {__filename, };',
		'if (__dirname.startsWith("/project/src/")) {}',
		'if (__filename.endsWith(".js")) {}'
	]
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
		`
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
		'const foo = require("foo"), bar = require("bar");'
	]
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
		'const module = 1;'
	],
	invalid: [
		'exports = foo;',
		'module.exports = foo;',
		'(( ((exports)) = ((foo)) ));',
		'(( ((module.exports)) = ((foo)) ));',
		'exports.foo = foo;',
		'module.exports.foo = foo;',
		'exports["foo"] = foo;',
		'module.exports["foo"] = foo;',
		'const foo = exports;',
		'const foo = exports.foo;',
		'const foo = module.exports;',
		'const foo = module.exports.foo;',
		'module["exports"] = foo;',
		'module[exports] = foo;',
		'module.exports.foo.bar = foo;',
		'exports.default = foo;',
		'module.exports.default = foo;',
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
		`
	]
});
