import {outdent} from 'outdent';
import {test} from './utils/test';

const messageId = 'no-useless-undefined';

const errors = [{messageId}];

test({
	valid: [
		'function foo() {return;}',
		'const foo = () => {};',
		'let foo;',
		'var foo;',
		'const foo = undefined;',
		'foo();',
		'foo(bar,);',
		'foo(undefined, bar);',
		'const {foo} = {};',
		'function foo({bar} = {}) {}',
		'function foo(bar) {}',
		// I guess nobody use this, but `yield* undefined;` is valid code, and `yield*;` is not
		'function* foo() {yield* undefined;}',

		// Ignored
		'if (Object.is(foo, undefined)){}',
		't.is(foo, undefined)',
		'assert.equal(foo, undefined, message)',
		'assert.notEqual(foo, undefined, message)',
		'assert.strictEqual(foo, undefined, message)',
		'assert.notStrictEqual(foo, undefined, message)',
		'assert.propertyVal(foo, "bar", undefined, message)',
		'assert.notPropertyVal(foo, "bar", undefined, message)',
		'expect(foo).not(undefined)',
		'expect(foo).to.have.property("bar", undefined)',
		'expect(foo).to.have.property("bar", undefined)',
		'expect(foo).toBe(undefined)',
		'expect(foo).toContain(undefined)',
		'expect(foo).toContainEqual(undefined)',
		'expect(foo).toEqual(undefined)',
		't.same(foo, undefined)',
		't.notSame(foo, undefined)',
		't.strictSame(foo, undefined)',
		't.strictNotSame(foo, undefined)'
	],
	invalid: [
		{
			code: 'function foo() {return undefined;}',
			output: 'function foo() {return;}',
			errors
		},
		{
			code: 'const foo = () => undefined;',
			output: 'const foo = () => {};',
			errors
		},
		{
			code: 'const foo = () => {return undefined;};',
			output: 'const foo = () => {return;};',
			errors
		},
		{
			code: 'function foo() {return       undefined;}',
			output: 'function foo() {return;}',
			errors
		},
		{
			code: 'function foo() {return /* comment */ undefined;}',
			output: 'function foo() {return /* comment */;}',
			errors
		},
		{
			code: 'function* foo() {yield undefined;}',
			output: 'function* foo() {yield;}',
			errors
		},
		{
			code: 'function* foo() {yield                 undefined;}',
			output: 'function* foo() {yield;}',
			errors
		},
		{
			code: 'let a = undefined;',
			output: 'let a;',
			errors
		},
		{
			code: 'let a = undefined, b = 2;',
			output: 'let a, b = 2;',
			errors
		},
		{
			code: 'var a = undefined;',
			output: 'var a;',
			errors
		},
		{
			code: 'var a = undefined, b = 2;',
			output: 'var a, b = 2;',
			errors
		},
		{
			code: 'foo(undefined);',
			output: 'foo();',
			errors
		},
		{
			code: 'foo(undefined, undefined);',
			output: 'foo();',
			errors
		},
		{
			code: 'foo(undefined,);',
			output: 'foo();',
			errors
		},
		{
			code: 'foo(undefined, undefined,);',
			output: 'foo();',
			errors
		},
		{
			code: 'foo(bar, undefined);',
			output: 'foo(bar);',
			errors
		},
		{
			code: 'foo(bar, undefined, undefined);',
			output: 'foo(bar);',
			errors
		},
		{
			code: 'foo(undefined, bar, undefined);',
			output: 'foo(undefined, bar);',
			errors
		},
		{
			code: 'foo(bar, undefined,);',
			output: 'foo(bar,);',
			errors
		},
		{
			code: 'foo(undefined, bar, undefined,);',
			output: 'foo(undefined, bar,);',
			errors
		},
		{
			code: 'foo(bar, undefined, undefined,);',
			output: 'foo(bar,);',
			errors
		},
		{
			code: 'foo(undefined, bar, undefined, undefined,);',
			output: 'foo(undefined, bar,);',
			errors
		},
		// Test report range
		{
			code: outdent`
				foo(
					undefined,
					bar,
					undefined,
					undefined,
					undefined,
					undefined,
				)
			`,
			output: outdent`
				foo(
					undefined,
					bar,
				)
			`,
			errors: [
				{
					messageId,
					// The second `undefined`
					line: 4, column: 2,
					// The last `undefined`
					endLine: 7, endColumn: 11
				}
			]
		},
		{
			code: 'const {foo = undefined} = {};',
			output: 'const {foo} = {};',
			errors
		},
		{
			code: 'const [foo = undefined] = [];',
			output: 'const [foo] = [];',
			errors
		},
		{
			code: 'function foo(bar = undefined) {}',
			output: 'function foo(bar) {}',
			errors
		},
		{
			code: 'function foo({bar = undefined}) {}',
			output: 'function foo({bar}) {}',
			errors
		},
		{
			code: 'function foo({bar = undefined} = {}) {}',
			output: 'function foo({bar} = {}) {}',
			errors
		},
		{
			code: 'function foo([bar = undefined]) {}',
			output: 'function foo([bar]) {}',
			errors
		},
		{
			code: 'function foo([bar = undefined] = []) {}',
			output: 'function foo([bar] = []) {}',
			errors
		}
	]
});

test.typescript({
	valid: [
		// https://github.com/zeit/next.js/blob/3af0fe5cf2542237f34d106872d104c3606b1858/packages/next/build/utils.ts#L620
		'prerenderPaths?.add(entry)'
	],
	invalid: []
});

test.visualize([
	outdent`
		foo(
			undefined,
			bar,
			undefined,
			undefined,
			undefined,
			undefined,
		)
	`,
	'function foo([bar = undefined] = []) {}',
	'foo(bar, undefined, undefined);',
	'let a = undefined, b = 2;'
]);
