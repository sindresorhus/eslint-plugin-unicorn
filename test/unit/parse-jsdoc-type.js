import test from 'node:test';
import {parseJSDocumentType} from '../../rules/utils/parse-jsdoc-type.js';

test('reads primitive boolean facts', t => {
	t.assert.deepStrictEqual(parseJSDocumentType('Boolean'), {kind: 'name', name: 'boolean'});
});

test('malformed generic arguments cannot establish an array type', t => {
	t.assert.deepStrictEqual(parseJSDocumentType('Array<boolean |>'), {kind: 'unknown'});
});

test('malformed parameters cannot establish a boolean-returning callable', t => {
	t.assert.deepStrictEqual(parseJSDocumentType('(value:) => boolean'), {kind: 'unknown'});
});

test('unsupported types retain unknown evidence', t => {
	// eslint-disable-next-line no-template-curly-in-string
	t.assert.deepStrictEqual(parseJSDocumentType('`prefix<${string}`'), {kind: 'unknown'});
});

const name = name => ({kind: 'name', name});
const nullish = name => ({kind: 'nullish', name});
const nullable = element => ({kind: 'nullable', element});
const optional = element => ({kind: 'optional', element});
const union = (...elements) => ({kind: 'union', elements});
const intersection = (...elements) => ({kind: 'intersection', elements});
const callable = returnType => ({kind: 'function', returnType});
const unknown = {kind: 'unknown'};
const nonPrimitive = {kind: 'non-primitive'};
const boolean = name('boolean');
const string = name('string');
const number = name('number');
const array = name('Array');

test('generic Object dictionaries are records while bare and qualified names stay unresolved', t => {
	for (const [expression, expected] of [
		['Object<string, boolean>', nonPrimitive],
		['Object.<number, () => boolean>', nonPrimitive],
		['Array<Object<string, boolean>>', array],
		['() => Object<string, boolean>', callable(nonPrimitive)],
		['Object', name('Object')],
		['object', name('object')],
		['types.Object<string, boolean>', name('types.Object')],
		['Object<string, keyof Value>', unknown],
		['Object<string, boolean |>', unknown],
	]) {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), expected, expression);
	}
});

test('optional suffix wraps the complete annotated type', t => {
	const nullableReturn = union(boolean, nullish('undefined'));
	for (const [expression, expected] of [
		['boolean | string=', optional(union(boolean, string))],
		['boolean & {brand: string}=', optional(intersection(boolean, nonPrimitive))],
		['?boolean=', optional(nullable(boolean))],
		['function(): boolean=', optional(callable(boolean))],
		['() => boolean=', optional(callable(boolean))],
		['function(): boolean | string=', optional(callable(union(boolean, string)))],
		['() => boolean | undefined=', optional(callable(nullableReturn))],
		['function(): function(): boolean=', optional(callable(callable(boolean)))],
		['?function(): boolean=', optional(nullable(callable(boolean)))],
		['(function(): boolean)=', optional(callable(boolean))],
		['function(function(): boolean=): string', callable(string)],
		['[function(): boolean=]', array],
		['function(): boolean==', unknown],
		['boolean | string==', unknown],
		['function(boolean==): string', unknown],
		['[boolean==]', unknown],
	]) {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), expected, expression);
	}
});

for (const expression of [
	'function(this): boolean',
	'function(this, string): boolean',
	'Array<function(this): boolean>',
	'function(function(this)): boolean',
]) {
	test(`missing receiver colon keeps ${expression} unknown`, t => {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), unknown);
	});
}

test('receiver validation preserves explicit receiver types and ordinary this types', t => {
	for (const [expression, expected] of [
		['function(this: Context): boolean', callable(boolean)],
		['function(this: Context, string): boolean', callable(boolean)],
		['function(ThisType): boolean', callable(boolean)],
		['function(this: Context): this', callable(name('this'))],
		['(this) => boolean', callable(boolean)],
		['Array<function(this: Context): boolean>', array],
		['function(function(this: Context)): boolean', callable(boolean)],
		['this', name('this')],
	]) {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), expected, expression);
	}
});

