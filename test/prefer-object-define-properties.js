import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		{
			code: 'Object.defineProperty(object, (0, "a"), {value: 1});\nObject.defineProperty(object, ((0, "b")), {value: 2});',
			output: 'Object.defineProperties(object, {\n\t[(0, "a")]: {value: 1},\n\t[((0, "b"))]: {value: 2},\n});',
			errors: 1,
		},
		{
			code: 'Object.defineProperty(object, "a", (0, {value: 1}));\nObject.defineProperty(object, "b", ((0, {value: 2})));',
			output: 'Object.defineProperties(object, {\n\ta: (0, {value: 1}),\n\tb: ((0, {value: 2})),\n});',
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [
		'Object.defineProperty(foo, "bar", {value: 1});',
		'Object.defineProperty(foo, "bar", {value: 1});\nfoo();\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(foo, "bar", {value: 1});\nObject.defineProperty(bar, "baz", {value: 2});',
		'Object.defineProperty(foo, "bar");\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(foo, "bar", {value: 1}, extra);\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(...foo);\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(foo, ...bar);\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty?.(foo, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object?.defineProperty(foo, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object["defineProperty"](foo, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
		'Reflect.defineProperty(foo, "bar", {value: 1});\nReflect.defineProperty(foo, "baz", {value: 2});',
		'defineProperty(foo, "bar", {value: 1});\ndefineProperty(foo, "baz", {value: 2});',
		'const result = Object.defineProperty(foo, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(foo, "bar", {value: 1});\nconst result = Object.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(getObject(), "bar", {value: 1});\nObject.defineProperty(getObject(), "baz", {value: 2});',
	],
	invalid: [
		'Object.defineProperty(foo, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(foo, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});\nObject.defineProperty(foo, "qux", {value: 3});',
		'Object.defineProperty(this, "bar", {value: 1});\nObject.defineProperty(this, "baz", {value: 2});',
		'Object.defineProperty(Foo.prototype, "bar", {value: 1});\nObject.defineProperty(Foo.prototype, "baz", {value: 2});',
		'Object.defineProperty(foo, "default", {value: 1});\nObject.defineProperty(foo, "not-valid-key", {value: 2});',
		'Object.defineProperty(foo, 1, {value: "one"});\nObject.defineProperty(foo, 2, {value: "two"});',
		'Object.defineProperty(foo, `bar`, {value: 1});\nObject.defineProperty(foo, key, {value: 2});',
		'Object.defineProperty(foo, "__proto__", {value: 1});\nObject.defineProperty(foo, "bar", {value: 2});',
		`if (condition) {
	Object.defineProperty(foo, 'bar', {
		value: 1,
		writable: true,
	});
	Object.defineProperty(foo, 'baz', {
		value: 2,
		writable: true,
	});
}`,
		'Object.defineProperty(foo, "bar", {value: 1});\nObject.defineProperty(foo, "bar", {value: 2});',
		'Object.defineProperty(foo, 1, {value: "number"});\nObject.defineProperty(foo, "1", {value: "string"});',
		'const key = "bar";\nObject.defineProperty(foo, key, {value: 1});\nObject.defineProperty(foo, "bar", {value: 2});',
		'Object.defineProperty(foo, Symbol.iterator, {value: 1});\nObject.defineProperty(foo, Symbol.iterator, {value: 2});',
		'Object.defineProperty(foo, key, {value: 1});\nObject.defineProperty(foo, key, {value: 2});',
		'Object.defineProperty(foo, keys.name, {value: 1});\nObject.defineProperty(foo, keys.name, {value: 2});',
		`const object = {value: 'bar'};
Object.defineProperty(object, 'value', {get() { return 'baz'; }});
Object.defineProperty(foo, object.value, {value: 1});
Object.defineProperty(foo, 'baz', {value: 2});`,
		{
			code: 'Object.defineProperty(foo as Foo, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Object.defineProperty(foo!, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Object.defineProperty(<Foo>foo, "bar", {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
			languageOptions: {parser: parsers.typescript},
		},
		'Object.defineProperty(foo, "bar", {value: 1});\n// comment\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(foo, "bar", /* comment */ {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
	],
});

