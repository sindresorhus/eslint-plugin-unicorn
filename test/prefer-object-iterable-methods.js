import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

test.snapshot({
	valid: [
		'for (const key of Object.keys(object)) {\n\tfoo(key);\n}',
		'for (const value of Object.values(object)) {\n\tfoo(value);\n}',
		'for (const [key, value] of Object.entries(object)) {\n\tfoo(key, value);\n}',
		'Object.keys(object).map(key => key);',
		'Object.values(object).map(value => foo(value));',
		'Object.entries(object).map(([key, value]) => foo(key, value));',
		'for (const key of Object.keys(object)) {\n\tobject[key] = value;\n}',
		'for (const key of Object.keys(object)) {\n\tdelete object[key];\n}',
		'for (const key of Object.keys(object)) {\n\tobject[key]++;\n}',
		'Object.keys(object).map(key => {\n\tobject[key] = value;\n});',
		'for (const key of Object.keys(object)) {\n\tobject[key]();\n}',
		'for (const key of Object.keys(object)) {\n\t[object[key]] = values;\n}',
		'for (const key of Object.keys(object)) {\n\t({foo: object[key]} = source);\n}',
		'for (const key of Object.keys(object)) {\n\tobject.other = value;\n\tfoo(object[key]);\n}',
		'for (const key of Object.keys(object)) {\n\t{\n\t\tconst object = otherObject;\n\t\tfoo(object[key]);\n\t}\n}',
		'for (const key of Object.keys(object)) {\n\tfoo(otherObject[key]);\n}',
		'Object.keys(object).map(key => foo(otherObject[key]));',
		'for (const key of Object.keys(...objects)) {\n\tfoo(object[key]);\n}',
		'for (const key of Object?.keys(object)) {\n\tfoo(object[key]);\n}',
		'for (const key of Object.keys?.(object)) {\n\tfoo(object[key]);\n}',
		'for (const key of Object["keys"](object)) {\n\tfoo(object[key]);\n}',
		'for (key of Object.keys(object)) {\n\tfoo(object[key]);\n}',
		'for (const {key} of Object.keys(object)) {\n\tfoo(object[key]);\n}',
		'Object.keys(object).map((key, index) => foo(object[key], index));',
		'Object.keys(object).map((key = "default") => foo(object[key]));',
		'Object.keys(object).map((...keys) => foo(object[keys[0]]));',
		'const readers = Object.keys(object).map(key => () => object[key]);',
		'Object.keys(collection[name]).map(key => {\n\tconst name = "other";\n\treturn collection[name][key];\n});',
		'Object.keys(object).forEach(key => foo(object[key]));',
		'Object.keys(object).reduce((result, key) => ({...result, [key]: object[key]}), {});',
		// `Object.keys().flatMap` is out of scope (only `Object.keys().map` is handled)
		'Object.keys(object).flatMap(key => [object[key]]);',
		// Async callback is not converted
		'Object.keys(object).map(async key => foo(object[key]));',
		// `for await` is skipped
		'async function f() { for await (const key of Object.keys(object)) { foo(object[key]); } }',
		'for (const key in object) {\n\tfoo(object[key]);\n}',
		'Object.entries(object).map(([key, value]) => {\n\tvalue = key;\n\treturn key;\n});',
		'Object.entries(object).map(([key, value, extra]) => key);',
		'Object.entries(object).filter(([key, value]) => key);',
		'Object.entries(object).find(([key, value]) => key);',
		'Object.entries(object).findLast(([key, value]) => value);',
		'Object.entries(object).reduce((result, [key, value]) => result + key);',
		'Object.entries(object).reduceRight((result, [key, value]) => result + value);',
		'Object.entries(object).reduce((result, [key, value]) => result + key, ...initialValue);',
		'Object.entries(object).map(([key, value], index) => [key, value, index]);',
		'Object.entries(object).reduce((result, [key, value], index) => result + key + value + index, "");',
		'Object.entries(object).every(([key, value], index, entries) => entries[index][0] === key);',
		'Object.entries(object).reduce((result, [key, value], index, entries) => entries[index][1] === value, true);',
		'Object.entries(object).some(async ([key, value]) => key);',
		'Object.entries(object).flatMap(function * ([key, value]) {\n\tyield key;\n});',
		'Object.keys(object).map(function (key) {\n\treturn [object[key], arguments[0]];\n});',
		'Object.keys(object).map(function (key) {\n\treturn () => [object[key], arguments[0]];\n});',
		'Object.entries(object).map(function ([key, value]) {\n\treturn [key, arguments[0]];\n});',
		'Object.entries(object).some(function ([key, value]) {\n\treturn [key, arguments[0]];\n});',
		'Object.entries(object).reduce(function (result, [key, value]) {\n\treturn [result, value, arguments[1]];\n}, []);',
		'Object.entries(object).reduce(function (result = arguments[1], [key]) {\n\treturn result ?? key;\n}, undefined);',
		typescript('Object.keys(object as Record<string, unknown>).map(key => otherObject[key]);'),
		// Inconsistent casts across accesses can't be unified into a single argument
		typescript('Object.keys(object).map(key => foo((object as A)[key], object[key]));'),
		typescript('Object.keys(object).map(key => foo((object as A)[key], (object as B)[key]));'),
	],
	invalid: [
		'for (const key of Object.keys(object)) {\n\tfoo(object[key]);\n}',
		'for (const key of Object.keys(object)) {\n\tfoo(object[key], key);\n}',
		'const result = Object.keys(object).map(key => foo(object[key]));',
		'const result = Object.keys(object).map(key => foo(object[key], key));',
		'const result = Object.keys(object).map((key) => foo(object[key], key));',
		'const result = Object.keys(object).map(function (key) {\n\treturn foo(object[key], key);\n});',
		'const result = Object.keys(object).map(function (key) {\n\treturn this.format(object[key]);\n}, formatter);',
		'for (const key of Object.keys(object)) {\n\tupdate(object);\n\tfoo(object[key]);\n}',
		'for (const key of Object.keys(object)) {\n\tfoo(object[key]);\n\tupdate(object);\n}',
		'for (const key of Object.keys(object)) {\n\tfoo(object[key]);\n\tupdate();\n}',
		'Object.keys(object).map(key => {\n\tconst result = foo(object[key]);\n\tupdate(object);\n\treturn result;\n});',
		'Object.keys(object).map(key => {\n\tconst result = foo(object[key]);\n\tupdate();\n\treturn result;\n});',
		'Object.keys(object).map(key => {\n\tthrow object[key];\n});',
		'for (const key of Object.keys(object)) {\n\tconst value = getValue;\n\tconst item = object[key];\n}',
		'for (const key of Object.keys(object)) {\n\tconst value = getValue;\n\tconst item = object[key] + key.length;\n}',
		'for (const key of Object.keys(object)) {\n\tconst item = object[key];\n\tbreak;\n}',
		'for (const key of Object.keys(object)) {\n\tif (skip(key)) {\n\t\tcontinue;\n\t}\n\n\tfoo(object[key]);\n}',
		'function getFirstValue() {\n\tfor (const key of Object.keys(object)) {\n\t\treturn object[key];\n\t}\n}',
		'for (const key of Object.keys(object)) {\n\tthrow object[key];\n}',
		'for (const [key] of Object.entries(object)) {\n\tfoo(key);\n}',
		'for (const [key, value] of Object.entries(object)) {\n\tfoo(key);\n}',
		'for (const [key, value] of Object.entries(object)) {\n\tfoo(value);\n}',
		'for (const [, value] of Object.entries(object)) {\n\tfoo(value);\n}',
		'const result = Object.entries(object).map(([key]) => foo(key));',
		'const result = Object.entries(object).map(([key, value]) => foo(key));',
		'const result = Object.entries(object).map(([key, value]) => foo(value));',
		'const result = Object.entries(object).map(([, value]) => foo(value));',
		'const result = Object.entries(object).map(([key], index) => foo(key, index));',
		'const result = Object.entries(object).map(function ([key]) {\n\treturn this.has(key);\n}, names);',
		'Object.entries(object).map(([key, value]) => {\n\tthrow key;\n});',
		'const result = Object.entries(object).every(([key, value]) => foo(key));',
		'const result = Object.entries(object).every(([key, value]) => foo(value));',
		'const result = Object.entries(object).every(([key], index) => foo(key, index));',
		'const result = Object.entries(object).every(function ([key]) {\n\treturn this.has(key);\n}, names);',
		'const result = Object.entries(object).some(([key, value]) => foo(key));',
		'const result = Object.entries(object).some(([key, value]) => foo(value));',
		'Object.entries(object).some(([key]) => {\n\tthrow key;\n});',
		'const result = Object.entries(object).findIndex(([key, value]) => foo(key));',
		'const result = Object.entries(object).findIndex(([key, value]) => foo(value));',
		'const result = Object.entries(object).findLastIndex(([key, value]) => foo(key));',
		'const result = Object.entries(object).findLastIndex(([key, value]) => foo(value));',
		'const result = Object.entries(object).flatMap(([key, value]) => foo(key));',
		'const result = Object.entries(object).flatMap(([key, value]) => foo(value));',
		'Object.entries(object).forEach(([key, value]) => foo(key));',
		'Object.entries(object).forEach(([key, value]) => foo(value));',
		'const result = Object.entries(object).reduce((result, [key, value]) => result + key, "");',
		'const result = Object.entries(object).reduce((result, [key, value]) => result + value, 0);',
		'const result = Object.entries(object).reduce((result, [, value], index) => result + value + index, 0);',
		'const result = Object.entries(object).reduceRight((result, [key, value]) => result + key, "");',
		'const result = Object.entries(object).reduceRight((result, [key, value]) => result + value, 0);',
		'const result = Object.entries(object).reduceRight((result, [, value], index) => result + value + index, 0);',
		'for (const key of Object.keys((object))) {\n\tfoo((object)[key]);\n}',
		typescript('Object.keys(object as Record<string, unknown>).map(key => (object as Record<string, unknown>)[key]);'),
		typescript('Object.keys(object!).map(key => object![key]);'),
		typescript('Object.keys(object satisfies Record<string, unknown>).map(key => (object satisfies Record<string, unknown>)[key]);'),
		// Cast only on the value access: it's moved onto the iterable-method argument
		typescript('for (const key of Object.keys(object)) {\n\tfoo((object as Record<string, unknown>)[key]);\n}'),
		typescript('Object.keys(object).map(key => foo((object as Record<string, unknown>)[key]));'),
		// `entries` branch (key also used), cast moved onto the argument
		typescript('for (const key of Object.keys(object)) {\n\tfoo(key, (object as Record<string, unknown>)[key]);\n}'),
		// Angle-bracket assertion form
		typescript('for (const key of Object.keys(object)) {\n\tfoo((<Record<string, unknown>>object)[key]);\n}'),
		// Cast wrapping the whole access is preserved naturally (object has no cast)
		typescript('for (const key of Object.keys(object)) {\n\tfoo(object[key] as Foo);\n}'),
		// A comment inside the argument cast would be dropped when moving the value cast, so it is reported without a fix
		typescript('Object.keys(object /* keep this */ as A).map(key => (object as A)[key]);'),
		outdent`
			for (const key of Object.keys(object)) {
				foo(object[
					// Keep this.
					key
				]);
			}
		`,
		outdent`
			for (const [key, /* Keep this. */ value] of Object.entries(object)) {
				foo(key);
			}
		`,
		'Object.entries(object).every(([key /* Keep this. */]) => key);',
	],
});
