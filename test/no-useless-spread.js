import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

const linterConfig = {
	plugins: {unicorn: {rules: {'no-useless-spread': rule}}},
	rules: {'unicorn/no-useless-spread': 'error'},
};

for (const [description, objectText] of [
	['method', '{...{read() { return super.value; }}}'],
	['computed method name', '{...{["read"]() { return super.value; }}}'],
	['lexical arrow', '{...{read() { return (() => super.value)(); }}}'],
	['nested spreads', '{...{...{read() { return super.value; }}}}'],
]) {
	nodeTest(`object spread retains super lookup for ${description}`, t => {
		const code = `const object = ${objectText}; Object.setPrototypeOf(object, {value: 1}); object.read();`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		// Flattened, `super` would read the new prototype and return `1`
		t.assert.strictEqual(runInNewContext(code), undefined);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
	});
}

for (const [description, objectText, callText] of [
	['ordinary method', '{...{read() { return this.value; }}, value: 1}', 'object.read()'],
	['data property', '{...{value: 1}}', 'object.value'],
]) {
	nodeTest(`object spread keeps autofixing a supported ${description}`, t => {
		const code = `const object = ${objectText}; ${callText};`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(runInNewContext(code), 1);
		t.assert.strictEqual(runInNewContext(output), 1);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
	});
}

nodeTest('array literal spread fixes still preserve nested classes using super', t => {
	const code = 'class Base { read() { return 1; } } const classes = [...[class extends Base { read() { return super.read(); } }]]; new classes[0]().read();';
	const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
	t.assert.strictEqual(runInNewContext(code), 1);
	t.assert.strictEqual(runInNewContext(output), 1);
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
});

test({
	valid: [
		'const object = {...(( {read() { return super.value; }} ))};',
		'const object = {...{read() { return super /* keep */ .value; }}};',
		'const object = {...{read() { return super.value?.(); }}};',
		'const object = {\r\n  ...{\r\n    read() { return super.value; },\r\n  },\r\n};',
		'const element = <div>{({...{read() { return super.value; }}})}</div>;',
		'const object = {...{nested: {read() { return super.value; }}}};',
		{
			code: 'const object = {...{read() { return super.value!; }}};',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...{read() { return super.value satisfies unknown; }}};',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...{read() { return (super.value as number | undefined); }}};',
			languageOptions: {parser: parsers.typescript},
		},
	],
	testerOptions: {languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
	invalid: [{
		code: 'const object = {...{read() { return this /* keep */ .value; }}};',
		output: 'const object = {read() { return this /* keep */ .value; }};',
		errors: 1,
	}],
});

nodeTest('copyWithin spread keeps an independent array', t => {
	const code = 'const values = [1, 2, 3]; const clone = [...values.copyWithin(0, 1)]; clone[0] = 9; JSON.stringify({values, clone, same: values === clone});';
	const result = linter.verifyAndFix(code, linterConfig);
	t.assert.strictEqual(runInNewContext(code), '{"values":[2,3,3],"clone":[9,3,3],"same":false}');
	t.assert.strictEqual(runInNewContext(result.output), runInNewContext(code));
	t.assert.strictEqual(result.fixed, false);
	t.assert.deepStrictEqual(result.messages, []);
});

function getIterableSuggestion(code, t) {
	const {fixed, output, messages} = linter.verifyAndFix(code, linterConfig);
	t.assert.strictEqual(fixed, false, code);
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(messages.length, 1, code);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	t.assert.strictEqual(messages[0].suggestions[0].messageId, 'suggestion/remove-iterable-array');
	const {range, text} = messages[0].suggestions[0].fix;
	return code.slice(0, range[0]) + text + code.slice(range[1]);
}

