import {stripTypeScriptTypes} from 'node:module';
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [
		'/** @param {string} text\n * @param {unknown} other */ function run(text, other) { return (flag ? text : other).includes("x") === true; }',
		'/** @param {?Uint8Array} values */ function run(values) { return (effect(), values).some(predicate) === true; }',
	],
	invalid: [
		{
			code: '/** @param {string} text */ function run(text) { return (flag ? text : "fallback").startsWith("x") === true; }',
			output: '/** @param {string} text */ function run(text) { return (flag ? text : "fallback").startsWith("x"); }',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: '/** @param {Uint8Array} values */ function run(values) { return (effect(), values).some(predicate) === false; }',
			output: '/** @param {Uint8Array} values */ function run(values) { return !(effect(), values).some(predicate); }',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
	],
});

/* eslint-disable no-template-curly-in-string -- Test cases contain template literal source. */
test({
	valid: [
		'class Values extends Array {} new Values().some(predicate) === true;',
		'tag`${value}`.startsWith("x") === true;',
	],
	invalid: [
		{
			code: 'new Uint8Array(length).every(predicate) === true;',
			output: 'new Uint8Array(length).every(predicate);',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: 'new BigInt64Array(length).includes(value) === false;',
			output: '!new BigInt64Array(length).includes(value);',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: '`${value}`.startsWith("x") === true;',
			output: '`${value}`.startsWith("x");',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: '`${value}`.includes("x") === false;',
			output: '!`${value}`.includes("x");',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
	],
});
/* eslint-enable no-template-curly-in-string */

test({
	valid: [
		'/** @param {?Uint8Array} values */ function run(values) { return values.some(predicate) === true; }',
		'/** @param {Uint8Array | string} values */ function run(values) { return values.includes(value) === true; }',
		'/** @param {BigInt64Array} values */ function run(values) { return values.subarray(1).every(predicate) === true; }',
	],
	invalid: [
		{
			code: '/** @param {Uint8Array} values */ function run(values) { return values["every"](predicate) === true; }',
			output: '/** @param {Uint8Array} values */ function run(values) { return values["every"](predicate); }',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: '/** @param {BigInt64Array} values */ function run(values) { return values["includes"](value) === false; }',
			output: '/** @param {BigInt64Array} values */ function run(values) { return !values["includes"](value); }',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: '/** @param {Uint8Array} values */ function run(values) { return values.includes(value) === false; }',
			output: '/** @param {Uint8Array} values */ function run(values) { return !values.includes(value); }',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: '/** @param {BigInt64Array} values */ function run(values) { return values.every(predicate) === true; }',
			output: '/** @param {BigInt64Array} values */ function run(values) { return values.every(predicate); }',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: '/** @param {Array<number> | Uint8Array} values */ function run(values) { return values.some(predicate) === true; }',
			output: '/** @param {Array<number> | Uint8Array} values */ function run(values) { return values.some(predicate); }',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
	],
});

test({
	valid: [
		'/** @type {function(this): boolean} */ const predicate = () => "no"; predicate() === true;',
		'/** @param {function(this, string): boolean} predicate */ function run(predicate) { return predicate() === true; }',
		'/** @type {{(): boolean; label: string}} */ let predicate; predicate === true;',
		'/** @type {{(): boolean; (value: string): string}} */ let predicate; predicate() === true;',
		'/** @type {{readonly(): boolean}} */ let predicate; predicate() === true;',
	],
	invalid: [{
		code: '/** @param {{(): boolean; label: string}} predicate */ function run(predicate) { return predicate() === true; }',
		output: '/** @param {{(): boolean; label: string}} predicate */ function run(predicate) { return predicate(); }',
		errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
	}],
});

test({
	valid: [
		'/** @returns {boolean} */ let read = () => source; read = replacement; read() === true;',
		'/** @type {((value: string) => boolean) & ((value: number) => string)} */ const read = value => typeof value === "string" ? true : "yes"; if (read(1) === true) { consume(); }',
		'function run(...values) { values = replacement; return values.some(predicate) === true; }',
		{
			code: '/** @returns {boolean} */ let read = (): unknown => true; read() === true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Result = string; /** @type {() => boolean} */ const read = (): Result => { type Result = boolean; return "text"; }; read() === true;',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		{
			code: '/** @returns {boolean} */ let read = () => source; read() === true;',
			output: '/** @returns {boolean} */ let read = () => source; read();',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: 'function run(...values) { return values.every(predicate) === true; }',
			output: 'function run(...values) { return values.every(predicate); }',
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: 'function run(text: string) { return text.includes("x") === false; }',
			output: 'function run(text: string) { return !text.includes("x"); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
		{
			code: 'type Result = boolean; /** @type {() => string} */ const read = (): Result => { type Result = string; return source; }; read() === true;',
			output: 'type Result = boolean; /** @type {() => string} */ const read = (): Result => { type Result = string; return source; }; read();',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
	],
});

test({
	valid: [
		'class Foo {} /** @type {function(new: Foo): boolean} */ const predicate = function () { return "no"; }; predicate() === true;',
		'class Foo {} /** @param {function(new: Foo): boolean} predicate */ function run(predicate) { return predicate() === true; }',
	],
	invalid: [{
		code: '/** @type {function(): true | false} */ let predicate; predicate() === true;',
		output: '/** @type {function(): true | false} */ let predicate; predicate();',
		errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
	}],
});

nodeTest('boolean comparison fixes under delete preserve the property reference boundary', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-unnecessary-boolean-comparison': rule}}},
		rules: {'unicorn/no-unnecessary-boolean-comparison': 'error'},
	};

	for (const operator of ['===', '!==']) {
		for (const literal of [true, false]) {
			for (const value of [true, false]) {
				const expression = `delete ((object.value as boolean) ${operator} ${literal})`;
				const code = `"use strict"; const object = {value: ${value}}; const result = ${expression}; JSON.stringify({result, exists: Object.hasOwn(object, "value"), value: object.value});`;
				const {output, fixed, messages} = linter.verifyAndFix(code, config);
				const shouldNegate = operator === '===' ? !literal : literal;
				t.assert.strictEqual(fixed, shouldNegate);
				if (shouldNegate) {
					t.assert.deepStrictEqual(messages, []);
				} else {
					t.assert.strictEqual(output, code);
					t.assert.strictEqual(messages.length, 1);
					t.assert.strictEqual(messages[0].fix, undefined);
				}

				const result = runInNewContext(stripTypeScriptTypes(output));
				t.assert.deepStrictEqual(JSON.parse(result), {result: true, exists: true, value});
			}
		}
	}
});

test({
	valid: [],
	invalid: [
		...[
			'delete ((object.value as boolean) === true);',
			'delete ((object.value as boolean) !== false);',
			'delete (((object.value as boolean) === true) as boolean);',
			'delete ((object.value as boolean) === true)!;',
			'delete (((object.value as boolean) === true) satisfies boolean);',
			'delete (<boolean>((object.value as boolean) === true));',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'no-unnecessary-boolean-comparison'}]})),
		{
			code: 'const result = +((object.value as boolean) === true);',
			output: 'const result = +((object.value as boolean));',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
	],
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

for (const wrap of [code => ({code}), code => ({code, languageOptions: {parser: parsers.typescript}}), typeAware]) {
	test({
		valid: [
			'/** @param {unknown} prefix */ function run(prefix, suffix) { return (prefix + suffix).startsWith("x") === true; }',
			'/** @param {string | number} text */ function run(text) { return (text || "").includes("x") === true; }',
		].map(code => wrap(code)),
		invalid: [
			[
				'/** @param {string} prefix */ function run(prefix, suffix) { return (prefix + suffix).startsWith("x") === true; }',
				'/** @param {string} prefix */ function run(prefix, suffix) { return (prefix + suffix).startsWith("x"); }',
			],
			['function run(value) { return (typeof value).includes("object") === false; }', 'function run(value) { return !(typeof value).includes("object"); }'],
			['function run(value) { return (value = "text").includes("x") === true; }', 'function run(value) { return (value = "text").includes("x"); }'],
			[
				'/** @param {string} text */ function run(text) { return (text || "").startsWith("x") === true; }',
				'/** @param {string} text */ function run(text) { return (text || "").startsWith("x"); }',
			],
		].map(([code, output]) => ({
			...wrap(code),
			output,
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		})),
	});
}

for (const wrap of [code => ({code, languageOptions: {parser: parsers.typescript}}), typeAware]) {
	test({
		valid: [
			'/** @param {boolean} isFlag */ function run(isFlag) { return (isFlag as string) === true; }',
			'/** @param {boolean} isFlag */ function run(isFlag) { return (<boolean | string>isFlag) === true; }',
			'/** @param {string} text */ function run(text) { return (text as {includes(): string}).includes() === true; }',
			'/** @param {Array<string>} values */ function run(values) { return (<{some(): string}>values).some() === false; }',
			'/** @param {string} text */ function run(text) { return (text as string | {includes(): string}).includes() === true; }',
			'/** @param {Uint8Array} values */ function run(values) { return (<Uint8Array | {some(): string}>values).some() === false; }',
		].map(code => wrap(code)),
		invalid: [
			['/** @param {boolean} isFlag */ function run(isFlag) { return (isFlag as unknown) === false; }', '/** @param {boolean} isFlag */ function run(isFlag) { return !(isFlag as unknown); }'],
			['(source as string).includes("x") === true;', '(source as string).includes("x");'],
			['(<Uint8Array>source).some(predicate) === false;', '!(<Uint8Array>source).some(predicate);'],
		].map(([code, output]) => ({
			...wrap(code),
			output,
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		})),
	});
}

test({
	valid: [{
		code: 'type Flag<T> = T extends string ? boolean : string; (source as Flag<string>) === true;',
		languageOptions: {parser: parsers.typescript},
	}],
	invalid: [{
		...typeAware('type Flag<T> = T extends string ? boolean : string; (source as Flag<string>) === true;'),
		output: 'type Flag<T> = T extends string ? boolean : string; (source as Flag<string>);',
		errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
	}],
});

test({
	valid: [
		typeAware('/** @type {string} */ const value = true; value === true;'),
		typeAware('/** @type {Array<boolean>} */ const value = false; value !== false;'),
		typeAware('/** @returns {string} */ function read() { return true; } read() === true;'),
		typeAware('/** @type {() => string} */ const read = () => true; read() === true;'),
		typeAware('/** @type {string} */ const value = true; const alias = value; alias === true;'),
	],
	invalid: [{
		...typeAware('/** @type {unknown} */ const value = true; value === true;'),
		output: '/** @type {unknown} */ const value = true; value;',
		errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
	}, {
		...typeAware('/** @type {unknown} */ const value = true; const alias = value; alias === true;'),
		output: '/** @type {unknown} */ const value = true; const alias = value; alias;',
		errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
	}],
});

test({
	valid: [
		{
			code: '/** @returns {boolean} */ const read: () => unknown = (): boolean => true; read() === true;',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('/** @returns {boolean} */ let read: () => unknown = (): boolean => true; read() === true;'),
	],
	invalid: [],
});

test.snapshot({
	valid: [
		'/** @param {boolean} [value] */ function run(value) { return value === true; }',
		'/** @param {?boolean} value */ function run(value) { return value === true; }',
		'/** @type {unknown} */ const value = true; value === true;',
		// Unknown value. `value === true` is not equivalent to `value` or `Boolean(value)`.
		'value === true',
		'value !== true',
		'value === false',
		'value !== false',
		'true === value',
		'false !== value',

		// Loose equality is out of scope.
		'flag == true',
		'flag != false',

		// Boolean-like names are not proof.
		'isEnabled === true',
		'hasValue !== false',

		// Optional chaining can produce `undefined`.
		'array?.includes(value) === true',

		// No boolean literal comparison.
		'a === b',
		'(a > b) === (c > d)',
		'flag === Boolean(value)',
		'true === false',

		// A `yield` expression evaluates to the value sent back into the generator, not the yielded argument.
		'function * foo() {\n\tconst result = (yield a > b) === true;\n}',
		'function * foo() {\n\tconst result = (flag = yield a > b) === true;\n}',
		'function * foo() {\n\tconst result = (a > b, yield c > d) === false;\n}',
		'function * foo() {\n\tconst result = ((yield a > b) && c > d) === true;\n}',
		{
			code: 'function * foo() {\n\tconst result = ((yield value) as boolean) === true;\n}',
			languageOptions: {parser: parsers.typescript},
		},

		// Nullable or mixed TypeScript types are not guaranteed booleans.
		{
			code: 'let flag: boolean | undefined;\nflag === true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let flag: boolean | string;\nflag !== false;',
			languageOptions: {parser: parsers.typescript},
		},

		// A destructured parameter's type lives on the pattern, not the default value (#3385).
		{
			code: 'const foo = ({bar = false}: {bar?: boolean | \'baz\' | \'\'}) => {\n\tif (bar === false) {}\n\tif (bar === true) {}\n};',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const foo = ([first = false]: Array<boolean | \'baz\'>) => first === false;',
			languageOptions: {parser: parsers.typescript},
		},
		// The default value does not constrain a destructured binding's type.
		'function foo({bar = false}) {\n\treturn bar === false;\n}',
		// The default value does not constrain a parameter's type.
		'function foo(bar = false) {\n\treturn bar === false;\n}',
		// A destructured binding does not have the declarator initializer's type.
		'const {valueOf: condition} = true; condition === true;',
		// With type information, the wider type is respected and the comparison is not reported (#3385).
		typeAware('const foo = ({bar = false}: {bar?: boolean | \'baz\' | \'\'}) => bar === false;'),
	],
	invalid: [
		'const result = (a > b) === true;',
		'const result = (a > b) !== false;',
		'const result = (a > b) === false;',
		'const result = (a > b) !== true;',
		'const result = a > b === true;',
		'const result = a > b === false;',
		'const result = true === (a > b);',
		'const result = false !== (a > b);',
		'const result = false === (a > b);',
		'const result = true !== (a > b);',
		'if ((a > b) === true) {}',
		'if ((a > b) === false) {}',
		'const result = Boolean(value) === true;',
		'const result = !value === false;',
		'async function foo() {\n\tconst result = await (a > b) === false;\n}',
		'const result = (a > b && c > d) === true;',
		'const result = (a > b && c > d) === false;',
		'const result = (a > b ? c > d : e > f) === false;',
		'const result = (flag = a > b) === true;',
		'const result = (a > b, c > d) === false;',
		'const result = ([value].includes(value)) === true;',
		'const result = ((a > b) === true).toString();',
		'const result = ((a > b) === false).toString();',
		'const result = (a > b) /* comment */ === true;',
		'const flag = a > b;\nconst result = flag === true;',
		'function isEnabled() {\n\treturn a > b;\n}\n\nconst result = isEnabled() === true;',
		// With type information, a genuinely boolean destructured binding is detected via the type checker.
		typeAware('const foo = ({bar = false}: {bar?: boolean}) => bar === false;'),
		{
			code: 'let flag: boolean;\nconst result = flag === true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let flag: true | false;\nconst result = false === flag;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const result = (flag as boolean) !== true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const result = <boolean>flag !== true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const result = (flag satisfies boolean) === false;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let flag: boolean;\nconst result = flag! === true;',
			languageOptions: {parser: parsers.typescript},
		},
		// Nested functions are not searched for `yield` expressions.
		'function * foo() {\n\tconst result = [a, b].some(item => item > c) === false;\n}',
		'/** @param {boolean} value */ function run(value) { return value === true; }',
		'/** @type {boolean} */ let value; value === true;',
		'/** @returns {boolean} */ function predicate() { return value; } predicate() === true;',
	],
});

test({
	valid: [
		'/** @param {boolean} [value] */ function run(/** @type {boolean} */ value) { return value === true; }',
		'/** @param {boolean=} value */ function run(/** @type {boolean} */ value) { return value !== false; }',
		'/** @param {boolean} [value=false] */ function run(/** @type {boolean} */ value = false) { return value === false; }',
		'/** @param {?string} value */ function run(value) { return value.includes("a") === true; }',
		'/** @type {unknown} */ const value = []; value.includes(1) === true;',
	],
	invalid: [{
		code: '/** @param {string} value */ function run(value) { return value.startsWith("a") === true; }',
		output: '/** @param {string} value */ function run(value) { return value.startsWith("a"); }',
		errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
	}],
});

test({
	valid: [
		'/** @type {() => boolean} */ const predicate = async () => true; predicate() === true;',
		'/** @type {() => boolean} */ const predicate = function* () { return true; }; predicate() === true;',
		{
			code: '/** @returns {boolean} */ const predicate: () => string = () => source; predicate() === true;',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [],
});

test({
	valid: [
		'/** @type {unknown} */ const value = true; const alias = value; alias === true;',
		{
			code: '/** @type {unknown} */ const value = true; value! === true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '/** @type {() => boolean} */ const predicate = (): string => "text"; predicate() === true;',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [],
});
