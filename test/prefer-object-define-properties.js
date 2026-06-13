import {getTester} from './utils/test.js';

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
		'Object.defineProperty(foo, Symbol.iterator, {value: 1});\nObject.defineProperty(foo, Symbol.iterator, {value: 2});',
		'Object.defineProperty(foo, "bar", {value: 1});\n// comment\nObject.defineProperty(foo, "baz", {value: 2});',
		'Object.defineProperty(foo, "bar", /* comment */ {value: 1});\nObject.defineProperty(foo, "baz", {value: 2});',
	],
});
