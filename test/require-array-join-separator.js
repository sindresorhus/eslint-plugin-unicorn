import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: Set<number>) { foo.join(); }',
			languageOptions: {parser: parsers.typescript},
		},
		'foo.join(",")',
		'join()',
		'foo.join(...[])',
		'foo.join?.()',
		'foo?.join?.()',
		'foo[join]()',
		'foo["join"]()',
		'[].join.call(foo, ",")',
		'[].join.call()',
		'[].join.call(...[foo])',
		'[].join?.call(foo)',
		'[]?.join.call(foo)',
		'[].join[call](foo)',
		'[][join].call(foo)',
		'[,].join.call(foo)',
		'[].join.notCall(foo)',
		'[].notJoin.call(foo)',
		'Array.prototype.join.call(foo, "")',
		'Array.prototype.join.call()',
		'Array.prototype.join.call(...[foo])',
		'Array.prototype.join?.call(foo)',
		'Array.prototype?.join.call(foo)',
		'Array?.prototype.join.call(foo)',
		'Array.prototype.join[call](foo, "")',
		'Array.prototype[join].call(foo)',
		'Array[prototype].join.call(foo)',
		'Array.prototype.join.notCall(foo)',
		'Array.prototype.notJoin.call(foo)',
		'Array.notPrototype.join.call(foo)',
		'NotArray.prototype.join.call(foo)',
		'path.join(__dirname, "./foo.js")',
	],
	invalid: [
		'foo.join()',
		// The `[].join.call(foo)` form is reported even for a known non-array receiver; the guard only applies to `foo.join()`
		{
			code: 'function f(foo: Set<number>) { [].join.call(foo); }',
			languageOptions: {parser: parsers.typescript},
		},
		'[].join.call(foo)',
		'[].join.call(foo,)',
		'[].join.call(foo , );',
		'Array.prototype.join.call(foo)',
		'Array.prototype.join.call(foo, )',
		outdent`
			(
				/**/
				[
					/**/
				]
					/**/
					.
					/**/
					join
					/**/
					.
					/**/
					call
					/**/
					(
						/**/
						(
							/**/
							foo
							/**/
						)
						/**/
						,
						/**/
					)/**/
			)
		`,
		'foo?.join()',
		// A typed array shares `Array#join()` and its comma default
		{
			code: 'function f(foo: Int8Array) { foo.join(); }',
			languageOptions: {parser: parsers.typescript},
		},
		// The same receiver spelled as a constructor call must agree with the annotation above
		'const foo = new Int8Array(); foo.join();',
	],
});
