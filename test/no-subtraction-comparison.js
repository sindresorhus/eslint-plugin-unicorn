import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [],
		invalid: [
			...[
				[
					'/** @param {unknown} value */ function run(value) { return Math.f16round(value) - 1 > 0; }',
					'/** @param {unknown} value */ function run(value) { return Math.f16round(value) > 1; }',
				],
				[
					'/** @param {Date} value */ function run(value) { return value.getUTCFullYear() - 2024 > 0; }',
					'/** @param {Date} value */ function run(value) { return value.getUTCFullYear() > 2024; }',
				],
				[
					'/** @param {Map<string, number>} left\n * @param {ReadonlySet<string>} right */ function run(left, right) { return left.size - right.size > 0; }',
					'/** @param {Map<string, number>} left\n * @param {ReadonlySet<string>} right */ function run(left, right) { return left.size > right.size; }',
				],
				[
					'/** @param {ReadonlySet<string>} values */ function run(values) { return 0 < values.size - 1; }',
					'/** @param {ReadonlySet<string>} values */ function run(values) { return values.size > 1; }',
				],
				[
					'/** @param {string} value */ function run(value) { return value.length - 1 > 0; }',
					'/** @param {string} value */ function run(value) { return value.length > 1; }',
				],
				[
					'/** @param {ReadonlyArray<number>} value */ function run(value) { return value.length - 1 > 0; }',
					'/** @param {ReadonlyArray<number>} value */ function run(value) { return value.length > 1; }',
				],
				[
					'/** @param {BigInt64Array} value */ function run(value) { return value.length - 1 > 0; }',
					'/** @param {BigInt64Array} value */ function run(value) { return value.length > 1; }',
				],
				[
					'/** @param {Array<string>} values */ function run(values) { return values.indexOf("x") - values.lastIndexOf("x") < 0; }',
					'/** @param {Array<string>} values */ function run(values) { return values.indexOf("x") < values.lastIndexOf("x"); }',
				],
				[
					'/** @param {BigUint64Array} values */ function run(values) { return 0 > values.findIndex(Boolean) - values.findLastIndex(Boolean); }',
					'/** @param {BigUint64Array} values */ function run(values) { return values.findIndex(Boolean) < values.findLastIndex(Boolean); }',
				],
				[
					'/** @param {number} first\n * @param {number} second */ function run(first, second) { return first - second > 0; }',
					'/** @param {number} first\n * @param {number} second */ function run(first, second) { return first > second; }',
				],
				[
					'/** @returns {number} */ function read() { return source; } read() - 1 < 0;',
					'/** @returns {number} */ function read() { return source; } read() < 1;',
				],
				[
					'/** @param {() => number} read */ function run(read) { return 0 < read() - 1; }',
					'/** @param {() => number} read */ function run(read) { return read() > 1; }',
				],
				[
					'/** @type {number} */ const value = source; const alias = value; alias - 1 > 0;',
					'/** @type {number} */ const value = source; const alias = value; alias > 1;',
				],
				[
					'/** @param {number} value */ function run(value, cache) { return (cache = value) - 1 > 0; }',
					'/** @param {number} value */ function run(value, cache) { return (cache = value) > 1; }',
				],
				[
					'/** @param {number} first\n * @param {number} second */ function run(first, second) { return (condition ? first : second) - 1 > 0; }',
					'/** @param {number} first\n * @param {number} second */ function run(first, second) { return (condition ? first : second) > 1; }',
				],
				[
					'/** @param {string} text */ function run(text) { return text.charCodeAt(0) - 1 > 0; }',
					'/** @param {string} text */ function run(text) { return text.charCodeAt(0) > 1; }',
				],
				[
					'/** @param {string} value */ function run(/** @type {number} */ value) { return value - 1 > 0; }',
					'/** @param {string} value */ function run(/** @type {number} */ value) { return value > 1; }',
				],
			].map(([code, output]) => ({
				code, output, filename: 'file.ts', errors: [{messageId: 'no-subtraction-comparison/error', suggestions: 0}],
			})),
			...[
				[
					'/** @param {{getTime: () => string}} left\n * @param {{getTime: () => string}} right */ function run(left, right) { return left.getTime() - right.getTime() > 0; }',
					'/** @param {{getTime: () => string}} left\n * @param {{getTime: () => string}} right */ function run(left, right) { return left.getTime() > right.getTime(); }',
				],
				...['unknown', '{size: string}', 'Map<string, number> | {size: string}'].map(type => [
					`/** @param {${type}} left\n * @param {${type}} right */ function run(left, right) { return left.size - right.size > 0; }`,
					`/** @param {${type}} left\n * @param {${type}} right */ function run(left, right) { return left.size > right.size; }`,
				]),
				[
					'/** @param {{length: string}} left\n * @param {{length: string}} right */ function run(left, right) { return left.length - right.length > 0; }',
					'/** @param {{length: string}} left\n * @param {{length: string}} right */ function run(left, right) { return left.length > right.length; }',
				],
				[
					'/** @param {unknown} left\n * @param {unknown} right */ function run(left, right) { return left.length - right.length > 0; }',
					'/** @param {unknown} left\n * @param {unknown} right */ function run(left, right) { return left.length > right.length; }',
				],
				[
					'/** @param {{indexOf: () => string}} values */ function run(values) { return values.indexOf() - values.indexOf() > 0; }',
					'/** @param {{indexOf: () => string}} values */ function run(values) { return values.indexOf() > values.indexOf(); }',
				],
				[
					'/** @param {Array<string>} values */ function run(values) { return values.find(Boolean) - values.findLast(Boolean) < 0; }',
					'/** @param {Array<string>} values */ function run(values) { return values.find(Boolean) < values.findLast(Boolean); }',
				],
				[
					'/** @param {number} [value] */ function run(value) { return value - 1 > 0; }',
					'/** @param {number} [value] */ function run(value) { return value > 1; }',
				],
				[
					'/** @returns {?number} */ function read() { return source; } read() - 1 > 0;',
					'/** @returns {?number} */ function read() { return source; } read() > 1;',
				],
				[
					'/** @returns {number} */ async function read() { return source; } read() - 1 > 0;',
					'/** @returns {number} */ async function read() { return source; } read() > 1;',
				],
				[
					'/** @param {number | string} value */ function run(value) { return value - 1 > 0; }',
					'/** @param {number | string} value */ function run(value) { return value > 1; }',
				],
				[
					'/** @param {number} value */ function run(value) { return value - 1 >= 0; }',
					'/** @param {number} value */ function run(value) { return value >= 1; }',
				],
				[
					'/** @type {unknown} */ const value = source; value - 1 > 0;',
					'/** @type {unknown} */ const value = source; value > 1;',
				],
			].map(([code, output]) => ({
				code,
				filename: 'file.ts',
				errors: [{
					messageId: 'no-subtraction-comparison/error',
					suggestions: [{messageId: 'no-subtraction-comparison/suggestion', output}],
				}],
			})),
			{
				code: '/** @param {number} value */ function run(value) { return value - /* keep */ 1 > 0; }',
				filename: 'file.ts',
				errors: [{messageId: 'no-subtraction-comparison/error', suggestions: 0}],
			},
		],
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [],
		invalid: [{
			code: '/** @param {string} value */ function run(value: number) { return value - 1 > 0; }',
			output: '/** @param {string} value */ function run(value: number) { return value > 1; }',
			filename: 'file.ts',
			errors: [{messageId: 'no-subtraction-comparison/error', suggestions: 0}],
		}, {
			code: '/** @param {number} value */ function run(value: string) { return value - 1 > 0; }',
			filename: 'file.ts',
			errors: [{
				messageId: 'no-subtraction-comparison/error',
				suggestions: [{
					messageId: 'no-subtraction-comparison/suggestion',
					output: '/** @param {number} value */ function run(value: string) { return value > 1; }',
				}],
			}],
		}],
	});
}