for (const [description, expression, expected] of [
	['empty parameter list', '{(): boolean}', callable(boolean)],
	['typed parameter', '{(value: string): boolean}', callable(boolean)],
	['properties before and after the signature', '{readonly label: string; (): boolean; count: number}', callable(boolean)],
	['optional and rest parameters', '{(value?: string, ...rest: number[]): boolean}', callable(boolean)],
	['explicit this parameter', '{(this: Context, value: string): boolean}', callable(boolean)],
	['nullable return', '{(): boolean | undefined}', callable(union(boolean, nullish('undefined')))],
	['unknown return', '{(): unknown}', callable(unknown)],
	['function-valued return', '{(): () => boolean}', callable(callable(boolean))],
	['mixed overload return types', '{(value: string): boolean; (value: number): string}', intersection(callable(boolean), callable(string))],
	['comma-separated overloads', '{(value: string): boolean, (value: number): boolean}', intersection(callable(boolean), callable(boolean))],
	['newline-separated members', '{label: string\n(value: string): boolean\ncount: number}', callable(boolean)],
	['array element', 'Array<{(value: string): boolean; label: string}>', array],
	['callback parameter', 'function({(): boolean}): string', callable(string)],
	['nested property stays an object', '{callback: {(): boolean}}', nonPrimitive],
	['readonly named method stays an object', '{readonly(): boolean}', nonPrimitive],
	['readonly named method inside an array', 'Array<{readonly(): boolean}>', array],
]) {
	test(`parses object type with ${description}`, t => {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), expected);
	});
}

for (const [description, expression] of [
	['missing return type', '{():}'],
	['missing member separator', '{(): boolean label: string}'],
	['missing parameter type', '{(value:): boolean}'],
	['arrow instead of return colon', '{(value: string) => boolean}'],
	['generic declaration', '{<T>(value: T): boolean}'],
	['unsupported later property', '{(): boolean; broken: keyof Value}'],
	['malformed later overload', '{(): boolean; (value:): boolean}'],
]) {
	test(`keeps object call signature with ${description} unknown`, t => {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), unknown);
	});
}

test('legacy void and nullish aliases normalize before wrappers and generic validation', t => {
	for (const [expression, expected] of [
		['Void', name('void')],
		['Null', nullish('null')],
		['Undefined', nullish('undefined')],
		['boolean | Null | Undefined', union(boolean, nullish('null'), nullish('undefined'))],
		['function(): Void', callable(name('void'))],
		['() => boolean | Undefined', callable(union(boolean, nullish('undefined')))],
		['?Void', nullable(name('void'))],
		['Undefined=', optional(nullish('undefined'))],
		['Null[]', array],
		['types.Null', name('types.Null')],
		['Voidish', name('Voidish')],
		['Void<boolean>', unknown],
		['Null<boolean>', unknown],
		['Undefined<boolean>', unknown],
	]) {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), expected, expression);
	}
});

test('consecutive parses restart tokenization after early failures and primitive or named fast paths', t => {
	for (const [expression, expected] of [
		['Map<string, "unterminated', unknown],
		['boolean', boolean],
		['Set', name('Set')],
		['Array<string>', array],
		[String.raw`Map<string, "\x0G">`, unknown],
		['number', number],
		['Uint8Array', name('Uint8Array')],
		['(value: string) => boolean', callable(boolean)],
		[String.raw`function("\u{110000}"): boolean`, unknown],
		['true', boolean],
		['𝒱alue', name('𝒱alue')],
		['{value: Array<boolean>}', nonPrimitive],
		['Array<"unterminated\n', unknown],
		['boolean | undefined', union(boolean, nullish('undefined'))],
	]) {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), expected, expression);
	}
});

test('primitive types with surrounding whitespace retain their complete-expression boundaries', t => {
	for (const [expression, expected] of [
		['boolean', boolean],
		['Boolean', boolean],
		['true', boolean],
		['false', boolean],
		['string', string],
		['String', string],
		['number', number],
		['Number', number],
		['bigint', name('bigint')],
		['symbol', name('symbol')],
		['void', name('void')],
		['null', nullish('null')],
		['undefined', nullish('undefined')],
		['any', unknown],
		['unknown', unknown],
		['never', unknown],
		['boolean | string', union(boolean, string)],
		['Booleanish', name('Booleanish')],
		['boolean[]', array],
		['boolean = string', unknown],
		['Boolean<string>', unknown],
		['boolean;', unknown],
	]) {
		t.assert.deepStrictEqual(parseJSDocumentType(`\uFEFF\t${expression}\r\n\u2028`), expected, expression);
	}
});

test('standalone named types preserve keyword and whole-expression boundaries', t => {
	for (const [expression, expected] of [
		['Array', array],
		['Set', name('Set')],
		['Uint8Array', name('Uint8Array')],
		['My_Options2', name('My_Options2')],
		['𝒱alue', name('𝒱alue')],
		['boolean\u200C', name('boolean\u200C')],
		['function', name('function')],
		['readonlyBoolean', name('readonlyBoolean')],
		['types.readonly', name('types.readonly')],
		['Set[]', array],
		['Set<string>', name('Set')],
		['Set | null', union(name('Set'), nullish('null'))],
		['Set;', unknown],
		['Set/* description */', unknown],
		['Set other', unknown],
		['Set??', unknown],
		['\u200Cboolean', unknown],
		...['readonly', 'keyof', 'typeof', 'infer', 'new', 'extends', 'is', 'asserts', 'import'].map(expression => [expression, unknown]),
	]) {
		t.assert.deepStrictEqual(parseJSDocumentType(`\uFEFF\t${expression}\r\n\u2028`), expected, expression);
	}
});

