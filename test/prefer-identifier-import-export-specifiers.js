import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const declareFoo = code => `const foo = 1;\n${code}`;
const declareFooAndBaz = code => `const foo = 1, baz = 2;\n${code}`;

test.snapshot({
	valid: [
		'import "foo";',
		'import foo from "foo";',
		'import * as foo from "foo";',
		'import {foo} from "foo";',
		'import {foo as bar} from "foo";',
		'import {"a string" as aString} from "foo";',
		'import {"foo-bar" as fooBar} from "foo";',
		'import {"" as empty} from "foo";',
		declareFoo('export {foo};'),
		declareFoo('export {foo as bar};'),
		'export {foo} from "foo";',
		'export {foo as bar} from "foo";',
		declareFoo('export {foo as "a string"};'),
		declareFoo('export {foo as "foo-bar"};'),
		'export {"a string" as aString} from "foo";',
		'export {"foo-bar" as fooBar} from "foo";',
		'export {"" as empty} from "foo";',
		'export * from "foo";',
		'export * as foo from "foo";',
		'export * as "a string" from "foo";',
	],
	invalid: [
		'import {"foo" as foo} from "foo";',
		'import {"default" as defaultExport} from "foo";',
		'import {"foo" as foo, "bar" as bar} from "foo";',
		'import {"foo" as foo} from "foo" with {type: "json"};',
		'import {"foo"as foo} from "foo";',
		declareFoo('export {foo as "bar"};'),
		declareFoo('export {foo as "default"};'),
		declareFooAndBaz('export {foo as "bar", baz as "qux"};'),
		declareFoo('export {foo as"bar"};'),
		'export {"foo" as bar} from "foo";',
		'export {"default" as defaultExport} from "foo";',
		'export {"foo" as bar, "baz" as qux} from "foo";',
		'export {"foo"} from "foo";',
		'export {"foo" as "bar"} from "foo";',
		'export {"foo"as bar} from "foo";',
		'export {"foo"as"bar"} from "foo";',
		'export * as "foo" from "foo";',
		'export * as"foo" from "foo";',
	],
});