test({
	valid: [],
	invalid: [
		...[
			['foo()\n0 < (1) - 2', 'foo()\n;(1) > 2'],
			['const previous = value\n0 > (1) - 2', 'const previous = value\n;(1) < 2'],
			['foo() // keep\n0 === (1) - 2', 'foo() // keep\n;(1) === 2'],
			['foo();\n0 < (1) - 2', 'foo();\n(1) > 2'],
			['if (ready)\n0 < (1) - 2', 'if (ready)\n(1) > 2'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'foo()\n0 < (a as number) - (b as number)',
			output: 'foo()\n;(a as number) > (b as number)',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'foo()\n0 < (a) - b',
			errors: [{
				messageId: 'no-subtraction-comparison/error',
				suggestions: [{messageId: 'no-subtraction-comparison/suggestion', output: 'foo()\n;(a) > b'}],
			}],
		},
	],
});

test.snapshot({
	valid: [
		'a > b',
		'a < b',
		'a === b',
		// Not a comparison
		'a - b',
		// Not compared with `0`
		'a - b > 1',
		'a - b > c',
		'a - b === c',
		// Not a subtraction
		'a + b > 0',
		'a * b > 0',
		'a % b > 0',
		// Neither side is a subtraction
		'a > 0',
		'0 > a',
		'0 > 0',
		// BigInt zero is excluded
		'a - b > 0n',
		// `-0` is a unary expression, not a `0` literal
		'a - b > -0',
		// Not one of the handled operators
		'a - b instanceof c',
	],
	invalid: [
		// The examples from the issue (bare identifiers → suggestion only)
		'if (a - b > 0) {}',
		'if (a - b >= 0) {}',
		'if (a - b < 0) {}',
		'if (a - b <= 0) {}',
		// Equality operators
		'a - b === 0',
		'a - b !== 0',
		'a - b == 0',
		'a - b != 0',
		// Zero on the left (operator flips for relational, stays for equality)
		'0 < a - b',
		'0 <= a - b',
		'0 > a - b',
		'0 >= a - b',
		'0 === a - b',
		'0 !== a - b',
		// Strict comparisons with numeric operands auto-fix; unknown lengths require a suggestion.
		'1 - 2 > 0',
		'foo.length - bar.length > 0',
		'Number(a) - Number(b) < 0',
		'Number.POSITIVE_INFINITY - Number.POSITIVE_INFINITY > 0',
		// Non-strict comparisons with statically known finite numbers → autofix
		'1 - 2 >= 0',
		'1 - 1 === 0',
		// Zero on the left flips the operator.
		'0 < foo.length - bar.length',
		// Non-strict comparisons with non-finite numbers → suggestion
		'Number.POSITIVE_INFINITY - Number.POSITIVE_INFINITY >= 0',
		'Number.POSITIVE_INFINITY - Number.POSITIVE_INFINITY === 0',
		// Non-strict comparisons with non-static operands → suggestion
		'foo.length - bar.length >= 0',
		// Unknown operands require a suggestion.
		'foo.length - bar > 0',
		// `Math.*` is recognized as numeric → autofix
		'Math.round(a) - Math.round(b) > 0',
		// Nested subtraction: `a - b - c > 0` → `a - b > c`
		'a.length - b.length - c > 0',
		// Parenthesized operands are preserved
		'(foo.length) - (bar.length) > 0',
		'const modes = new Set([\'foo\']); modes.clear(); (modes.size ? 1 : \'x\') - (modes.size ? 1 : \'x\') === 0',
		'const modes = new Set([\'foo\']); modes.clear(); ((modes.size && 1) || value) - 1 === 0',
		'const object = {value: true}; Object.defineProperty(object, \'value\', {get() { return false; }}); (object.value ? 1 : value) - 1 === 0',
		{
			code: 'const modes = new Set([\'foo\']); modes.clear(); ((modes.size ? 1 : value) as number) - 1 === 0',
			languageOptions: {parser: parsers.typescript},
		},
		// The whole subtraction parenthesized
		'(a - b) > 0',
		// Optional chaining isn't provably numeric → suggestion
		'a?.b - c?.d > 0',
		// Comments inside → reported, no fix or suggestion
		'a - /* comment */ b > 0',
		// TypeScript numeric annotations → autofix
		{
			code: '(a as number) - (b as number) > 0',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'const alias = condition; var condition = true; (alias ? 1 : value) - 1 === 0',
			errors: [{messageId: 'no-subtraction-comparison/error', suggestions: 1}],
		},
	],
});

test({
	valid: [],
	invalid: [{
		code: '({value: 1}.value - other) > 0;',
		errors: [{
			messageId: 'no-subtraction-comparison/error', suggestions: [{
				messageId: 'no-subtraction-comparison/suggestion',
				output: '({value: 1}.value > other);',
			}],
		}],
	}, ...[
		['(function () {}.length - other) > 0;', '(function () {}.length > other);'],
		['const result = ({value: 1}.value - other) > 0;', 'const result = {value: 1}.value > other;'],
		['function check() { return ({value: 1}.value - other) > 0; }', 'function check() { return {value: 1}.value > other; }'],
		['(({value: 1}.value - other) > 0);', '({value: 1}.value > other);'],
		['({value: 1}.value) - other > 0;', '({value: 1}.value) > other;'],
	].map(([code, output]) => ({
		code,
		errors: [{messageId: 'no-subtraction-comparison/error', suggestions: [{messageId: 'no-subtraction-comparison/suggestion', output}]}],
	}))],
});