// The generated properties object follows the file's indentation
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				function run() {
				  Object.defineProperty(foo, 'a', {
				    value: 1,
				  });
				  Object.defineProperty(foo, 'b', {value: 2});
				}
			`,
			output: outdent`
				function run() {
				  Object.defineProperties(foo, {
				    a: {
				      value: 1,
				    },
				    b: {value: 2},
				  });
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				function run() {
				    Object.defineProperty(foo, 'a', {
				        value: 1,
				    });
				    Object.defineProperty(foo, 'b', {value: 2});
				}
			`,
			output: outdent`
				function run() {
				    Object.defineProperties(foo, {
				        a: {
				            value: 1,
				        },
				        b: {value: 2},
				    });
				}
			`,
			errors: 1,
		},
	],
});

// The generated properties object uses the file's line ending
test({
	valid: [],
	invalid: [
		{
			code: 'Object.defineProperty(foo, \'a\', {\r\n\tvalue: 1,\r\n});\r\nObject.defineProperty(foo, \'b\', {value: 2});\r\n',
			output: 'Object.defineProperties(foo, {\r\n\ta: {\r\n\t\tvalue: 1,\r\n\t},\r\n\tb: {value: 2},\r\n});\r\n',
			errors: 1,
		},
	],
});

// A multi-line descriptor keeps nested indentation and blank lines
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				Object.defineProperty(foo, 'a', {
				  get() {
				    return 1;
				  },

				  set(value) {},
				});
				Object.defineProperty(foo, 'b', {value: 2});
			`,
			output: outdent`
				Object.defineProperties(foo, {
				  a: {
				    get() {
				      return 1;
				    },

				    set(value) {},
				  },
				  b: {value: 2},
				});
			`,
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'Object.defineProperty(o, "a", {value: `line1\nline2`});\nObject.defineProperty(o, "b", {value: 2});',
			errors: 1,
		},
		// The `\n` pair is a backslash followed by a line feed, continuing the string onto the next line
		{
			code: 'Object.defineProperty(o, "a", {value: "line1\\\nline2"});\nObject.defineProperty(o, "b", {value: 2});',
			errors: 1,
		},
		{
			code: 'Object.defineProperty(o, "a", {value: 1 /*\nmulti\n*/});\nObject.defineProperty(o, "b", {value: 2});',
			errors: 1,
		},
		{
			code: 'Object.defineProperty(o, "a", {value: `one\ntwo`});\nObject.defineProperty(o, "b", {value: 2});\nObject.defineProperty(o, "c", {value: 3});',
			errors: 1,
		},
	],
});

// The already-ordered forms still merge, these are appended to the snapshot cases above
test.snapshot({
	valid: [],
	invalid: [
		'Object.defineProperty(object, 0, {value: 1});\nObject.defineProperty(object, \'value\', {value: 2});',
		'Object.defineProperty(object, \'value\', {value: 1});\nObject.defineProperty(object, \'other\', {value: 2});',
		'Object.defineProperty(o, \'1\', {value: 1});\nObject.defineProperty(o, 2, {value: 2});\nObject.defineProperty(o, \'a\', {value: 3});\nObject.defineProperty(o, Symbol.iterator, {value: 4});',
		// A dynamic key is assumed not to be an integer key
		'Object.defineProperty(object, key, {value: 1});\nObject.defineProperty(object, \'value\', {value: 2});',
	],
});