nodeTest('iterable suggestions preserve snapshots and consumption order until applied', t => {
	for (const {code, original, replacement} of [
		{
			code: 'const values = [1, 2, 3]; const result = []; for (const value of [...values]) { values.pop(); result.push(value); } JSON.stringify(result);',
			original: '[1,2,3]',
			replacement: '[1,2]',
		},
		{
			code: outdent`
				const calls = [];
				function* values() { calls.push("source1"); yield 1; calls.push("source2"); yield 2; }
				for (const value of [...values()]) { calls.push("body" + value); }
				JSON.stringify(calls);
			`,
			original: '["source1","source2","body1","body2"]',
			replacement: '["source1","body1","source2","body2"]',
		},
		{
			code: outdent`
				function* values() { yield 1; return 42; }
				function* delegate() { return yield* [...values()]; }
				const iterator = delegate();
				JSON.stringify([iterator.next(), iterator.next()]);
			`,
			original: '[{"value":1,"done":false},{"done":true}]',
			replacement: '[{"value":1,"done":false},{"value":42,"done":true}]',
		},
	]) {
		t.assert.strictEqual(runInNewContext(code), original, code);
		t.assert.strictEqual(runInNewContext(getIterableSuggestion(code, t)), replacement, code);
	}
});

nodeTest('iterable conversions that only store the values are still autofixed', t => {
	for (const consumer of ['[...new Set(VALUES)]', 'new WeakSet(VALUES).has(entry)', 'Array.from(VALUES)', '[...Uint8Array.from(VALUES)]']) {
		const code = outdent`
			const calls = [];
			const entry = [1, 2];
			function* values() { calls.push("source1"); yield entry; calls.push("source2"); entry[0] = 3; yield entry; }
			const result = ${consumer.replace('VALUES', '[...values()]')};
			JSON.stringify({calls, result});
		`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(fixed, true, code);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output, code.replace('[...values()]', 'values()'));
		t.assert.strictEqual(runInNewContext(output), runInNewContext(code), code);
	}
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test({
	valid: [
		'[...values.copyWithin(-2)]',
		'[...[1, 2, 3].copyWithin(0, 1)]',
		{
			code: 'function clone(values: number[]) { return [...values.copyWithin(0, 1)]; }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function clone(values: number[]) { return [...values.copyWithin(0, 1)]; }'),
	],
	invalid: [{
		code: 'const values = [1, 2, 3]; for (const value of [...values.copyWithin(0)]) { values.pop(); consume(value); }',
		errors: [{messageId: 'iterable-to-array-in-for-of', suggestions: 1}],
	}],
});

// Spread in list
test.snapshot({
	valid: [
		'const array = [[]]',
		'const array = [{}]',
		'const object = ({...[]})',
		'foo([])',
		'foo({})',
		'new Foo([])',
		'new Foo({})',
		'const array = [...a]',
		'const object = {...a}',
		'const [first, ...rest] = []',
		'const {foo, ...rest} = {}',
		'function a(foo, ...rest) {}',
	],
	invalid: [
		'const array = [...[a]]',
		'const object = {...{a}}',
		'foo(...[a])',
		'new Foo(...[a])',

		// Trailing comma
		'const array = [...[a,]]',
		'const object = {...{a,}}',
		'foo(...[a,])',
		'new Foo(...[a,])',

		// Trailing comma in parent
		'const array = [...[a,],]',
		'const object = {...{a,},}',
		'foo(...[a,],)',
		'new Foo(...[a,],)',

		// Parentheses
		'const array = [...(( [a] ))]',
		'const object = {...(( {a} ))}',
		'foo(...(( [a] )))',
		'new Foo(...(( [a] )))',

		// Empty
		'const array = [...[]]',
		'const object = {...{}}',
		'foo(...[])',
		'new Foo(...[])',

		// Hole(s)
		'const array = [...[,]]',
		'foo(...[,])',
		'new Foo(...[,])',
		'const array = [...[,,]]',
		'foo(...[,,])',
		'new Foo(...[,,])',
		'const array = [...[a, , b,]]',
		'foo(...[a, , b,])',
		'new Foo(...[a, , b,])',
		'const array = [...[a, , b,],]',
		'foo(...[a, , b,],)',
		'new Foo(...[a, , b,],)',
		'foo(...[,, ,(( a )), ,,(0, b), ,,])',

		// Extra elements/properties
		'const array = [a, ...[a, b]]',
		'const object = {a, ...{a, b}}',
		'foo(a, ...[a, b])',
		'new Foo(a, ...[a, b])',
		'const array = [...[a, b], b,]',
		'const object = {...{a, b}, b,}',
		'foo(...[a, b], b,)',
		'new Foo(...[a, b], b,)',
		'const array = [a, ...[a, b], b,]',
		'const object = {a, ...{a, b}, b,}',
		'foo(a, ...[a, b], b,)',
		'new Foo(a, ...[a, b], b,)',
		'const array = [a, ...[], b]',
		'const array = [a, ...(( [] )),]',
		'const array = [a, ...(( [] ))]',
		'const array = [a, ...[b], c]',
		'const object = {a, ...(({})), b,}',

		// Duplicated keys
		'({a:1, ...{a: 2}})',
		'({...{a:1}, ...{a: 2}})',
		outdent`
			({
				get a() {},
				set a(v) {},
				...{
					get a() {}
				}
			})
		`,
		// Computed
		'({[a]:1, ...{[a]: 2}})',

		outdent`
			const object = {
				a: 1,

				...{
					testKeys() {
						console.assert(Object.keys(this).length === 2)
					}
				}
			}
			object.testKeys();
		`,

		outdent`
			new Foo(
				foo(
					a,
					...[a, b],
					b,
				),
				...[
					a,
					...[
						a,
						b,
					],
					b,
				],
				{
					a: [...[a, b]],
					...{
						a,
						b,
					},
				}
			)
		`,

		// Code from example in `prefer-spread` rule docs
		outdent`
			const baz = [2];
			call(foo, ...[bar, ...baz]);
		`,

		'Promise.all(...[...iterable])',
		'new Map(...[...iterable])',
		'new Set(...[iterable])',

		// Handled by the generic object literal spread fix, not the `Object.assign()` source suggestion.
		'Object.assign(target, {...{a}})',
	],
});

// Object.assign() source object spread
test.snapshot({
	valid: [
		'Object.assign(target, source)',
		'Object.assign(target, {})',
		'Object.assign(target, {foo})',
		'Object.assign(target, {foo, ...source})',
		'Object.assign(target, {...source, foo})',
		'Object.assign?.(target, {...source})',
		'Object?.assign(target, {...source})',
		'Object[assign](target, {...source})',
		'NotObject.assign(target, {...source})',
		'Object.assign({...source})',
		'Object.assign({...target}, source)',
		'Object.assign(...args, {...source})',
	],
	invalid: [
		'Object.assign(target, {...source})',
		// Two adjacent spread-only sources are each flagged
		'Object.assign(target, {...a}, {...b})',
		'Object.assign(target, first, {...second})',
		'Object.assign(...args, target, {...source})',
		'Object.assign(target, {...first, ...second}, third)',
		'Object.assign(target, {...source,}, third)',
		'Object.assign(target, {...(( source ))})',
		'Object.assign(target, {...(foo, bar)})',
		'Object.assign(target, {/* keep */ ...source})',
	],
});

// Spread in collection constructor
test.snapshot({
	valid: [
		'new Set(iterable)',
		'new NotSet(...iterable)',
		'new namespace.Set(...iterable)',
		'Set(...iterable)',
		'new Uint8Array(...iterable)',
		'new Set(...iterable, extraArgument)',
	],
	invalid: [
		'new Set(...iterable)',
		'new Map(...iterable)',
		'new WeakSet(...iterable)',
		'new WeakMap(...iterable)',
		'new Set(...getNames())',
	],
});

// Iterable to array
test.snapshot({
	valid: [
		'new NotMatchedConstructor([...iterable])',
		'new foo.Map([...iterable])',
		'new Map([...iterable], extraArgument)',
		'new Map()',
		'new Map([,...iterable])',
		'new Map([...iterable, extraElement])',
		'new Map({...iterable})',
		'new Uint8Array(...iterable)',
		'new Uint8Array(before, [...iterable])',
		// A `TypedArray` constructor also takes a primitive, an array-like, or an `ArrayBuffer`, so the spread is not redundant there: `new Uint8Array([...'ab'])` has a length of 2, `new Uint8Array('ab')` 0
		'new Uint8Array([...iterable])',
		'new Float64Array([...iterable])',
		'new Int32Array([...iterable])',
		'new BigInt64Array([...iterable])',
		'new Uint8Array([...iterable], 0)',
		'const typed = new BigUint64Array([...iterable], byteOffset, length)',
		'const typed = new BigUint64Array([...iterable], ...args)',

		'Promise.notMatchedMethod([...iterable])',
		'NotPromise.all([...iterable])',
		'foo.Promise.all([...iterable])',
		'Promise.all?.([...iterable])',
		'Promise?.all([...iterable])',
		'Promise[all]([...iterable])',
		'Promise.all()',
		'Promise.all([...iterable], extraArgument)',
		'Promise.all(...iterable)',
		'Promise.all([,...iterable])',
		'Promise.all([...iterable, extraElement])',
		'Promise.all({...iterable})',

		'Object.notFromEntries([...iterable])',
		'NotObject.fromEntries([...iterable])',
		'Object.fromEntries?.([...iterable])',
		'Object?.fromEntries([...iterable])',
		'Object[fromEntries]([...iterable])',
		'Object.fromEntries()',
		'Object.fromEntries([...iterable], extraArgument)',
		'Object.fromEntries(...iterable)',
		'Object.fromEntries({...iterable})',

		'Uint8Array.notFrom([...iterable])',
		'NotTypedArray.from([...iterable])',
		'Uint8Array.from?.([...iterable])',
		'Uint8Array?.from([...iterable])',
		'Uint8Array.from([...iterable], extraArgument)',
		'Uint8Array.from(...iterable)',
		'Uint8Array.from({...iterable})',

		'for (const [...iterable] of foo);',
		'for (const foo of bar) [...iterable];',
		'for (const foo of [,...iterable]);',
		'for (const foo of [...iterable, extraElement]);',
		'for (const foo of {...iterable});',
		'for (const foo in [...iterable]);',

		'function * fn() {yield [...iterable];}',
		'function * fn() {yield* [...iterable, extraElement];}',
		'function * fn() {yield* {...iterable};}',
	],
	invalid: [
		'const map = new Map([...iterable])',
		'const weakMap = new WeakMap([...iterable])',
		'const set = new Set([...iterable])',
		'const weakSet = new WeakSet([...iterable])',
		'const promise = Promise.all([...iterable])',
		'const promise = Promise.allSettled([...iterable])',
		'const promise = Promise.any([...iterable])',
		'const promise = Promise.race([...iterable])',
		'const array = Array.from([...iterable])',
		'const typed = BigUint64Array.from([...iterable])',
		'const object = Object.fromEntries([...iterable])',
		'for (const foo of [...iterable]);',
		'async () => {for await (const foo of [...iterable]);}',

		// Trailing comma
		'const map = new Map([...iterable,])',
		'for (const foo of [...iterable,]);',
		'const map = new Map([...iterable,],)',

		// Parentheses
		'const map = new Map([...(( iterable ))])',
		'for (const foo of [...(( iterable ))]);',
		'const map = new Map((( [...(( iterable ))] )))',
		'for (const foo of (( [...(( iterable ))] )));',
		'for (const foo of[...iterable]);',

		...[
			'[...iterable]',
			'[...iterable,]',
			'(( [...iterable] ))',
			'(( [...(( iterable ))] ))',
		].map(code => outdent`
			function * fn() {
				yield * ${code};
			}
		`),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'for (const value of [...(first || second)]) { consume(value); }',
		'for (const value of [.../* keep */ values,]) { consume(value); }',
		'Promise.all((( [...(( values ))] )))',
		'function* delegate() { return yield* [.../* keep */ values]; }',
		{
			code: 'function consume(values: number[]) { for (const value of [...(values as number[])]) { values.pop(); use(value); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Object.fromEntries([...(values! satisfies Iterable<[string, number]>)])',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// Cloning an immediate array
test.snapshot({
	valid: [
		'[...not.array]',
		'[...not.array()]',
		'[...array.unknown()]',
		'[...Object.notReturningArray(foo)]',
		'[...NotObject.keys(foo)]',
		'[...Int8Array.from(foo)]',
		'[...Int8Array.of()]',
		'[...new Int8Array(3)]',
		'[...Promise.all(foo)]',
		'[...Promise.allSettled(foo)]',
		'[...await Promise.all(foo, extraArgument)]',
		// Can be `Iterator` methods
		'[...foo.filter(bar)]',
		'[...foo.flatMap(bar)]',
		'[...foo.map(bar)]',
		typeAware('function foo(array: number[]) { return [...array]; }'),
		{
			code: 'function foo(array: number[]) { return [...array]; }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('const data = new Map([["a", 1], ["b", 2], ["c", 3]]); const foo = [...data.values().map(value => value * 2)];'),
		typeAware('function foo(value: string) { return [...value.slice(1)]; }'),
		typeAware('function foo(value: {slice(start: number): string}) { return [...value.slice(1)]; }'),
		typeAware('function foo(value: {split(separator: string): string}) { return [...value.split("|")]; }'),
		typeAware('function foo(value: {concat(value: string): string}) { return [...value.concat("bar")]; }'),
		typeAware('function foo(value: {map(): number[]}) { return [...value.map()]; }'),
		typeAware('function foo(value: {slice(start: number): number[]}) { return [...value.slice(1)]; }'),
		typeAware('function foo(value: Int32Array) { return [...value.slice(1)]; }'),
		typeAware('class ArraySubclass extends Array<number> {} function foo(value: ArraySubclass) { return [...value.slice(1)]; }'),
		{
			code: 'function foo(value: string) { return [...value.slice(1)]; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: Int32Array) { return [...value.slice(1)]; }',
			languageOptions: {parser: parsers.typescript},
		},
		// `Iterator.concat()`
		'[...Iterator.concat(bar)]',
	],
	invalid: [
		'[...foo.concat(bar)]',
		'[...foo.flat()]',
		'[...foo.slice(1)]',
		'[...foo.splice(1)]',
		'[...foo.toReversed()]',
		'[...foo.toSorted()]',
		'[...foo.toSpliced(0, 1)]',
		'[...foo.with(0, bar)]',
		'[...foo.split("|")]',
		'[...Object.keys(foo)]',
		'[...Object.values(foo)]',
		'[...Array.from(foo)]',
		'[...Array.of()]',
		'[...new Array(3)]',
		'[...await Promise.all(foo)]',
		'[...await Promise.allSettled(foo)]',
		typeAware('function foo(array: number[]) { return [...array.map(value => value * 2)]; }'),
		typeAware('function foo(array: number[]) { return [...array.filter(Boolean)]; }'),
		typeAware('function foo(array: number[]) { return [...array.flatMap(value => value)]; }'),
		outdent`
			function foo(bar) {
				return[...Object.keys(bar)];
			}
		`,
		outdent`
			function foo(bar) {
				return[
					...Object.keys(bar)
				];
			}
		`,
		outdent`
			function foo(bar) {
				return[
					...(
						Object.keys(bar)
					)
				];
			}
		`,
		outdent`
			function foo(bar) {
				return([
					...Object.keys(bar)
				]);
			}
		`,
	],
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: 'for (const foo of[...iterable2]);',
			errors: [{
				messageId: 'iterable-to-array-in-for-of',
				suggestions: [{messageId: 'suggestion/remove-iterable-array', output: 'for (const foo of iterable2);'}],
			}],
		},
	],
});

// Removing the brackets drops the array-literal grouping, a low-precedence spread argument needs its own parentheses
test({
	valid: [],
	invalid: [
		{
			code: 'const n = [...await Promise.all(x)].length;',
			output: 'const n = (await Promise.all(x)).length;',
			errors: 1,
		},
		{
			code: 'const n = [...await Promise.all(x)][0];',
			output: 'const n = (await Promise.all(x))[0];',
			errors: 1,
		},
		{
			code: 'const n = [...await Promise.all(x)].map(f);',
			output: 'const n = (await Promise.all(x)).map(f);',
			errors: 1,
		},
		{
			code: 'const n = [...await Promise.all(x)]?.length;',
			output: 'const n = (await Promise.all(x))?.length;',
			errors: 1,
		},
	],
});

test({
	valid: [
		// `__proto__` in an object literal sets the prototype, but a spread only copies own properties, so the braces matter
		'const o = {...{__proto__: p}};',
		'x = {...{"__proto__": p}};',
		'x = {__proto__: a, ...{__proto__: b}};',
		'x = {...{a, __proto__: p}};',
	],
	invalid: [
		// Computed and shorthand `__proto__` keys create own properties
		{
			code: 'x = {...{["__proto__"]: p}};',
			output: 'x = {["__proto__"]: p};',
			errors: 1,
		},
		{
			code: 'x = {...{__proto__}};',
			output: 'x = {__proto__};',
			errors: 1,
		},
	],
});
