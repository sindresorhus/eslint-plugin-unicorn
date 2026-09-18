import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