// An object literal iterates integer-index keys first, merging would reorder the calls
test({
	valid: [],
	invalid: [
		// A string key before an integer key
		{
			code: 'Object.defineProperty(object, \'value\', {value: 1});\nObject.defineProperty(object, 0, {value: 2});',
			errors: 1,
		},
		// Integer keys out of ascending order
		{
			code: 'Object.defineProperty(object, 1, {value: 1});\nObject.defineProperty(object, 0, {value: 2});',
			errors: 1,
		},
		// A string that is an integer key
		{
			code: 'Object.defineProperty(array, \'length\', {value: 0});\nObject.defineProperty(array, \'0\', {value: 2});',
			errors: 1,
		},
		{
			code: 'Object.defineProperty(array, \'length\', {value: 0});\nObject.defineProperty(array, `0`, {value: 2});',
			errors: 1,
		},
		// A number that is not an integer key sorts after the integer keys
		{
			code: 'Object.defineProperty(object, 1.5, {value: 1});\nObject.defineProperty(object, 2, {value: 2});',
			errors: 1,
		},
		// An object literal iterates symbol keys after string keys
		{
			code: 'Object.defineProperty(object, Symbol.iterator, {value: 1});\nObject.defineProperty(object, \'value\', {value: 2});',
			errors: 1,
		},
		// `Object.defineProperties()` converts every descriptor before it defines any property, so a descriptor that reads the target would see it too early
		{
			code: 'const a = {};\nObject.defineProperty(a, \'x\', {value: 1});\nObject.defineProperty(a, \'y\', {value: a.x});',
			errors: 1,
		},
		{
			code: 'const a = {};\nconst getX = () => a.x;\nObject.defineProperty(a, \'x\', {value: 1});\nObject.defineProperty(a, \'y\', {value: getX()});',
			errors: 1,
		},
		// `await` and `yield` let other code run before `x` is defined
		{
			code: 'async function f(a, promise) {\n\tObject.defineProperty(a, \'x\', {value: 1});\n\tObject.defineProperty(a, \'y\', {value: await promise});\n}',
			errors: 1,
		},
		{
			code: 'function * f(a) {\n\tObject.defineProperty(a, \'x\', {value: 1});\n\tObject.defineProperty(a, \'y\', {value: yield});\n}',
			errors: 1,
		},
		// A computed key is evaluated before any property is defined too
		{
			code: 'Object.defineProperty(a, \'x\', {value: \'z\'});\nObject.defineProperty(a, a.x, {value: 2});',
			errors: 1,
		},
		// A bare read of the target in a descriptor sees it too, not only a member read
		{
			code: 'const a = {};\nObject.defineProperty(a, \'x\', {value: 1, enumerable: true});\nObject.defineProperty(a, \'y\', {value: {...a}});',
			errors: 1,
		},
		// The first key and descriptor run before any property is defined, the same as in the merged call
		{
			code: 'Object.defineProperty(a, a.key(), {value: new Map(a.x)});\nObject.defineProperty(a, \'y\', {value: 1});',
			output: 'Object.defineProperties(a, {\n\t[a.key()]: {value: new Map(a.x)},\n\ty: {value: 1},\n});',
			errors: 1,
		},
		// A property named like the target is not a read of it
		{
			code: 'const value = {};\nObject.defineProperty(value, \'a\', {value: 1});\nObject.defineProperty(value, \'b\', {value: 2, writable: true});',
			output: 'const value = {};\nObject.defineProperties(value, {\n\ta: {value: 1},\n\tb: {value: 2, writable: true},\n});',
			errors: 1,
		},
		{
			code: 'const exports = {};\nObject.defineProperty(exports, \'a\', {value: 1});\nObject.defineProperty(exports, \'b\', {value: module.exports});',
			output: 'const exports = {};\nObject.defineProperties(exports, {\n\ta: {value: 1},\n\tb: {value: module.exports},\n});',
			errors: 1,
		},
		// A bare read of a member-expression or `this` target sees it too
		{
			code: 'Object.defineProperty(foo.bar, \'x\', {value: 1});\nObject.defineProperty(foo.bar, \'y\', {value: {...foo.bar}});',
			errors: 1,
		},
		{
			code: 'Object.defineProperty(this, \'x\', {value: 1});\nObject.defineProperty(this, \'y\', {value: {...this}});',
			errors: 1,
		},
		{
			code: 'Object.defineProperty(a, \'x\', {value: 1});\nObject.defineProperty(a, \'y\', {value: (a as any).x});',
			errors: 1,
			languageOptions: {parser: parsers.typescript},
		},
		// A static class field runs when the class is created
		{
			code: 'Object.defineProperty(a, \'x\', {value: 1});\nObject.defineProperty(a, \'y\', {value: class { static z = a.x; }});',
			errors: 1,
		},
		// A different member of the same object is not the target
		{
			code: 'Object.defineProperty(foo.bar, \'x\', {value: 1});\nObject.defineProperty(foo.bar, \'y\', {value: foo.baz});',
			output: 'Object.defineProperties(foo.bar, {\n\tx: {value: 1},\n\ty: {value: foo.baz},\n});',
			errors: 1,
		},
		// Function bodies run later, so reading the target there is fine
		{
			code: 'Object.defineProperty(a, \'x\', {value: 1});\nObject.defineProperty(a, \'y\', {get() { return a.x; }});',
			output: 'Object.defineProperties(a, {\n\tx: {value: 1},\n\ty: {get() { return a.x; }},\n});',
			errors: 1,
		},
		{
			code: 'Object.defineProperty(a, \'x\', {value: 1});\nObject.defineProperty(a, \'y\', {value: class { z() { return a.x; } }});',
			output: 'Object.defineProperties(a, {\n\tx: {value: 1},\n\ty: {value: class { z() { return a.x; } }},\n});',
			errors: 1,
		},
	],
});
