import {test as testInteraction} from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const typescriptSyntax = code => ({code, languageOptions: {parser: parsers.typescript}});
const formattableType = 'type Formattable = {toString(): "42"} & 42;';
const customToStringType = `${formattableType} function format(value: Formattable): "42" { return value.toString(); }`;
const typeAware = (code, filename = 'file.ts') => ({
	code,
	filename,
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['file.ts', 'file.js']}},
	},
});

test.snapshot({
	valid: [
		'String(42);',
		'value.toString();',
		'"already a string".toString();',
		'const value = null; const alias = value; { const value = 1n; alias.toString(); }',
		'function format() { return value.toString(); var value = 1n; }',
		'function format(NaN) { return NaN.toString(); }',
		'/** @type {number | string} */ const value = 42; const alias = value; alias.toString();',
		'/** @param {{toString(): "42"} & 42} value */ function format(value) { return value.toString(); }',
		'/** @type {"42"} */ const label = /** @type {{toString(): "42"} & 42} */ (42).toString();',
		'/** @type {"42"} */ const label = /** @type {() => "42"} */ ((42).toString)();',
		'const value = /** @type {{toString(): "42"} & 42} */ (42); const alias = value; /** @type {"42"} */ const label = alias.toString();',
		'/** @type {"42"} */ const label = ({value: /** @type {{toString(): "42"} & 42} */ (42)}).value.toString();',
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
		'class Example { #toString() {} format() { return (42).#toString(); } }',
		'(start + end).toString();',
		'(42 + "px").toString();',
		typescriptSyntax('(record?.count as number).toString();'),
		typescriptSyntax('declare global { interface Number { toString<Result extends string>(): Result; } } export const label: "42" = (42).toString<"42">();'),
		typescriptSyntax('function format(value: number | string) { return value.toString(); }'),
		typescriptSyntax('function format(value: number | bigint | undefined) { return value.toString(); }'),
		typescriptSyntax('function format(value: any) { return (value satisfies number).toString(); }'),
		typescriptSyntax('function format(value: any, flag: boolean) { return (flag ? (value satisfies number) : 42).toString(); }'),
		typescriptSyntax('function format(value: any) { return ((value satisfies number) + 42).toString(); }'),
		typescriptSyntax('function format(value: any) { return (value satisfies string).indexOf("x").toString(); }'),
		typescriptSyntax('function format(value: any) { return (value satisfies string).length.toString(); }'),
		typescriptSyntax(customToStringType),
		typescriptSyntax(`${formattableType} type Value = number; type Numeric<Value> = Value; function format(value: Numeric<Formattable>): "42" { return value.toString(); }`),
		typescriptSyntax(`${formattableType} type Value = number; type Numeric<Value = Formattable> = Value; function format(value: Numeric): "42" { return value.toString(); }`),
		typescriptSyntax('const result: "42" = (42 as {toString(): "42"} & 42).toString();'),
		typescriptSyntax('const missing = null; const value = missing ?? (42 as {toString(): "42"} & 42); const result: "42" = value.toString();'),
		typescriptSyntax('import type {Formattable} from "./types.js"; const result: "42" = (42 as Formattable).toString();'),
		typescriptSyntax('import type {Formattable} from "./types.js"; const value: Formattable = 42 as any; const result: "42" = value.toString();'),
		typescriptSyntax('declare const sample: {toString(): "42"} & 42; const missing = null; const value = missing ?? (42 as typeof sample); const result: "42" = value.toString();'),
		typescriptSyntax('const result: "42" = ({value: 42 as {toString(): "42"} & 42}).value.toString();'),
		typeAware('function next(flag: boolean) { return flag ? 42n : "unknown"; } next(flag).toString();'),
		typeAware(customToStringType),
		typeAware([
			'type Value = number; type Identity<Value> = Value;',
			'const value: Identity<{toString(): string; [Symbol.toPrimitive](): string}> = {toString() { return "display"; }, [Symbol.toPrimitive]() { return "wire"; }};',
			'value.toString();',
		].join('\n')),
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

for (const {name, code, languageOptions, filename = 'file.js', output = code.replace('value.toString()', 'String(value)')} of [
	{
		name: 'preserve a TypeScript annotation',
		code: 'export const format = (value: number) => value.toString();',
		languageOptions: {parser: typescriptEslintParser},
	},
	{
		name: 'preserve a JSDoc annotation',
		code: '/** @param {number} value */\nexport const format = value => value.toString();',
	},
	{
		name: 'preserve an asserted return type',
		...typeAware('export const format: (value: number) => "42" = value => value.toString() as "42";'),
	},
	{
		name: 'preserve a contextual signature from satisfies',
		...typeAware('export const format = (value => value.toString()) satisfies (value: number) => string;'),
	},
	{
		name: 'preserve a contextual signature from JSDoc satisfies',
		...typeAware('/** @satisfies {(value: number) => string} */\nexport const format = value => value.toString();', 'file.js'),
	},
	{
		name: 'preserve an inline contextual signature from JSDoc satisfies',
		...typeAware('export const format = /** @satisfies {(value: number) => string} */ (value => value.toString());', 'file.js'),
	},
	{
		name: 'preserve a JSDoc signature on a returned function',
		...typeAware('export function factory() {\n\t/** @param {number} value */\n\treturn value => value.toString();\n}', 'file.js'),
	},
	{
		name: 'simplify an unannotated numeric callback',
		...typeAware('export const labels = [1, 2].map(value => value.toString());'),
		output: 'export const labels = [1, 2].map(String);',
	},
]) {
	testInteraction(`combined coercion fixes ${name}`, t => {
		const linter = new Linter();
		const result = linter.verifyAndFix(code, {
			files: ['**/*.{js,ts}'],
			plugins: {unicorn},
			languageOptions: languageOptions ?? {},
			rules: {
				'unicorn/prefer-string-coercion': 'error',
				'unicorn/prefer-native-coercion-functions': 'error',
			},
		}, {filename});
		t.assert.deepStrictEqual(result, {fixed: true, output, messages: []});
	});
}

test({
	valid: [],
	invalid: [
		{
			code: String.raw`(42).to\u0053tring();`,
			output: 'String(42);',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			code: 'for (const digit of(42 // keep the amount\r\n).toString()) {\r\n\tlog(digit);\r\n}',
			output: 'for (const digit of String((42 // keep the amount\r\n))) {\r\n\tlog(digit);\r\n}',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			code: 'const value = /** @type {number} */ (input); (42).toString();',
			output: 'const value = /** @type {number} */ (input); String(42);',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			...typeAware('const label = /** @type {number} */ (42).toString();', 'file.js'),
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			...typeAware('const value = 42; const label = /** @type {() => string} */ (value.toString)();', 'file.js'),
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			...typeAware('const label = (/** @type {number} */ (42)).toString();', 'file.js'),
			output: 'const label = String((/** @type {number} */ (42)));',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			...typeAware('const label = /** @type {string} */ ((42).toString());', 'file.js'),
			output: 'const label = /** @type {string} */ (String(42));',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			...typeAware('const value = /** @type {number} */ (42); value.toString();', 'file.js'),
			output: 'const value = /** @type {number} */ (42); String(value);',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			...typeAware('type Identity<Value> = Value; function format(value: Identity<number>) { return value.toString(); }'),
			output: 'type Identity<Value> = Value; function format(value: Identity<number>) { return String(value); }',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
	],
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: 'function format(count: number, offset: number) {return(++count + offset).toString();}',
			output: 'function format(count: number, offset: number) {return String(++count + offset);}',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			code: 'const value = 42 as const; value.toString();',
			output: 'const value = 42 as const; String(value);',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		{
			code: 'const value = Infinity; value.toString();',
			output: 'const value = Infinity; String(value);',
			errors: [{messageId: 'prefer-string-coercion'}],
		},
		...[
			'import type {String} from "./string.js"; (42).toString();',
			'const String = () => "wrong"; { type String = string; (42).toString(); }',
		].map(code => ({code, errors: [{messageId: 'prefer-string-coercion'}]})),
	],
});
