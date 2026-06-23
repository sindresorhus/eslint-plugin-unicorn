import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		'const value = object[key];',
		'const value = object?.[key];',
		'if (object[key] === true) {}',
		'if (object[key] !== undefined) {}',
		'if (object[key] == null) {}',
		'if (object["key"]) {}',
		'if (object[0]) {}',
		'if (object[-1]) {}',
		'if (object[+1]) {}',
		'if (object[-1n]) {}',
		'if (object[`key`]) {}',
		'if ("key" in object) {}',
		'if (0 in object) {}',
		'if (-1 in object) {}',
		'if (+1 in object) {}',
		'if (-1n in object) {}',
		'if (`key` in object) {}',
		'class Foo { #key; method(object) { if (#key in object) {} } }',
		'if (Object.hasOwn(object, key)) {}',
		'if (Object.prototype.hasOwnProperty.call(object, key)) {}',
		'if (map.has(key)) {}',
		'if (set.has(value)) {}',
		'const Boolean = value => value; if (Boolean(object[key])) {}',
		'function unicorn(Boolean) { if (Boolean(object[key])) {} }',
		{
			code: 'if (object["key" as const]) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if (("key" as const) in object) {}',
			languageOptions: {parser: parsers.typescript},
		},
		// A property whose value type is a known boolean is a value read, not an existence check (#3406).
		typeAware('declare const object: {a: boolean; b: boolean};\ndeclare const key: \'a\' | \'b\';\nif (object[key]) {}'),
		typeAware('declare const object: {a: boolean; b: boolean};\ndeclare const key: \'a\' | \'b\';\nif (!object[key]) {}'),
		// The exemption is driven by the value type, not the key type (compare the `Record<string, string>` invalid case below).
		typeAware('declare const object: Record<string, boolean>;\ndeclare const key: string;\nif (object[key]) {}'),
		// A literal boolean value type counts too.
		typeAware('declare const object: {a: true; b: false};\ndeclare const key: \'a\' | \'b\';\nif (object[key]) {}'),
	],
	invalid: [
		'if (object[key]) {}',
		'if (!object[key]) {}',
		'if (Boolean(object[key])) {}',
		'if (!!Boolean(object[key])) {}',
		'if (Boolean(object[key]) && ready) {}',
		'const value = object[key] ? first : second;',
		'while (object[key]) {}',
		'do {} while (object[key]);',
		'for (; object[key];) {}',
		'if (object[key] && other) {}',
		'if (other || object[key]) {}',
		'if ((object)[(key)]) {}',
		'if (object?.[key]) {}',
		'if (key in object) {}',
		'const exists = key in object;',
		'if (!(key in object)) {}',
		'if (key in object && other) {}',
		'const value = key in object ? first : second;',
		'while (key in object) {}',
		'do {} while (key in object);',
		'if ((key) in (object)) {}',
		'if (key in object?.property) {}',
		'if (getKey() in getObject()) {}',
		'if (object[key] in other) {}',
		'if (object[/* comment */ key]) {}',
		'if (/* comment */ key in object) {}',
		'if (key in /* comment */ object) {}',
		{
			code: 'if (object[key]!) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((object[key] as boolean)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((object[key] as string)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((<string>object[key])) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((object[key] satisfies boolean)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((object[key] satisfies string)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		// A non-boolean value is still an ambiguous existence check (#3406).
		typeAware('declare const object: Record<string, string>;\ndeclare const key: string;\nif (object[key]) {}'),
		// A possibly-`undefined` value is still ambiguous (#3406).
		typeAware('declare const object: {a?: boolean};\ndeclare const key: \'a\';\nif (object[key]) {}'),
	],
});
