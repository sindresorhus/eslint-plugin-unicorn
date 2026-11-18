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
		'String(42);',
		'value.toString();',
		'"already a string".toString();',
		'new Number(42).toString();',
		'new URL("https://example.com").toString();',
		'(42).toString(16);',
		'(42n).toString(10);',
		'(42).toString(...radix);',
		'(42)[getMethod()]();',
		'(42)[`to${name}`]();', // eslint-disable-line no-template-curly-in-string
		'(42)[tag`toString`]();',
		'(42)?.["toString"]();',
		'(42)?.toString();',
		'(42).toString?.();',
		'class Example extends Parent { toString() { return super.toString(); } }',
		'(start + end).toString();',
		{
			code: '(record?.count as number).toString();',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function format(value: number | string) { return value.toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function format(value: number | bigint | undefined) { return value.toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function format(value: any) { return (value satisfies number).toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function format(value: any, flag: boolean) { return (flag ? (value satisfies number) : 42).toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function format(value: any) { return ((value satisfies number) + 42).toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function format(value: any) { return (value satisfies string).indexOf("x").toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function format(value: any) { return (value satisfies string).length.toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function next(flag: boolean) { return flag ? 42n : "unknown"; } next(flag).toString();'),
		typeAware('type Formattable = {toString(): "42"} & 42; function format(value: Formattable): "42" { return value.toString(); }'),
		typeAware('enum Status {Okay = "okay", Missing = "missing"} Status.Okay.toString();'),
		typeAware('function format(value: number | string | undefined) { return (value ?? 0).toString(); }'),
	],
	invalid: [
		'(42).toString();',
		'(1n + 2n).toString();',
		'Number(value).toString().padStart(2, "0");',
		'function format() {return(42).toString();}',
		'(prepare(), /* keep */ 42).toString();',
		'(/* keep */ 42).toString();',
		'(42).toString(/* keep */);',
		'function format(String) { return (42).toString(); }',
		'maybe?.format((42).toString());',
		{
			code: 'function format(value: number) { return value.toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value as bigint).toString();',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function nextId() { return 42n; } nextId().toString();'),
		'(42)["toString"]();',
		'(42n)[`toString`]();',
		'(42)[/* keep */ "toString"]();',
		'(isBig ? 42n : 42).toString();',
		{
			code: 'type Numeric = number | bigint; function format(value: Numeric) { return value.toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function next(isBig: boolean) { return isBig ? 42n : 42; } next(flag).toString();'),
		{
			code: 'function format(value: -1 | -1n) { return value.toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'declare function readCount(): number; (readCount() satisfies number).toString();',
			languageOptions: {parser: parsers.typescript},
		},
		String.raw`(42)["to\u0053tring"]();`,
		'(counter++).toString();',
		'(end - start).toString();',
		'(attempts -= backoff).toString();',
		'(~mask).toString();',
		'/** @param {number | bigint} value */ function format(value) { return value.toString(); }',
		typeAware('function encode(value: unknown) { if (typeof value === "bigint") return value.toString(); }'),
		'Date.now().toString();',
		'BigInt.asIntN(64, value).toString();',
		{
			code: 'function format(value: number, increment: number) { return (value += increment).toString(); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function format(value: string) { return value.indexOf("x").toString(); }'),
		'["a", "b"].length.toString();',
		typeAware('type Id = number & {readonly brand: unique symbol}; function format(value: Id) { return value.toString(); }'),
		typeAware('enum Status {Okay = 200, Missing = 404} Status.Okay.toString();'),
		typeAware('function format(value: number | undefined) { return (value ?? 0).toString(); }'),
	],
});

test({
	valid: [],
	invalid: [
		'import type {String} from "./string.js"; (42).toString();',
		'const String = () => "wrong"; { type String = string; (42).toString(); }',
	].map(code => ({
		code,
		languageOptions: {parser: parsers.typescript},
		errors: [{messageId: 'prefer-string-coercion', suggestions: []}],
	})),
});
