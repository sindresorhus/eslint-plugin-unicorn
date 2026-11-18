import {test as testInteraction} from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const typescriptSyntax = code => ({code, languageOptions: {parser: parsers.typescript}});
const customToStringType = 'type Formattable = {toString(): "42"} & 42; function format(value: Formattable): "42" { return value.toString(); }';
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
		'const value = null; const alias = value; { const value = 1n; alias.toString(); }',
		'function format() { return value.toString(); var value = 1n; }',
		'/** @type {number | string} */ const value = 42; const alias = value; alias.toString();',
		'/** @param {number} value */ function format(value) { value = {toString() { return "display"; }, [Symbol.toPrimitive]() { return "wire"; }}; const alias = value; return alias.toString(); }',
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
		typescriptSyntax('(record?.count as number).toString();'),
		typescriptSyntax('function format(value: number | string) { return value.toString(); }'),
		typescriptSyntax('function format(value: number | bigint | undefined) { return value.toString(); }'),
		typescriptSyntax('function format(value: any) { return (value satisfies number).toString(); }'),
		typescriptSyntax('function format(value: any, flag: boolean) { return (flag ? (value satisfies number) : 42).toString(); }'),
		typescriptSyntax('function format(value: any) { return ((value satisfies number) + 42).toString(); }'),
		typescriptSyntax('function format(value: any) { return (value satisfies string).indexOf("x").toString(); }'),
		typescriptSyntax('function format(value: any) { return (value satisfies string).length.toString(); }'),
		typescriptSyntax(customToStringType),
		typescriptSyntax('const result: "42" = (42 as {toString(): "42"} & 42).toString();'),
		typescriptSyntax('const missing = null; const value = missing ?? (42 as {toString(): "42"} & 42); const result: "42" = value.toString();'),
		typeAware('function next(flag: boolean) { return flag ? 42n : "unknown"; } next(flag).toString();'),
		typeAware(customToStringType),
		typeAware('enum Status {Okay = "okay", Missing = "missing"} Status.Okay.toString();'),
		typeAware('function format(value: Number) { return value.toString(); }'),
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
		typescriptSyntax('function format(value: number) { return value.toString(); }'),
		typescriptSyntax('(value as bigint).toString();'),
		typeAware('function nextId() { return 42n; } nextId().toString();'),
		'(42)["toString"]();',
		'(42n)[`toString`]();',
		'(42)[/* keep */ "toString"]();',
		'(isBig ? 42n : 42).toString();',
		typescriptSyntax('type Numeric = number | bigint; function format(value: Numeric) { return value.toString(); }'),
		typeAware('function next(isBig: boolean) { return isBig ? 42n : 42; } next(flag).toString();'),
		typescriptSyntax('function format(value: -1 | -1n) { return value.toString(); }'),
		typescriptSyntax('declare function readCount(): number; (readCount() satisfies number).toString();'),
		String.raw`(42)["to\u0053tring"]();`,
		'(counter++).toString();',
		'(end - start).toString();',
		'(attempts -= backoff).toString();',
		'(~mask).toString();',
		'(+price).toString();',
		'/** @type {number} */ const value = getInput(); const alias = value; alias.toString();',
		'/** @param {number | bigint} value */ function format(value) { return value.toString(); }',
		typeAware('function encode(value: unknown) { if (typeof value === "bigint") return value.toString(); }'),
		'Date.now().toString();',
		'BigInt.asIntN(64, value).toString();',
		typescriptSyntax('function format(value: number, increment: number) { return (value += increment).toString(); }'),
		typeAware('function format(value: string) { return value.indexOf("x").toString(); }'),
		'["a", "b"].length.toString();',
		typeAware('type Id = number & {readonly brand: unique symbol}; function format(value: Id) { return value.toString(); }'),
		typeAware('enum Status {Okay = 200, Missing = 404} Status.Okay.toString();'),
		typeAware('function format(value: number | undefined) { return (value ?? 0).toString(); }'),
		'const value = 1n; const alias = value; { const value = null; alias.toString(); }',
		'NaN.toString();',
		typeAware('enum Status {Current = Date.now(), Okay = 200} Status.Current.toString();'),
	],
});

for (const {name, code, languageOptions, filename = 'file.js'} of [
	{
		name: 'a TypeScript annotation',
		code: 'export const format = (value: number) => value.toString();',
		languageOptions: {parser: typescriptEslintParser},
	},
	{
		name: 'a JSDoc annotation',
		code: '/** @param {number} value */\nexport const format = value => value.toString();',
	},
	{
		name: 'an asserted return type',
		...typeAware('export const format: (value: number) => "42" = value => value.toString() as "42";'),
	},
	{
		name: 'a contextual signature from satisfies',
		...typeAware('export const format = (value => value.toString()) satisfies (value: number) => string;'),
	},
]) {
	testInteraction(`combined coercion fixes preserve ${name}`, t => {
		const result = new Linter().verifyAndFix(code, {
			files: ['**/*.{js,ts}'],
			plugins: {unicorn},
			languageOptions: languageOptions ?? {},
			rules: {
				'unicorn/prefer-string-coercion': 'error',
				'unicorn/prefer-native-coercion-functions': 'error',
			},
		}, {filename});
		t.assert.deepStrictEqual(result, {fixed: true, output: code.replace('value.toString()', 'String(value)'), messages: []});
	});
}

test.typescript({
	valid: [],
	invalid: [
		{
			code: 'function format(count: number, offset: number) {return(++count + offset).toString();}',
			output: 'function format(count: number, offset: number) {return String(++count + offset);}',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		...[
			'import type {String} from "./string.js"; (42).toString();',
			'const String = () => "wrong"; { type String = string; (42).toString(); }',
		].map(code => ({code, errors: [{messageId: 'prefer-string-coercion'}]})),
	],
});