for (const [description, expression, expected] of [
	['primitive lowercase', 'boolean', boolean],
	['string alias', 'String', string],
	['number alias', 'Number', number],
	['bigint primitive', 'bigint', name('bigint')],
	['symbol primitive', 'symbol', name('symbol')],
	['bigint wrapper name is not a primitive alias', 'BigInt', name('BigInt')],
	['symbol wrapper name is not a primitive alias', 'Symbol', name('Symbol')],
	['void primitive', 'void', name('void')],
	['true literal', 'true', boolean],
	['false literal', 'false', boolean],
	['null literal', 'null', nullish('null')],
	['undefined literal', 'undefined', nullish('undefined')],
	['any type', 'any', unknown],
	['unknown type', 'unknown', unknown],
	['never type', 'never', unknown],
	['wildcard type', '*', unknown],
	['bare unknown marker', '?', unknown],
	['object name', 'Object', name('Object')],
	['capitalized custom name', 'Booleanish', name('Booleanish')],
	['case sensitive custom name', 'BOOLEAN', name('BOOLEAN')],
	['qualified wrapper name', 'types.Boolean', name('types.Boolean')],
	['qualified generic name', 'globalThis.ReadonlyArray<string>', name('globalThis.ReadonlyArray')],
	['dollar identifier', '$Value', name('$Value')],
	['underscore identifier', '_Value2', name('_Value2')],
	['underscore followed by digits is a name', '_1', name('_1')],
	['non-ASCII identifier', '結果', name('結果')],
	['Unicode identifier continuation', 'A\u200DB', name('A\u200DB')],
	['whitespace between tokens', '\t Array \n < boolean > \r\n', array],
	['zero literal', '0', number],
	['negative integer literal', '-42', number],
	['fractional literal', '3.125', number],
	['trailing decimal point', '1.', number],
	['negative trailing decimal point', '-1.', number],
	['trailing decimal before exponent', '1.e3', number],
	['separated decimal before trailing point', '1_000.', number],
	['trailing decimal inside array', 'Array<1.>', array],
	['leading decimal literal', '.5', number],
	['negative fractional literal', '-0.25', number],
	['positive exponent literal', '1e+3', number],
	['negative exponent literal', '1E-3', number],
	['hexadecimal literal', '0xDEAD', number],
	['binary literal', '0B1010', number],
	['octal literal', '0o755', number],
	['decimal separators', '1_234.5_6e7_8', number],
	['hexadecimal separators', '0xDE_AD', number],
	['bigint literal', '42n', name('bigint')],
	['negative bigint literal', '-42n', name('bigint')],
	['negative hexadecimal literal', '-0xCA_FE', number],
	['negative hexadecimal bigint literal', '-0xCA_FEn', name('bigint')],
	['hexadecimal bigint with exponent letters', '0xDE_ADn', name('bigint')],
	['binary bigint literal', '0b10_01n', name('bigint')],
	['octal bigint literal', '0o7_55n', name('bigint')],
	['empty double quoted literal', '""', string],
	['empty single quoted literal', '\'\'', string],
	['quoted punctuation is not syntax', '"(){}<>[]|&?:="', string],
	['single quoted punctuation', '\'a | b => Array<number>\'', string],
	['escaped quote', String.raw`"a\"b"`, string],
	['escaped backslash', String.raw`"a\\b"`, string],
	['escaped newline character', String.raw`"a\nb"`, string],
	['hexadecimal string escape', String.raw`"\x7f"`, string],
	['Unicode string escape', String.raw`"\u0061"`, string],
	['braced Unicode string escape', String.raw`"\u{1F600}"`, string],
	['escaped backslash before invalid Unicode escape text', String.raw`"\\uGGGG"`, string],
	['escaped backslash before invalid hexadecimal escape text', String.raw`"\\xGG"`, string],
	['escaped backslash followed by Unicode escape', String.raw`"\\\u0061"`, string],
	['nullable prefix', '?boolean', nullable(boolean)],
	['nullable suffix', 'boolean?', nullable(boolean)],
	['optional suffix', 'boolean=', optional(boolean)],
	['nonnullable prefix', '!boolean', boolean],
	['nonnullable suffix', 'boolean!', boolean],
	['nonnullable outer array with nullable elements', '!Array<?boolean>', array],
	['optional nonnullable outer array', '!Array<boolean>=', optional(array)],
	['nonnullable prefix preserves an explicit null union', '!(boolean | null)', union(boolean, nullish('null'))],
	['nonnullable suffix preserves an explicit null union', '(boolean | null)!', union(boolean, nullish('null'))],
	['parenthesized primitive', '(((boolean)))', boolean],
	['nullable optional primitive', '?boolean=', optional(nullable(boolean))],
	['optional nullable primitive', '(?boolean)=', optional(nullable(boolean))],
	['nullable union', '?(boolean | string)', nullable(union(boolean, string))],
	['nullable union member', '?boolean | string', union(nullable(boolean), string)],
	['optional union', '(boolean | string)=', optional(union(boolean, string))],
	['literal boolean union', 'true | false', union(boolean, boolean)],
	['nullish union', 'boolean | null | undefined', union(boolean, nullish('null'), nullish('undefined'))],
	['leading union separator', '| boolean | null', union(boolean, nullish('null'))],
	['leading intersection separator', '& boolean & {brand: string}', intersection(boolean, nonPrimitive)],
	['leading separators after grouping', '(| boolean | (& string & {}))', union(boolean, intersection(string, unknown))],
	['leading union separator in generic', 'Array<| string | number>', array],
	['leading union separator in callback return', '() => | boolean | undefined', callable(union(boolean, nullish('undefined')))],
	['intersection before union', 'boolean | Foo & Bar', union(boolean, intersection(name('Foo'), name('Bar')))],
	['parenthesized union in intersection', '(boolean | Foo) & Bar', intersection(union(boolean, name('Foo')), name('Bar'))],
	['unknown union member', 'boolean | ?', union(boolean, unknown)],
	['postfix array', 'boolean[]', array],
	['multidimensional array', 'boolean[][]', array],
	['nullable array', '?boolean[]', nullable(array)],
	['array of nullable elements', '(?boolean)[]', array],
	['optional array', 'boolean[]=', optional(array)],
	['array of union elements', '(boolean | string)[]', array],
	['readonly array', 'readonly boolean[]', array],
	['readonly tuple', 'readonly [boolean, string]', array],
	['empty tuple', '[]', array],
	['heterogeneous tuple', '[boolean, string, number]', array],
	['tuple trailing comma', '[boolean,]', array],
	['optional tuple member', '[boolean=]', array],
	['tuple with rest type', '[boolean, ...string[]]', array],
	['nested tuple', '[[boolean], [string, number]]', array],
	['labeled tuple', '[value: boolean]', array],
	['optional labeled tuple member', '[value?: boolean]', array],
	['rest labeled tuple member', '[...values: boolean[]]', array],
	['mixed labeled tuple members', '[first: boolean, second?: string, ...rest: number[]]', array],
	['labeled tuple with unknown element', '[value: unknown]', array],
	['labeled tuple with callback element', '[predicate: (value: string) => boolean]', array],
	['readonly labeled tuple', 'readonly [value: boolean]', array],
	['labeled tuple inside generic', 'Array<[value: boolean]>', array],
	['labeled tuple with nullable element', '[value: ?boolean]', array],
	['mixed labeled and unlabeled tuple', '[value: boolean, string]', array],
	['named generic', 'Promise<boolean>', name('Promise')],
	['Closure generic', 'Array.<boolean>', array],
	['generic with unknown argument', 'Array<any>', array],
	['generic with wildcard argument', 'Array<*>', array],
	['generic with unknown marker', 'Array<?>', array],
	['generic with nullable argument', 'Array<?boolean>', array],
	['generic with union argument', 'Array<boolean | string>', array],
	['multiple generic arguments', 'Map<string, Set<boolean>>', name('Map')],
	['generic trailing comma', 'Array<boolean,>', array],
	['generic containing callback', 'Array<(value: boolean) => string>', array],
	['generic containing record', 'Array<{value: boolean}>', array],
	['readonly generic', 'readonly ReadonlyArray<boolean>', name('ReadonlyArray')],
	['empty record retains unknown evidence', '{}', unknown],
	['whitespace-only record retains unknown evidence', '{\n\t}', unknown],
	['array of empty records', 'Array<{}>', array],
	['callback returning an empty record', '() => {}', callable(unknown)],
	['plain record', '{value: boolean}', nonPrimitive],
	['record shorthand', '{value}', nonPrimitive],
	['record typed and shorthand fields', '{a: number, b: string, c}', nonPrimitive],
	['record shorthand with separators', '{first; second, third;}', nonPrimitive],
	['record shorthand inside generic', 'Array<{value}>', array],
	['record shorthand inside callback', 'function({value}): boolean', callable(boolean)],
	['record shorthand inside tuple', '[{value}, {other: string}]', array],
	['optional record shorthand', '{value?}', nonPrimitive],
	['readonly record shorthand', '{readonly value}', nonPrimitive],
	['shorthand property named readonly', '{readonly}', nonPrimitive],
	['shorthand property named readonly before comma', '{readonly, value}', nonPrimitive],
	['shorthand property named readonly before semicolon', '{readonly; value: boolean}', nonPrimitive],
	['array of shorthand properties named readonly', 'Array<{readonly}>', array],
	['record shorthand followed by indexed member', '{value; [key: string]: unknown}', nonPrimitive],
	['optional record property', '{value?: boolean}', nonPrimitive],
	['quoted record key', '{"a-b": boolean}', nonPrimitive],
	['numeric record key', '{0: boolean}', nonPrimitive],
	['fractional record key without integer part', '{.5: boolean}', nonPrimitive],
	['generic containing fractional record key', 'Array<{.5: boolean}>', array],
	['hexadecimal bigint record key', '{0xFEn: boolean}', nonPrimitive],
	['semicolon record separator', '{a: boolean; b: string;}', nonPrimitive],
	['comma record separator', '{a: boolean, b: string,}', nonPrimitive],
	['newline record separator', '{first: boolean\n second: string}', nonPrimitive],
	['CRLF record separator', '{first: boolean\r\n second: string}', nonPrimitive],
	['newline after shorthand record member', '{first\n second: string}', nonPrimitive],
	['newline after record index signature', '{[key: string]: boolean\n ready: boolean}', nonPrimitive],
	['newline after callback record member', '{value: () => boolean\n label: string}', nonPrimitive],
	['newline after nullable callback result', '{result: (value: string) => boolean | undefined\n label: string}', nonPrimitive],
	['escaped record key before newline index signature', String.raw`Array<{"a\"b": boolean
[index: number]: string}>`, array],
	['newline record members inside generic', 'Array<{first: boolean\n second: string}>', array],
	['mixed record separators', '{first: boolean\n second: string; third: number,\n last}', nonPrimitive],
	['nested newline record members', '{value: {nested: boolean\n optional?: string}\n label: string}', nonPrimitive],
	['nested record', '{value: {nested: Array<boolean>}}', nonPrimitive],
	['record callback', '{test: (value: string) => boolean}', nonPrimitive],
	['unknown marker before record close', '{value: ?}', nonPrimitive],
	['unknown marker before record semicolon', '{value: ?; label: string}', nonPrimitive],
	['unknown marker in generic record', 'Array<{value: ?}>', array],
	['unknown marker in callback record', 'function({value: ?}): boolean', callable(boolean)],
	['record method signature', '{value(): boolean}', nonPrimitive],
	['record method optional typed parameter', 'Array<{test(value?: string): boolean}>', array],
	['optional record method', '{test?(value: string): boolean}', nonPrimitive],
	['record method rest parameter', '{test(...values: string[]): boolean}', nonPrimitive],
	['record method without return annotation', '{test(value)}', nonPrimitive],
	['record method with callback return', '{test(): () => boolean}', nonPrimitive],
	['record method with union return and following field', 'Array<{test(): boolean | undefined; value: string}>', array],
	['record method newline separator', 'Array<{test(): boolean\n value: string}>', array],
	['quoted record method name', '{"is-ready"(): boolean}', nonPrimitive],
	['numeric record method name', '{0(): string}', nonPrimitive],
	['record method returning the unknown marker', 'Array<{read(): ?}>', array],
	['record method returning an unknown value', 'Array<{read(): unknown}>', array],
	['record callback parameter preserves enclosing result', 'function({test(value: string): boolean}): string', callable(string)],
	['readonly record property', '{readonly value: boolean}', nonPrimitive],
	['readonly optional record property', '{readonly value?: boolean}', nonPrimitive],
	['property named readonly', '{readonly: boolean}', nonPrimitive],
	['optional property named readonly', '{readonly?: boolean}', nonPrimitive],
	['readonly quoted property', '{readonly "value": boolean}', nonPrimitive],
	['record string index signature', '{[key: string]: boolean}', nonPrimitive],
	['record number index signature', '{[index: number]: string}', nonPrimitive],
	['record symbol index signature', '{[key: symbol]: unknown}', nonPrimitive],
	['readonly index signature', '{readonly [key: string]: boolean}', nonPrimitive],
	['index signature and named member', '{[key: string]: boolean; ready: boolean}', nonPrimitive],
	['array of readonly records', 'Array<{readonly value: boolean}>', array],
	['array of indexed records', 'Array<{[key: string]: boolean}>', array],
	['indexed record containing callback', '{[key: string]: (value: boolean) => string}', nonPrimitive],
	['variadic primitive', '...boolean', nonPrimitive],
	['variadic array', '...boolean[]', nonPrimitive],
	['JSDoc empty callback', 'function(): boolean', callable(boolean)],
	['JSDoc callback without return annotation', 'function(boolean)', callable(unknown)],
	['JSDoc typed callback parameters', 'function(string, number): boolean', callable(boolean)],
	['JSDoc optional callback argument', 'function(boolean=): string', callable(string)],
	['JSDoc rest callback argument', 'function(...string): boolean', callable(boolean)],
	['JSDoc callback this binding', 'function(this: Object, string): boolean', callable(boolean)],
	['JSDoc nullable callback return', 'function(): ?boolean', callable(nullable(boolean))],
	['JSDoc union callback return', 'function(): boolean | undefined', callable(union(boolean, nullish('undefined')))],
	['JSDoc boolean literal union return', 'function(): true | false', callable(union(boolean, boolean))],
	['JSDoc string union return', 'function(): string | "fallback"', callable(union(string, string))],
	['JSDoc array union return', 'function(): Array<boolean> | Array<string>', callable(union(array, array))],
	['JSDoc parenthesized callback in union', '(function(): boolean) | undefined', union(callable(boolean), nullish('undefined'))],
	['JSDoc grouped union callback return', 'function(): (boolean | undefined)', callable(union(boolean, nullish('undefined')))],
	['JSDoc higher-order callback return', 'function(): function(): boolean', callable(callable(boolean))],
	['JSDoc callback parameter with callback return', 'function(function(): boolean): string', callable(string)],
	['arrow empty parameters', '() => boolean', callable(boolean)],
	['arrow unannotated parameter', '(value) => boolean', callable(boolean)],
	['arrow typed parameters', '(value: string, count: number) => boolean', callable(boolean)],
	['arrow optional parameter', '(value?: boolean) => string', callable(string)],
	['arrow this parameter with optional argument', '(this: Object, value?: string) => boolean', callable(boolean)],
	['arrow contextual keyword parameter name', '(is: string) => boolean', callable(boolean)],
	['arrow optional contextual keyword parameter name', '(asserts?: boolean) => string', callable(string)],
	['arrow rest contextual keyword parameter name', '(...keyof: string[]) => boolean', callable(boolean)],
	['record method contextual keyword parameter name', '{test(infer: string): boolean}', nonPrimitive],
	['generic callback contextual keyword parameter name', 'Array<(is: string) => boolean>', array],
	['arrow callback parameter preserves its enclosing return', '(predicate: (value: string) => boolean) => string', callable(string)],
	['arrow rest parameter', '(...values: boolean[]) => string', callable(string)],
	['arrow parameter trailing comma', '(value: boolean,) => string', callable(string)],
	['arrow union return', '() => boolean | undefined', callable(union(boolean, nullish('undefined')))],
	['arrow returning callback', '() => () => boolean', callable(callable(boolean))],
	['parenthesized arrow in union', '(() => boolean) | undefined', union(callable(boolean), nullish('undefined'))],
	['array of callbacks', '(() => boolean)[]', array],
	['optional callable value', '(() => boolean)=', optional(callable(boolean))],
	['nullable callable value', '?(() => boolean)', nullable(callable(boolean))],
]) {
	test(`parses ${description}`, t => {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), expected);
	});
}

