import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const {foo, bar} = options;',
		'const {foo, bar} = {foo: false, bar: 1};',
		'const {} = {...options};',
		'const {foo, bar} = {...options, foo: false, bar: 1};',
		'const {foo} = {foo: false, bar: 1, ...options};',
		'const {foo, bar} = {foo: false, ...options};',
		'const {foo, bar} = {[foo]: false, bar: 1, ...options};',
		'const {[foo]: localFoo, bar} = {foo: false, bar: 1, ...options};',
		'const {toString} = {toString: "default", ...options};',
		'const {constructor} = {constructor: "default", ...options};',
		'const {__proto__: prototype} = {__proto__: "default", ...options};',
		'const {foo, ...bar} = {foo: false, bar: 1, ...options};',
		'const {foo = false, bar} = {foo: false, bar: 1, ...options};',
		'const {foo, bar: {baz}} = {foo: false, bar: 1, ...options};',
		'const {foo, bar} = {foo: getDefault(), bar: 1, ...options};',
		'const {foo, bar} = {foo: defaults.foo, bar: 1, ...options};',
		'const {foo, bar} = {foo: object + "", bar: 1, ...options};',
		'const {foo, bar} = {foo: +object, bar: 1, ...options};',
		'const {foo} = {foo, ...options};',
		'const {foo: localFoo} = {foo: localFoo, ...options};',
		'const {foo, bar} = {foo: bar, bar: 1, ...options};',
		'const {foo, bar} = {foo: false, bar: 1, ...options.defaults};',
		'const {foo, bar} = {foo: false, bar: 1, ...(options = defaults)};',
		'const {foo} = {foo: defaultValue, ...(defaultValue = true, {})};',
		'const {foo, bar} = Object.assign({foo: false, bar: 1}, options);',
		'({foo, bar} = {foo: false, bar: 1, ...options});',
		'const {foo, /* keep */ bar} = {foo: false, bar: 1, ...options};',
		'const {foo, bar} /* keep */ = {foo: false, bar: 1, ...options};',
		'const {foo, bar} = /* keep */ {foo: false, bar: 1, ...options};',
		outdent`
			const {
				foo,
				bar,
			} = {
				foo: false,
				// Keep this comment.
				bar: 1,
				...options,
			};
		`,
		{
			code: 'const {foo, bar}: Options = {foo: false, bar: 1, ...options};',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'const {foo, bar} = {foo: false, bar: 1, ...options};',
		outdent`
			const {
				foo,
				bar,
			} = {
				foo: false,
				bar: 1,
				...options,
			};
		`,
		'const {foo: localFoo, bar} = {foo: false, bar: 1, ...options};',
		'const {"": empty} = {"": false, ...options};',
		'const {"foo": localFoo} = {"foo": false, ...options};',
		'const {0: first} = {0: "default", ...options};',
		'const {foo, bar} = {foo: false, bar: 1, ...options || defaults};',
		'const {foo, bar} = {foo: false, bar: 1, ...(options || defaults)};',
		'const {foo, bar} = {foo: false, bar: 1, ...(condition ? options : defaults)};',
		'const {foo, bar} = {foo: false, bar: 1, ...(options, defaults)};',
		'let {foo, bar} = {foo: false, bar: 1, ...options};',
		'var {foo, bar} = {foo: false, bar: 1, ...options};',
	],
});
