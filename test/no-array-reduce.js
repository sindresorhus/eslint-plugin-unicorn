import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import notFunctionTypes from './utils/not-function-types.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const errorsReduce = [{messageId: 'reduce'}];
const errorsReduceRight = [{messageId: 'reduceRight'}];

// Resolves inferred element types (e.g. `number[]`) via the TypeScript type checker
const typeAware = (code, options) => ({
	code,
	options,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test({
	valid: [
		...[
			'a[b.reduce]()',
			'a(b.reduce)',
			'a.reduce()',
			'a?.reduce()',
			'a.reduce?.()',
			'a.reduce(1, 2, 3)',
			'a.reduce(b, c, d)',
			'[][reduce].call()',
			'[1, 2].reduce.call(() => {}, 34)',

			// First argument is not a function
			...notFunctionTypes.map(data => `foo.reduce(${data})`),

			// Test `.reduce`
			// Not `CallExpression`
			'new foo.reduce(fn);',
			// Not `MemberExpression`
			'reduce(fn);',
			// `callee.property` is not a `Identifier`
			'foo["reduce"](fn);',
			// Computed
			'foo[reduce](fn);',
			// Not listed method or property
			'foo.notListed(fn);// reduce',
			// More or less argument(s)
			'foo.reduce();',
			'foo.reduce(fn, extraArgument1, extraArgument2);',
			'foo.reduce(...argumentsArray)',

			// Test `[].reduce.{call,apply}`
			// Not `CallExpression`
			'new [].reduce.call(foo, fn);',
			// Not `MemberExpression`
			'call(foo, fn);// reduce',
			'reduce.call(foo, fn);',
			// `callee.property` is not a `Identifier`
			'[].reduce["call"](foo, fn);',
			'[]["reduce"].call(foo, fn);',
			// Computed
			'[].reduce[call](foo, fn);',
			'[][reduce].call(foo, fn);',
			// Not listed method or property
			'[].reduce.notListed(foo, fn);',
			'[].notListed.call(foo, fn);// reduce',
			// Not empty
			'[1].reduce.call(foo, fn)',
			// Not ArrayExpression
			'"".reduce.call(foo, fn)',
			// More or less argument(s)
			// We are not checking arguments length

			// Test `Array.prototype.{call,apply}`
			// Not `CallExpression`
			'new Array.prototype.reduce.call(foo, fn);',
			// `callee.property` is not a `Identifier`
			'Array.prototype.reduce["call"](foo, fn);',
			'Array.prototype["reduce"].call(foo, fn);',
			'Array["prototype"].reduce.call(foo, fn);',
			'"Array".prototype.reduce.call(foo, fn);',
			// Computed
			'Array.prototype.reduce[call](foo, fn);',
			'Array.prototype[reduce].call(foo, fn);',
			'Array[prototype].reduce.call(foo, fn);',
			// Not listed method
			'Array.prototype.reduce.notListed(foo, fn);',
			'Array.prototype.notListed.call(foo, fn);// reduce',
			'Array.notListed.reduce.call(foo, fn);',
			// Not `Array`
			'NotArray.prototype.reduce.call(foo, fn);',
			// More or less argument(s)
			// We are not checking arguments length

			// Ignore optional call to avoid false positive on non-array objects
			'array.reduce?.((str, item) => str += item, "")',

			// `reduce-like`
			'array.reducex(foo)',
			'array.xreduce(foo)',
			'[].reducex.call(array, foo)',
			'[].xreduce.call(array, foo)',
			'Array.prototype.reducex.call(array, foo)',
			'Array.prototype.xreduce.call(array, foo)',

			// Second argument is not a function
			...notFunctionTypes.map(data => `Array.prototype.reduce.call(foo, ${data})`),

			// Option: allowSimpleOperations
			'array.reduce((total, item) => total + item)',
			'array.reduce((total, item) => { return total - item })',
			'array.reduce(function (total, item) { return total * item })',
			'array.reduce((total, item) => total + item, 0)',
			'array.reduce((total, item) => { return total - item }, 0 )',
			'array.reduce(function (total, item) { return total * item }, 0)',
			outdent`
				array.reduce((total, item) => {
					return (total / item) * 100;
				}, 0);
			`,
			'array.reduce((total, item) => { return total + item }, 0)',
		].flatMap(testCase => [testCase, testCase.replace('reduce', 'reduceRight')]),
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: Set<number>) { return foo.reduce(fn); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(foo: Map<string, number>) { return foo.reduce(fn); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		// Known array receiver is still flagged (type information)
		{
			code: 'function f(foo: number[]) { return foo.reduce(fn); }',
			languageOptions: {parser: parsers.typescript},
			errors: errorsReduce,
		},
		// A typed array shares `Array#reduce()`, in both of the ways the receiver can be spelled
		{
			code: 'function f(foo: Int32Array) { return foo.reduce(fn); }',
			languageOptions: {parser: parsers.typescript},
			errors: errorsReduce,
		},
		{
			code: 'const foo = new Int32Array(); foo.reduce(fn);',
			errors: errorsReduce,
		},
		// Async callback is reported but not auto-fixed
		{
			code: 'array.reduce(async (total, item) => transform(total, item), initialValue)',
			errors: errorsReduce,
		},
		...[
			'array.reduce((str, item) => str += item, "")',
			'array?.reduce((str, item) => str += item, "")',
			outdent`
				array.reduce((obj, item) => {
					obj[item] = null;
					return obj;
				}, {})
			`,
			'array.reduce((obj, item) => ({ [item]: null }), {})',
			outdent`
				const hyphenate = (str, char) => \`\${str}-\${char}\`;
				["a", "b", "c"].reduce(hyphenate);
			`,
			'[].reduce.call(array, (s, i) => s + i)',
			'[].reduce.call(array, sum);',
			'[].reduce.call(sum);',
			'Array.prototype.reduce.call(array, (s, i) => s + i)',
			'Array.prototype.reduce.call(array, sum);',
			'[].reduce.apply(array, [(s, i) => s + i])',
			'[].reduce.apply(array, [sum]);',
			'Array.prototype.reduce.apply(array, [(s, i) => s + i])',
			'Array.prototype.reduce.apply(array, [sum]);',
			outdent`
				array.reduce((total, item) => {
					return total + doComplicatedThings(item);
					function doComplicatedThings(item) {
						return item + 1;
					}
				}, 0);
			`,

			// Option: allowSimpleOperations
			// Note: simple `+` sums are covered by the `Math.sumPrecise()` snapshot block below
			{
				code: 'array.reduce((total, item) => { return total - item })',
				options: [{allowSimpleOperations: false}],
			},
			{
				code: 'array.reduce(function (total, item) { return total * item })',
				options: [{allowSimpleOperations: false}],
			},
			{
				code: 'array.reduce((total, item) => { return total - item }, 0 )',
				options: [{allowSimpleOperations: false}],
			},
			{
				code: 'array.reduce(function (total, item) { return total * item }, 0)',
				options: [{allowSimpleOperations: false}],
			},
			{
				code: outdent`
					array.reduce((total, item) => {
						return (total / item) * 100;
					}, 0);
				`,
				options: [{allowSimpleOperations: false}],
			},
			'const result = [].reduce.call(array, callback, initialValue);',
			'const result = [].reduce.apply(array, [callback, initialValue]);',
			'const array = []; const result = array.reduce(callback, initialValue);',
			'const array = []; const result = array.reduce(callback);',
			'const array = []; const result = array.reduce(object.callback, initialValue);',
			'const array = []; const result = array.reduce(callback.bind(undefined), initialValue);',
			'const result = array.reduce(callback, initialValue), other = 1;',
			'const callback = array.reduce(callback, initialValue);',
			'const result = getArray().reduce(callback, initialValue);',
			'const result = getArray().reduce((total, item, index, array) => transform(total, item, index, array), initialValue);',
			'const result = array.reduce((total, item) => transform(total, item), initialValue); const array = [];',
			'const {result} = array.reduce(callback, initialValue);',
			'for (const result = array.reduce(callback, initialValue); condition; update()) {}',
			'const result = array.reduce(total => () => total, initialValue);',
			'const result = array.reduce(total => ({method() { return total; }}), initialValue);',
			'const array = []; const result = array.reduce(() => ({method() { return 1; }}), initialValue);',
			'const array = []; const result = array.reduce((total, item) => eval("total + item"), initialValue);',
			'const result = array.reduce(function () { return new.target; }, initialValue);',
			'const result = array.reduce((total, item) => transform(total, item = 1), initialValue);',
			'const result = array.reduce((total, item, index) => transform(total, index = 1), initialValue);',
			'const result = array.reduce((total, item, index, array) => (array = [], total), initialValue);',
			'const array = []; const result = array.reduce((total, item, index, array) => array.push(item) && total, initialValue);',
			'const array = []; const result = array.reduce((total, item) => (void item, total), initialValue);',
			'const array = []; const result = array.reduce((total, item, index, array) => mutate({array}) || total + item, initialValue);',
			'const result = array.reduce((total, item) => (result = 1, total + item), initialValue);',
			'const result = array.reduce((total, item) => transform(result, item), initialValue);',
			'const result = array.reduce(callback, initialValue); result = 1;',
			'let array = []; const result = array.reduce(callback, array = []);',
			'let array = []; const result = array.reduce((total, item) => (array = [], total), initialValue);',
			'let array = []; const result = array.reduce((total, item) => transform(total, item), getInitialValue());',
			'const result = array.reduce((total, item) => (array.push(item), total), initialValue);',
			'const array = []; const result = array.reduce((total, item) => total.push(item) && total, array);',
			'const array = []; const initialValue = array; const result = array.reduce((total, item) => total.push(item) && total, initialValue);',
			'const array = []; const result = array.reduce((total, item) => append(total, item), array);',
			'const array = []; const initialValue = array; const result = array.reduce((total, item) => append(total, item), initialValue);',
			'const array = []; const callback = (total, item) => append(total, item); const result = array.reduce(callback, array);',
			'const array = []; const result = array.reduce((total, item, index, array) => transform(total, item, index, array), initialValue);',
			'const array = []; function callback(total, item, index, array) { return index === 0 ? array.push(item) && total : total + item; } const result = array.reduce(callback, 0);',
			'const array = []; const callback = (total, item) => (array.push(item), total); const result = array.reduce(callback, 0);',
			'const array = []; const result = array.reduce(callback, initialValue); const callback = (total, item) => transform(total, item);',
			outdent`
				const result = array.reduce((total, item) => {
					const value = transform(item);
					return total.concat(value);
				}, []);
			`,
			outdent`
				const result = array.reduce((total, item) => {
					if (item) {
						return transform(total, item);
					}
				}, initialValue);
			`,
			'const result = array.reduce(/* comment */ callback, initialValue);',
			'const array = []; const result = array.reduce((total, item) => transform(total, item), initialValue); // comment',
			outdent`
				const array = [];
				const result = array.reduce((total, item) => transform(total, item), initialValue) // comment
				use(result);
			`,
		].flatMap(testCase => {
			const {code, options} = testCase;

			if (options) {
				return [
					{code, errors: errorsReduce, options},
					{code: code.replace('reduce', 'reduceRight'), errors: errorsReduceRight, options},
				];
			}

			return [
				{code: testCase, errors: errorsReduce},
				{code: testCase.replace('reduce', 'reduceRight'), errors: errorsReduceRight},
			];
		}),
		{
			code: 'const result: Result = array.reduce((total, item) => transform(total, item), initialValue);',
			languageOptions: {parser: parsers.typescript},
			errors: errorsReduce,
		},
		{
			code: 'const result = array.reduce((total: Result, item: Item): Result => transform(total, item), initialValue);',
			languageOptions: {parser: parsers.typescript},
			errors: errorsReduce,
		},
		{
			code: 'const result = array.reduce<Result>((total, item) => transform(total, item), initialValue);',
			languageOptions: {parser: parsers.typescript},
			errors: errorsReduce,
		},
		{
			code: 'const array = []; const callback = (total, item) => transform(total, item); const result = array.reduceRight(callback, initialValue);',
			errors: errorsReduceRight,
		},
		{
			code: 'const array = []; const result = array.reduceRight((total, item) => transform(total, item), initialValue);',
			errors: errorsReduceRight,
		},
		{
			code: 'const array = []; const callback = (total, item) => transform(total, item); const result = array.reduce(callback, initialValue);',
			output: outdent`
				const array = []; const callback = (total, item) => transform(total, item); let result = initialValue;

				for (const [index, element] of array.entries()) {
					result = callback(result, element, index, array);
				}
			`,
			errors: errorsReduce,
		},
		{
			code: 'const array = []; const callback = (total, item) => transform(total, item); const result = array.reduce(callback);',
			output: [
				'const array = []; const callback = (total, item) => transform(total, item); let result;',
				'',
				'for (const [index, element] of array.entries()) {',
				'\tif (index === 0) {',
				'\t\tresult = element;',
				'\t\tcontinue;',
				'\t}',
				'',
				'\tresult = callback(result, element, index, array);',
				'}',
			].join('\n'),
			errors: errorsReduce,
		},
		{
			code: 'const array = []; const callback = (total, item) => transform(total, item); callback.call = () => 0; const result = array.reduce(callback, initialValue);',
			output: outdent`
				const array = []; const callback = (total, item) => transform(total, item); callback.call = () => 0; let result = initialValue;

				for (const [index, element] of array.entries()) {
					result = callback(result, element, index, array);
				}
			`,
			errors: errorsReduce,
		},
		{
			code: 'const array = []; const callback = (total, item) => result + item; const result = array.reduce(callback, initialValue);',
			errors: errorsReduce,
		},
		{
			code: 'const array = []; const result = array.reduce((total, item) => transform(total, item), initialValue);',
			output: outdent`
				const array = []; let result = initialValue;

				for (const [index, item] of array.entries()) {
					result = transform(result, item);
				}
			`,
			errors: errorsReduce,
		},
		{
			code: 'const array = []; const result = array.reduce((total, item) => transform(total, item));',
			output: outdent`
				const array = []; let result;

				for (const [index, item] of array.entries()) {
					if (index === 0) {
						result = item;
						continue;
					}

					result = transform(result, item);
				}
			`,
			errors: errorsReduce,
		},
		{
			code: outdent`
				const array = [];
				const result = array.reduce((total, item) => {
					return transform(total, item);
				}, initialValue);
			`,
			output: outdent`
				const array = [];
				let result = initialValue;

				for (const [index, item] of array.entries()) {
					result = transform(result, item);
				}
			`,
			errors: errorsReduce,
		},
		{
			code: outdent`
				const array = [];
				const result = array.reduce(function (total, item) {
					return transform(total, item);
				}, initialValue);
			`,
			output: outdent`
				const array = [];
				let result = initialValue;

				for (const [index, item] of array.entries()) {
					result = transform(result, item);
				}
			`,
			errors: errorsReduce,
		},
		{
			code: 'const array = []; const result = array.reduce((total, item, index, array) => array ? transform(total, item, index) : total, initialValue);',
			output: outdent`
				const array = []; let result = initialValue;

				for (const [index, item] of array.entries()) {
					result = array ? transform(result, item, index) : result;
				}
			`,
			errors: errorsReduce,
		},
	],
});

// `Math.sumPrecise()` suggestion (only when `allowSimpleOperations` is `false`)
const allowSimpleOperationsDisabled = {allowSimpleOperations: false};
const reported = code => ({code, options: [allowSimpleOperationsDisabled]});
const reportedTypeScript = code => ({...reported(code), languageOptions: {parser: parsers.typescript}});
test.snapshot({
	valid: [
		// Default `allowSimpleOperations: true` keeps sum reduces unreported, so no suggestion
		'array.reduce((a, b) => a + b)',
		'array.reduce((a, b) => a + b, 0)',
		'array.reduceRight((a, b) => a + b)',
	],
	invalid: [
		// Reported with a `Math.sumPrecise()` suggestion
		reported('array.reduce((a, b) => a + b)'),
		reported('array.reduce((total, item) => total + item, 0)'),
		reported('array.reduceRight((a, b) => a + b)'),
		reported('array.reduceRight((a, b) => a + b, 0)'),
		reported('array.reduce((a, b) => b + a)'),
		reported('array.reduce((a, b) => { return a + b; })'),
		reported('array.reduce(function (a, b) { return a + b; })'),
		// Unused extra parameters are fine
		reported('array.reduce((a, b, index) => a + b)'),
		// Various receivers
		reported('(0, array).reduce((a, b) => a + b)'),
		reported('object.values.reduce((a, b) => a + b)'),
		reported('object["values"].reduce((a, b) => a + b)'),
		reported('getNumbers().reduce((a, b) => a + b)'),
		// Nested inside another call
		reported('foo(array.reduce((a, b) => a + b))'),
		// Coexists with the existing for-loop autofix
		reported('const array = []; const sum = array.reduce((a, b) => a + b);'),

		// Reported, but no suggestion
		// Projection (would need `Math.sumPrecise(array.map(…))`)
		reported('array.reduce((a, b) => a + b.length)'),
		// Non-zero initial value
		reported('array.reduce((a, b) => a + b, 10)'),
		// Not a `+` sum
		reported('array.reduce((a, b) => a - b)'),
		reported('array.reduce((a, b) => a * b)'),
		// Operands are not the two parameters
		reported('array.reduce((a, b) => a + a)'),
		reported('array.reduce((a, b, c) => a + b + c)'),
		// Optional chaining changes behavior
		reported('array?.reduce((a, b) => a + b)'),
		// Comment would be dropped
		reported('array.reduce((a, b) => /* keep */ a + b)'),
		// Non-identifier (destructured) parameter
		reported('array.reduce(([a], b) => a + b)'),

		// TypeScript: parameter type annotations
		// Provably a number → suggestion
		reportedTypeScript('array.reduce((a: number, b: number) => a + b)'),
		reportedTypeScript('array.reduce((a, b: number) => a + b)'),
		reportedTypeScript('array.reduce<number>((a, b) => a + b)'),
		// Provably not a number → no suggestion
		reportedTypeScript('array.reduce((a, b: string) => a + b)'),
		reportedTypeScript('array.reduce((a: string, b) => a + b)'),
		reportedTypeScript('array.reduce((a: bigint, b: bigint) => a + b)'),

		// TypeScript: element type inferred from the array via the type checker
		// `number[]` → suggestion
		typeAware('function sum(values: number[]) { return values.reduce((a, b) => a + b); }', [allowSimpleOperationsDisabled]),
		typeAware('function sum(values: readonly number[]) { return values.reduce((a, b) => a + b); }', [allowSimpleOperationsDisabled]),
		// Only the accumulator and element parameters are type-checked, never the (non-number) index/array parameters
		typeAware('function sum(values: number[]) { return values.reduce((a, b, index, all) => a + b); }', [allowSimpleOperationsDisabled]),
		// `string[]` / `boolean[]` / `bigint[]` → no suggestion (`Math.sumPrecise()` would throw)
		typeAware('function concat(values: string[]) { return values.reduce((a, b) => a + b); }', [allowSimpleOperationsDisabled]),
		typeAware('function sum(values: boolean[]) { return values.reduce((a, b) => a + b); }', [allowSimpleOperationsDisabled]),
		typeAware('function sum(values: bigint[]) { return values.reduce((a, b) => a + b); }', [allowSimpleOperationsDisabled]),
		// BigInt typed arrays → no suggestion (`Math.sumPrecise()` would throw)
		reported('new BigInt64Array().reduce((a, b) => a + b)'),
		reported('new BigUint64Array().reduce((a, b) => a + b)'),
		reported('BigInt64Array.from([]).reduce((a, b) => a + b)'),
		reported('BigUint64Array.of(1n).reduce((a, b) => a + b)'),
		reportedTypeScript('function sum(values: BigInt64Array | Int8Array) { return values.reduce((a, b) => a + b); }'),
	],
});