for (const [description, expression] of [
	['empty input', ''],
	['whitespace input', '\t\n '],
	['missing group close', '(boolean'],
	['unexpected group close', 'boolean)'],
	['mismatched delimiters', '[boolean)'],
	['empty parentheses', '()'],
	['leading union without member', '|'],
	['doubled leading union separator', '|| boolean'],
	['trailing union separator', 'boolean |'],
	['doubled union separator', 'boolean || string'],
	['leading intersection without member', '&'],
	['doubled leading intersection separator', '&& boolean'],
	['trailing intersection separator', 'boolean &'],
	['doubled intersection separator', 'boolean && string'],
	['adjacent types', 'boolean string'],
	['duplicate nullable prefix', '??boolean'],
	['conflicting nullable prefix', '?!boolean'],
	['duplicate nonnullable prefix', '!!boolean'],
	['duplicate optional suffix', 'boolean=='],
	['duplicate nullable suffix', 'boolean??'],
	['non-type after optional suffix', 'boolean=string'],
	['missing variadic element', '...'],
	['readonly primitive', 'readonly boolean'],
	['readonly non-array generic', 'readonly Promise<boolean>'],
	['dangling namespace separator', 'Foo.'],
	['duplicate namespace separator', 'Foo..Bar'],
	['missing qualified name', '.boolean'],
	['empty generic arguments', 'Array<>'],
	['generic with only comma', 'Array<,>'],
	['generic leading comma', 'Array<,boolean>'],
	['generic doubled comma', 'Array<boolean,,string>'],
	['generic missing separator', 'Array<boolean string>'],
	['nested malformed generic', 'Promise<Array<boolean |>>'],
	['missing generic close', 'Array<boolean'],
	['extra generic close', 'Array<boolean>>'],
	['generic primitive', 'boolean<string>'],
	['generic primitive alias', 'Boolean<string>'],
	['generic literal keyword', 'true<string>'],
	['generic nullish keyword', 'null<string>'],
	['tuple with only comma', '[,]'],
	['tuple leading comma', '[,boolean]'],
	['tuple doubled comma', '[boolean,,string]'],
	['tuple missing separator', '[boolean string]'],
	['tuple missing type after union', '[boolean |]'],
	['tuple label without a type', '[value:]'],
	['optional tuple label without a type', '[value?:]'],
	['rest tuple label without a type', '[...values:]'],
	['tuple label without a name', '[: boolean]'],
	['tuple label with duplicate colon', '[value:: boolean]'],
	['tuple label with malformed union', '[value: boolean |]'],
	['tuple label with unsupported type', '[value: keyof Options]'],
	['tuple label with unsupported nested type', 'Array<[value: typeof source]>'],
	['unclosed array suffix', 'boolean['],
	['array suffix with element', 'boolean[string]'],
	['tuple with mapped type', '[{[Key in Keys]: boolean}]'],
	['empty record property', '{,}'],
	['missing record value', '{value:}'],
	['missing record colon', '{value boolean}'],
	['missing record separator', '{a: boolean b: string}'],
	['newline inside a record value is not a member separator', '{first:\n boolean second: string}'],
	['newline does not supply a missing record value', '{first:\n second: string}'],
	['newline record member with unsupported value', 'Array<{first: boolean\n second: keyof Options}>'],
	['newline record member with invalid string escape', String.raw`Array<{first: boolean
second: "\uGGGG"}>`],
	['newline inside quoted record key', 'Array<{"left\nright": boolean\n other: string}>'],
	['newline is not a generic argument separator', 'Array<boolean\n string>'],
	['newline is not a callback parameter separator', '(first: boolean\n second: string) => boolean'],
	['doubled record separator', '{a: boolean,,}'],
	['record shorthand missing separator', '{first second}'],
	['record shorthand malformed value', '{first, second:}'],
	['record shorthand missing separator before typed field', '{first second: boolean}'],
	['record shorthand and missing index value', '{first, [key: string]}'],
	['record shorthand followed by unsupported value', 'Array<{first, second: keyof Options}>'],
	['record shorthand followed by malformed callback', '{first, second: (value:) => boolean}'],
	['record method missing parameter type', '{value(input:): boolean}'],
	['record method missing return type', 'Array<{value():}>'],
	['record method unsupported return type', 'Array<{value(): keyof Source}>'],
	['record method generic declaration', '{value<T>(input: T): boolean}'],
	['record method missing separator', '{value(): boolean label: string}'],
	['record method malformed optional name', '{value??(): boolean}'],
	['record method invalid nested callback', 'Array<{test(callback: (value:) => boolean): string}>'],
	['record method unclosed parameter list', '{test(value: boolean: string}'],
	['record method doubled parameter separator', '{test(value: boolean,, other: string): boolean}'],
	['record method destructured parameter', '{test({value}: Source): boolean}'],
	['unknown marker followed by invalid record value', 'Array<{value: ?; other: keyof Source}>'],
	['record delimiter is not a callback parameter separator', '(value: ?; other: string) => boolean'],
	['record index signature missing key name', '{[: string]: boolean}'],
	['record index signature missing key type', '{[key:]: boolean}'],
	['record index signature missing value type', '{[key: string]:}'],
	['record index signature missing bracket', '{[key: string: boolean}'],
	['record index signature missing colon', '{[key string]: boolean}'],
	['record index signature unsupported key', '{[key: keyof Options]: boolean}'],
	['record index signature unsupported value', 'Array<{[key: string]: typeof source}>'],
	['readonly record missing name', '{readonly :}'],
	['readonly record missing type', '{readonly value:}'],
	['readonly index missing key type', '{readonly [key:]: boolean}'],
	['readonly record unsupported value', 'Array<{readonly value: keyof Options}>'],
	['record computed key', '{[value]: boolean}'],
	['fractional bigint record key', '{1.5n: boolean}'],
	['exponent bigint record key', '{1e3n: boolean}'],
	['generic containing invalid numeric record key', 'Array<{1.5n: boolean}>'],
	['leading fractional bigint record key', '{.5n: boolean}'],
	['record with unsupported property type', '{value: keyof Foo}'],
	['arrow missing return', '() =>'],
	['arrow missing parameter type', '(value:) => boolean'],
	['arrow empty parameter slot', '(,) => boolean'],
	['arrow leading parameter comma', '(,value) => boolean'],
	['arrow doubled parameter comma', '(value,,other) => boolean'],
	['arrow missing parameter name', '(: string) => boolean'],
	['arrow missing optional parameter type', '(value?:) => boolean'],
	['arrow rest without name', '(...) => boolean'],
	['arrow nested invalid callback', '(value: (,) => string) => boolean'],
	['arrow destructured parameter', '({value}: Foo) => boolean'],
	['arrow default expression', '(value = true) => boolean'],
	['arrow generic declaration', '<T>(value: T) => boolean'],
	['arrow reserved keyword parameter name', '(new: string) => boolean'],
	['arrow inheritance keyword parameter name', '(extends: string) => boolean'],
	['record method reserved keyword parameter name', '{test(typeof: string): boolean}'],
	['generic callback unsupported parameter type', 'Array<(is: keyof Source) => boolean>'],
	['arrow unsupported return', '() => keyof Foo'],
	['JSDoc missing callback argument', 'function(:): boolean'],
	['JSDoc empty callback slot', 'function(,): boolean'],
	['JSDoc doubled callback comma', 'function(boolean,,string): boolean'],
	['JSDoc missing callback return', 'function():'],
	['JSDoc malformed this binding', 'function(this:): boolean'],
	['JSDoc named callback parameter', 'function(value: string): boolean'],
	['JSDoc callback with unsupported argument', 'function(keyof Foo): boolean'],
	['JSDoc constructor signature', 'function(new: Foo): Foo'],
	['JSDoc constructor signature with misleading boolean return', 'function(new: Foo): boolean'],
	['JSDoc constructor signature without return', 'function(new: Foo)'],
	['JSDoc constructor inside generic', 'Array<function(new: Foo): boolean>'],
	['JSDoc constructor inside callback parameter', 'function(function(new: Foo)): boolean'],
	['indexed access', 'Foo["value"]'],
	['type query', 'typeof value'],
	['keyof type', 'keyof Foo'],
	['import type', 'import("module").Foo'],
	['conditional type', 'T extends boolean ? string : number'],
	['inferred type', 'infer Value'],
	['type predicate', '(value: unknown) => value is boolean'],
	['assertion predicate', '(value: unknown) => asserts value'],
	['constructor signature', 'new () => Foo'],
	['template literal', '`value`'],
	// eslint-disable-next-line no-template-curly-in-string
	['template literal generic argument', 'Array<`value${string}`>'],
	['indexed generic argument', 'Array<Foo["value"]>'],
	['conditional generic argument', 'Array<T extends boolean ? string : number>'],
	['unsupported array element', '(keyof Foo)[]'],
	['unsupported tuple element', '[import("module").Foo]'],
	['unsupported record inside generic', 'Array<{value: typeof foo}>'],
	['unsupported arrow inside generic', 'Array<() => keyof Foo>'],
	['decimal trailing separator', '1_'],
	['decimal doubled separator', '1__0'],
	['fraction separator', '1._0'],
	['two decimal points', '1..'],
	['trailing decimal bigint', '1.n'],
	['trailing decimal missing exponent', '1.e'],
	['exponent missing digits', '1e'],
	['exponent separator', '1e_2'],
	['leading decimal zero', '01'],
	['hexadecimal missing digits', '0x'],
	['hexadecimal leading separator', '0x_FF'],
	['invalid binary digit', '0b102'],
	['invalid octal digit', '0o8'],
	['fractional bigint', '1.5n'],
	['exponent bigint', '1e3n'],
	['missing negative literal', '-'],
	['double negative literal', '--1'],
	['unterminated double quote', '"boolean'],
	['unterminated single quote', '\'boolean'],
	['newline inside literal', '"a\nb"'],
	['carriage return inside literal', '"a\rb"'],
	['escaped actual newline', '"a\\\nb"'],
	['incomplete hexadecimal escape', String.raw`"\x1"`],
	['invalid hexadecimal escape', String.raw`"\xGG"`],
	['incomplete Unicode escape', String.raw`"\u123"`],
	['invalid Unicode escape', String.raw`"\uGGGG"`],
	['escaped backslash followed by invalid Unicode escape', String.raw`"\\\uGGGG"`],
	['out of range braced Unicode escape', String.raw`"\u{110000}"`],
	['empty braced Unicode escape', String.raw`"\u{}"`],
	['unclosed braced Unicode escape', String.raw`"\u{123"`],
	['stray punctuation', '#boolean'],
	['stray type terminator', 'boolean;'],
]) {
	test(`keeps ${description} unknown`, t => {
		t.assert.deepStrictEqual(parseJSDocumentType(expression), unknown);
	});
}

test('parses a long flat union without recursive union nesting', t => {
	const elements = Array.from({length: 2000}, () => boolean);
	t.assert.deepStrictEqual(parseJSDocumentType(Array.from({length: 2000}, () => 'boolean').join('|')), union(...elements));
});

test('deep nesting fails conservatively instead of leaking a recursion error', t => {
	t.assert.deepStrictEqual(parseJSDocumentType(`${'('.repeat(20_000)}keyof Foo${')'.repeat(20_000)}`), unknown);
});

test('unterminated escaped quotes stop tokenization without rescanning every quote', t => {
	t.assert.deepStrictEqual(parseJSDocumentType(`"${String.raw`\"`.repeat(20_000)}`), unknown);
});

test('whitespace and an unrecognized token cannot establish a primitive type', t => {
	t.assert.deepStrictEqual(parseJSDocumentType(`${' '.repeat(100_000)}#boolean`), unknown);
});
