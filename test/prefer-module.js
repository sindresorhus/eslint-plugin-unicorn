import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

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
	invalid: [
		// The annotation would have to move to the import clause, which is not valid
		{
			code: 'const foo: Foo = require("foo");',
			errors: [{messageId: 'error/identifier', suggestions: []}],
		},
		{
			code: 'const {foo}: Foo = require("foo");',
			errors: [{messageId: 'error/identifier', suggestions: []}],
		},
	],
});

// JSON modules need the `type: 'json'` import attribute
test({
	valid: [],
	invalid: [
		{
			code: 'const data = require("./a.json");',
			errors: [{messageId: 'error/identifier', suggestions: [{messageId: 'suggestion/import', output: 'import data from "./a.json" with {type: "json"};'}]}],
		},
		{
			code: 'require("./a.json");',
			errors: [{messageId: 'error/identifier', suggestions: [{messageId: 'suggestion/import', output: 'import "./a.json" with {type: "json"};'}]}],
		},
		{
			code: 'const data = (require((\'./a.json\')));',
			errors: [{messageId: 'error/identifier', suggestions: [{messageId: 'suggestion/import', output: 'import data from \'./a.json\' with {type: \'json\'};'}]}],
		},
		// A JSON module only has a default export
		{
			code: 'const {foo} = require("./a.json");',
			errors: [{messageId: 'error/identifier', suggestions: []}],
		},
	],
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

// The named-export suggestion replaces the whole assignment, so a comment anywhere in it would be lost. The default-export path keeps its comments, so only the named path needs the check.
test({
	valid: [],
	invalid: [
		'const foo = 1;\nexports /* note */ .foo = foo;',
		'const foo = 1;\nexports./* c */foo = foo;',
		'const foo = 1;\nexports.foo /* c */ = foo;',
		'const foo = 1;\nmodule.exports /* c */ .foo = foo;',
	].map(code => ({
		code,
		errors: [{messageId: 'error/identifier', suggestions: []}],
	})),
});

test({
	valid: [],
	invalid: [
		['__filename', 'import.meta.filename', 'url.fileURLToPath(import.meta.url)', 'filename'],
		['__dirname', 'import.meta.dirname', 'path.dirname(url.fileURLToPath(import.meta.url))', 'dirname'],
	].flatMap(([name, member, call, kind]) => [
		{
			code: `new ${name}.constructor("text");`,
			languageOptions: {globals: {[name]: 'readonly'}},
			errors: [{
				messageId: 'error/identifier', suggestions: [
					{messageId: `suggestion/import-meta-${kind}`, output: `new ${member}.constructor("text");`},
					{messageId: `suggestion/import-meta-url-to-${kind}`, output: `new (${call}).constructor("text");`},
				],
			}],
		},
		{
			code: `new (${name}).constructor("text");`,
			languageOptions: {globals: {[name]: 'readonly'}},
			errors: [{
				messageId: 'error/identifier', suggestions: [
					{messageId: `suggestion/import-meta-${kind}`, output: `new (${member}).constructor("text");`},
					{messageId: `suggestion/import-meta-url-to-${kind}`, output: `new (${call}).constructor("text");`},
				],
			}],
		},
		{
			code: `new ${name}.constructor("text");`,
			languageOptions: {globals: {[name]: 'readonly'}, parser: parsers.typescript},
			errors: [{
				messageId: 'error/identifier', suggestions: [
					{messageId: `suggestion/import-meta-${kind}`, output: `new (${member}).constructor("text");`},
					{messageId: `suggestion/import-meta-url-to-${kind}`, output: `new (${call}).constructor("text");`},
				],
			}],
		},
		{
			code: `new ${name}!.constructor("text");`,
			languageOptions: {globals: {[name]: 'readonly'}, parser: parsers.typescript},
			errors: [{
				messageId: 'error/identifier', suggestions: [
					{messageId: `suggestion/import-meta-${kind}`, output: `new (${member})!.constructor("text");`},
					{messageId: `suggestion/import-meta-url-to-${kind}`, output: `new (${call})!.constructor("text");`},
				],
			}],
		},
	]),
});

test({
	valid: [],
	invalid: [
		{
			code: 'const file = require(`file`);',
			errors: [{messageId: 'error/identifier', suggestions: [{messageId: 'suggestion/import', output: 'import file from \'file\';'}]}],
		},
		...[
			['require(`file`);', 'import \'file\';'],
			['const file = require(`./file.json`);', 'import file from \'./file.json\' with {type: \'json\'};'],
			['const {foo: bar} = require(`file`);', 'import {foo as bar} from \'file\';'],
			['const file = require(`./it\'s.js`);', String.raw`import file from './it\'s.js';`],
			['const file = require(`./line\nfile.js`);', String.raw`import file from './line\nfile.js';`],
			['const file = require(`./back\\`tick.js`);', 'import file from \'./back`tick.js\';'],
			['const file = require(`./fi\\u006ce`);', 'import file from \'./file\';'],
			['const file = require(/* keep */ (`file`));', 'import file from /* keep */ \'file\';'],
		].map(([code, output]) => ({
			code,
			errors: [{messageId: 'error/identifier', suggestions: [{messageId: 'suggestion/import', output}]}],
		})),
		...[
			'const file = require(`${name}`);', // eslint-disable-line no-template-curly-in-string
			'const file = require(tag`file`);',
		].map(code => ({code, errors: [{messageId: 'error/identifier', suggestions: []}]})),
		{
			code: 'const file: Foo = require(`file`);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'error/identifier', suggestions: []}],
		},
	],
});
