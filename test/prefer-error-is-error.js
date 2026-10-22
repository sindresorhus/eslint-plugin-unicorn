import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'Object.prototype.toString.call(error) === tag`[object Error]`',
		'Object.prototype.toString.call(error) === `[object ${type}]`', // eslint-disable-line no-template-curly-in-string
	],
	invalid: [
		{
			code: 'Object.prototype.toString.call(error) === `[object Err\\u006fr]`',
			output: 'Error.isError(error)',
			errors: 1,
		},
		{
			code: '`[object Error]` !== Object.prototype.toString.call(error)',
			output: '!Error.isError(error)',
			errors: 1,
		},
	],
});

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

// Keyword spacing
test({
	valid: [],
	invalid: [
		['function check(error) { return(error) instanceof Error; }', 'function check(error) { return Error.isError(error); }'],
		['function check(error) { return"[object Error]" === Object.prototype.toString.call(error); }', 'function check(error) { return Error.isError(error); }'],
		['function * check(error) { yield"[object Error]" !== Object.prototype.toString.call(error); }', 'function * check(error) { yield !Error.isError(error); }'],
		['for (const value of(error) instanceof Error ? [1] : []);', 'for (const value of Error.isError(error) ? [1] : []);'],
		['(error instanceof Error)in object;', '(Error.isError(error)) in object;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test.snapshot({
	valid: [
		'Error.isError(error)',
		'error instanceof TypeError',
		'error instanceof CustomError',
		'Object.prototype.toString.call(error) === "[object TypeError]"',
		'Object.prototype.toString.call(error) === tag',
		'getTag(error) === "[object Error]"',
		'Object.prototype.toString.apply(error) === "[object Error]"',
		'Object.prototype.toString.call(error, extra) === "[object Error]"',
		'Object.prototype.toString.call() === "[object Error]"',
		'Object.prototype.toString.call(error).slice(8, -1) === "Error"',
		'Object.prototype["toString"].call(error) === "[object Error]"',
		'Object.toString.call(error) === "[object Error]"',
		'const Object = {prototype: {toString: {call() {}}}}; Object.prototype.toString.call(error) === "[object Error]"',
		'({toString: Object.prototype.toString}).toString.call(error) === "[object Error]"',
		'const Error = CustomError; error instanceof Error',
		'class Error {}; error instanceof Error',
		'function check(Error) { return error instanceof Error; }',
		'import {Error} from "error"; error instanceof Error',
		'const Error = CustomError; Object.prototype.toString.call(error) === "[object Error]"',
		'function check(Error) { return Object.prototype.toString.call(error) === "[object Error]"; }',
		'function check(Object) { return Object.prototype.toString.call(error) === "[object Error]"; }',
		typescript('const Error: unknown = CustomError; error instanceof Error'),
		typescript('import {Error} from "error"; error instanceof Error'),
		typescript('import {Error} from "error"; Object.prototype.toString.call(error) === "[object Error]"'),
		typescript('const Error = CustomError; { type Error = unknown; error instanceof Error }'),
		typescript('const Error = CustomError; { interface Error {}; error instanceof Error }'),
		typescript('const Error = CustomError; { type Error = unknown; Object.prototype.toString.call(error) === "[object Error]" }'),
		typescript('const Object = CustomObject; { type Object = unknown; Object.prototype.toString.call(error) === "[object Error]" }'),
		typescript('const Object = CustomObject; { interface Object {}; Object.prototype.toString.call(error) === "[object Error]" }'),
	],
	invalid: [
		'error instanceof Error',
		'(error) instanceof Error',
		'getError() instanceof Error',
		'a + b instanceof Error',
		'(sideEffect(), error) instanceof Error',
		'Object.prototype.toString.call(error) === "[object Error]"',
		'"[object Error]" === Object.prototype.toString.call(error)',
		'Object.prototype.toString.call(error) !== "[object Error]"',
		'"[object Error]" !== Object.prototype.toString.call(error)',
		'Object.prototype.toString.call(error) == "[object Error]"',
		'"[object Error]" != Object.prototype.toString.call(error)',
		'({}).toString.call(error) === "[object Error]"',
		'({}).toString.call(error) !== "[object Error]"',
		'Object.prototype.toString.call((sideEffect(), error)) === "[object Error]"',
		'Object.prototype.toString.call(\n\terror,\n) === \'[object Error]\'',
		typescript('error! instanceof Error'),
		typescript('type Error = unknown; error instanceof Error'),
		typescript('interface Error {}; error instanceof Error'),
		typescript('import type {Error} from "error"; error instanceof Error'),
		typescript('type Error = unknown; Object.prototype.toString.call(error) === "[object Error]"'),
		typescript('type Object = unknown; Object.prototype.toString.call(error) === "[object Error]"'),
		typescript('import type {Object} from "object"; Object.prototype.toString.call(error) === "[object Error]"'),
		typescript('Object.prototype.toString.call(error as unknown) === "[object Error]"'),
		typescript('Object.prototype.toString.call(error!) === "[object Error]"'),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'error instanceof /* comment */ Error',
		'Object.prototype.toString.call(/* comment */ error) === "[object Error]"',
		'Object.prototype.toString.call(error) === /* comment */ "[object Error]"',
	],
});
