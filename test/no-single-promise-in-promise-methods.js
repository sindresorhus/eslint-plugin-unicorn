import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['async function f() {return await(Promise).race([read(/* keep */)]);}', 'async function f() {return await read(/* keep */);}'],
		['async function f() {await(Promise).all([read(/* keep */)]);}', 'async function f() {await read(/* keep */);}'],
		['const[value] = await(Promise).all([read(/* keep */)]);', 'const value = await read(/* keep */);'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [
		['function f() {return(Promise).race([object[/* keep */ key]]);}', 'function f() {return object[/* keep */ key];}', 'function f() {return(Promise).resolve(object[/* keep */ key]);}'],
		['typeof(Promise).race([object[/* keep */ key]]);', 'typeof object[/* keep */ key];', 'typeof(Promise).resolve(object[/* keep */ key]);'],
		[
			'async function f() {return await(Promise).any([read(/* keep */)]);}',
			'async function f() {return await read(/* keep */);}',
			'async function f() {return await(Promise).resolve(read(/* keep */));}',
		],
	].map(([code, unwrapped, resolved]) => ({
		code,
		errors: [{
			messageId: 'no-single-promise-in-promise-methods/error',
			suggestions: [
				{messageId: 'no-single-promise-in-promise-methods/unwrap', output: unwrapped},
				{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: resolved},
			],
		}],
	})),
});

test({
	valid: [],
	invalid: [
		...['const', 'let', 'var'].map(keyword => ({
			code: `${keyword}[value] = await Promise.all([promise]);`,
			output: `${keyword} value = await promise;`,
			errors: 1,
		})),
		{
			code: 'const[value] = await Promise.all([getPromise(/* keep */)]);',
			output: 'const value = await getPromise(/* keep */);',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		...[
			['await Promise.race([getPromise(/* keep */)]);', 'await getPromise(/* keep */);'],
			['const [value] = await Promise.all([(/* keep */ promise)]);', 'const value = await (/* keep */ promise);'],
			['const value = (await Promise.all([getPromise(/* keep */)]))[0];', 'const value = await getPromise(/* keep */);'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'no-single-promise-in-promise-methods/error'}]})),
		{
			code: 'Promise.any([getPromise(/* keep */)]);',
			errors: [{
				messageId: 'no-single-promise-in-promise-methods/error',
				suggestions: [
					{messageId: 'no-single-promise-in-promise-methods/unwrap', output: '(getPromise(/* keep */));'},
					{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: 'Promise.resolve(getPromise(/* keep */));'},
				],
			}],
		},
		{
			code: 'setup()\nPromise.race([getPromise(/* keep */)]);',
			errors: [{
				messageId: 'no-single-promise-in-promise-methods/error',
				suggestions: [
					{messageId: 'no-single-promise-in-promise-methods/unwrap', output: 'setup()\n;(getPromise(/* keep */));'},
					{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: 'setup()\nPromise.resolve(getPromise(/* keep */));'},
				],
			}],
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'await Promise.race([(value as /* keep */ Promise<number>)]);',
			output: 'await (value as /* keep */ Promise<number>);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'await Promise.race([(value // keep\r\n)]);',
			output: 'await (value // keep\r\n);',
			errors: 1,
		},
		...[
			'await Promise./* do not lose */race([getPromise(/* keep */)]);',
			'await Promise.race([/* do not lose */ getPromise(/* keep */)]);',
			'const [/* do not lose */ value] = await Promise.all([getPromise(/* keep */)]);',
			'const value = (await Promise.all([getPromise(/* keep */)]) /* do not lose */)[0];',
			'const value = (await Promise.all([getPromise(/* keep */)]))[/* do not lose */ 0];',
		].map(code => ({code, errors: [{messageId: 'no-single-promise-in-promise-methods/error', suggestions: []}]})),
		{
			code: 'await Promise.any([(/* keep */ promise)]);',
			errors: [{
				messageId: 'no-single-promise-in-promise-methods/error',
				suggestions: [
					{messageId: 'no-single-promise-in-promise-methods/unwrap', output: 'await (/* keep */ promise);'},
					{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: 'await Promise.resolve((/* keep */ promise));'},
				],
			}],
		},
	],
});

// `Promise.any()` wraps rejections in `AggregateError`, so unwrapping an awaited call is only suggested
test.snapshot({
	valid: [],
	invalid: [
		'await Promise.any([Promise.resolve(42)])',
		'const result = await (Promise.any([(promise)]));',
		'await Promise.any([(left, right)])',
		'await Promise./* keep */any([promise])',
		{
			code: 'await Promise.any([promise as Promise<number>])',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'async function run(promise: Promise<number>) { return await Promise.any<number>([promise!]); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// `await`ed
test.snapshot({
	valid: [
	],
	invalid: [
		'await Promise.race([(0, promise)])',
		'async function * foo() {await Promise.race([yield promise])}',
		'async function * foo() {await Promise.race([yield* promise])}',
		'await Promise.race([() => promise,],)',
		'await Promise.race([a ? b : c,],)',
		'await Promise.race([x ??= y,],)',
		'await Promise.race([x ||= y,],)',
		'await Promise.race([x &&= y,],)',
		'await Promise.race([x |= y,],)',
		'await Promise.race([x ^= y,],)',
		'await Promise.race([x | y,],)',
		'await Promise.race([x ^ y,],)',
		'await Promise.race([x & y,],)',
		'await Promise.race([x !== y,],)',
		'await Promise.race([x == y,],)',
		'await Promise.race([x in y,],)',
		'await Promise.race([x >>> y,],)',
		'await Promise.race([x + y,],)',
		'await Promise.race([x / y,],)',
		'await Promise.race([x ** y,],)',
		'await Promise.race([promise,],)',
		'await Promise.race([getPromise(),],)',
		'await Promise.race([promises[0],],)',
		'await Promise.race([await promise])',
		'await Promise.any([promise])',
		'await Promise.any([promise,],)',
		'await Promise.race([promise])',
		'await Promise.race([new Promise(() => {})])',
		'+await Promise.race([+1])',

		// ASI, `Promise.race()` is not really `await`ed
		outdent`
			await Promise.race([(x,y)])
			[0].toString()
		`,
	],
});

// Not `await`ed
test.snapshot({
	valid: [
		'Promise.race([promise, anotherPromise])',
		'Promise.race(notArrayLiteral)',
		'Promise.race([...promises])',
		'Promise.any([promise, anotherPromise])',
		'Promise.notListedMethod([promise])',
		'Promise[race]([promise])',
		'Promise.race([,])',
		'NotPromise.race([promise])',
		'Promise?.race([promise])',
		'Promise.race?.([promise])',
		'Promise.race(...[promise])',
		'Promise.race([promise], extraArguments)',
		'Promise.race()',
		'new Promise.race([promise])',

		// We are not checking these cases
		'globalThis.Promise.race([promise])',
		'Promise["race"]([promise])',

		// This can't be checked
		'Promise.allSettled([promise])',
	],
	invalid: [
		'Promise.race([promise,],)',
		outdent`
			foo
			Promise.race([(0, promise),],)
		`,
		outdent`
			foo
			Promise.race([[array][0],],)
		`,
		'Promise.race([promise]).then()',
		'Promise.race([1]).then()',
		'Promise.race([1.]).then()',
		'Promise.race([.1]).then()',
		'Promise.race([(0, promise)]).then()',
		'const _ = () => Promise.race([ a ?? b ,],)',
		'Promise.race([ {a} = 1 ,],)',
		'Promise.race([ function () {} ,],)',
		'Promise.race([ class {} ,],)',
		'Promise.race([ new Foo ,],).then()',
		'Promise.race([ new Foo ,],).toString',
		'foo(Promise.race([promise]))',
		// `Promise.any` not awaited
		'Promise.any([promise])',
		'foo(Promise.any([promise]))',
		// `Promise.all` as an object property value: reported but not fixed
		'const obj = {p: Promise.all([promise])}',
		'Promise.race([promise]).foo = 1',
		'Promise.race([promise])[0] ||= 1',
		'Promise.race([undefined]).then()',
		'Promise.race([null]).then()',
	],
});

// `Promise.all`
test.snapshot({
	valid: [],
	invalid: [
		// Only fixable if it's in `ExpressionStatement`
		'Promise.all([promise])',
		'await Promise.all([promise])',

		'const foo = () => Promise.all([promise])',
		'const foo = await Promise.all([promise])',
		'foo = await Promise.all([promise])',

		// `Promise.{all, race}()` should not care if the result is used
		'const foo = await Promise.race([promise])',
		'const foo = () => Promise.race([promise])',
		'foo = await Promise.race([promise])',
		'const results = await Promise.any([promise])',
		'const results = await Promise.race([promise])',

		'const [foo] = await Promise.all([promise])',
		'[foo] = await Promise.all([promise])',
		'const foo = (await Promise.all([promise]))[0]',
		'const foo = (await Promise.all([promise]))[0.0]',
		'foo = (await Promise.all([promise]))[0]',
		'const [foo] = await Promise.all([a ? b : c])',

		// Reported, but not fixed.
		'const [foo = bar] = await Promise.all([promise])',
		'const [...foo] = await Promise.all([promise])',
		'const [, foo] = await Promise.all([promise])',
		'const result = ([foo] = await Promise.all([promise]))',
		'const foo = (await Promise.all([promise]))[1]',
		'const foo = (await Promise.all([promise])) /* comment */ [0]',
		'const [/* comment */ foo] = await Promise.all([promise])',
		'const [foo] = await Promise.all([/* comment */ promise])',
		{
			code: 'const [foo]: [Foo] = await Promise.all([promise])',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// Reported, but not fixed, the unwrap is rebuilt from the promise node alone
		'await Promise.race([/* comment */ promise])',
		'await Promise.race([promise /* comment */])',
		'await Promise.race([promise, /* comment */])',
		'await Promise.race([\n\t// comment\n\tpromise,\n])',
		'await Promise.any([/* comment */ promise])',
		'Promise.race([/* comment */ promise])',
	],
});

// Unwrapping an expression must keep its leading tokens in expression grammar.
test({
	valid: [],
	invalid: [
		...['', 'const getValue = () => '].flatMap(prefix => [
			'{promise: Promise.resolve(1)}.promise',
			'function () {}.promise',
			'class {}.promise',
		].map(expression => ({
			code: `${prefix}Promise.race([${expression}]);`,
			errors: [{
				messageId: 'no-single-promise-in-promise-methods/error',
				data: {method: 'race'},
				suggestions: [
					{messageId: 'no-single-promise-in-promise-methods/unwrap', output: `${prefix}${prefix && !expression.startsWith('{') ? expression : `(${expression})`};`},
					{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: `${prefix}Promise.resolve(${expression});`},
				],
			}],
		}))),
		{
			code: 'log()\nPromise.race([{promise: Promise.resolve(1)}.promise]);',
			errors: [{
				messageId: 'no-single-promise-in-promise-methods/error',
				data: {method: 'race'},
				suggestions: [
					{messageId: 'no-single-promise-in-promise-methods/unwrap', output: 'log()\n;({promise: Promise.resolve(1)}.promise);'},
					{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: 'log()\nPromise.resolve({promise: Promise.resolve(1)}.promise);'},
				],
			}],
		},
	],
});

test({
	valid: [],
	invalid: ['race', 'any'].flatMap(method => ['promise', 'object.value'].map(value => ({
		code: `delete (Promise.${method}([${value}]));`,
		errors: [{
			messageId: 'no-single-promise-in-promise-methods/error', suggestions: [{
				messageId: 'no-single-promise-in-promise-methods/use-promise-resolve',
				output: `delete (Promise.resolve(${value}));`,
			}],
		}],
	}))),
});

test({
	valid: [],
	invalid: [
		['delete (Promise.race([object.value]) as Promise<number>);', 'delete (Promise.resolve(object.value) as Promise<number>);'],
		['delete (Promise.any([object.value]))!;', 'delete (Promise.resolve(object.value))!;'],
	].map(([code, output]) => ({
		code,
		languageOptions: {parser: parsers.typescript},
		errors: [{
			messageId: 'no-single-promise-in-promise-methods/error', suggestions: [{
				messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output,
			}],
		}],
	})),
});

test({
	valid: [],
	invalid: [{
		code: 'async function run() { return delete await Promise.race([object.value]); }',
		output: 'async function run() { return delete await object.value; }',
		errors: 1,
	}],
});

nodeTest('commented promise autofixes preserve results and evaluate the input once', async t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-single-promise-in-promise-methods': rule}}},
		rules: {'unicorn/no-single-promise-in-promise-methods': 'error'},
	};
	await Promise.all([
		'const value = await Promise.race([read(/* keep */)]);',
		'const[value] = await Promise.all([read(/* keep */)]);',
		'const value = (await Promise.all([read(/* keep */)]))[0];',
		'const value = await(Promise).race([read(/* keep */)]);',
		'const[value] = await(Promise).all([read(/* keep */)]);',
	].map(async operation => {
		const code = outdent`
			(async () => {
				let calls = 0;
				function read() {
					calls++;
					return Promise.resolve(42);
				}
				${operation}
				return JSON.stringify({value, calls, leaked: Object.hasOwn(globalThis, "constvalue")});
			})();
		`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('read(/* keep */)'));
		const originalResult = await runInNewContext(code);
		t.assert.strictEqual(originalResult, '{"value":42,"calls":1,"leaked":false}');
		t.assert.strictEqual(await runInNewContext(output), originalResult);
	}));
});

nodeTest('promise unwrapping suggestions preserve compact return behavior', async t => {
	const linter = new Linter();
	const code = 'function read() {return(Promise).race([object[/* keep */ key]]);} read();';
	const {fixed, output, messages} = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'no-single-promise-in-promise-methods': rule}}},
		rules: {'unicorn/no-single-promise-in-promise-methods': 'error'},
	});
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].suggestions.length, 2);
	const {fix} = messages[0].suggestions[0];
	const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	for (const source of [code, suggested]) {
		// eslint-disable-next-line no-await-in-loop -- Verify the original and suggested code independently.
		t.assert.strictEqual(await runInNewContext(source, {key: 'value', object: {value: Promise.resolve(42)}}), 42);
	}
});

nodeTest('commented Promise.any unwrapping stays manual because rejection shape changes', async t => {
	const linter = new Linter();
	const code = outdent`
		(async () => {
			let calls = 0;
			const reason = new Error("failure");
			function read() {
				calls++;
				return Promise.reject(reason);
			}
			try {
				await Promise.any([read(/* keep */)]);
			} catch (error) {
				return JSON.stringify({calls, aggregate: error instanceof AggregateError, same: error === reason, first: error.errors?.[0] === reason});
			}
		})();
	`;
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'no-single-promise-in-promise-methods': rule}}},
		rules: {'unicorn/no-single-promise-in-promise-methods': 'error'},
	});
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 2);
	const {fix} = messages[0].suggestions[0];
	const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.ok(suggested.includes('read(/* keep */)'));
	t.assert.strictEqual(await runInNewContext(code), '{"calls":1,"aggregate":true,"same":false,"first":true}');
	t.assert.strictEqual(await runInNewContext(suggested), '{"calls":1,"aggregate":false,"same":true,"first":false}');
});

nodeTest('suggestions beneath delete keep the property instead of deleting it', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-single-promise-in-promise-methods': rule}}},
		rules: {'unicorn/no-single-promise-in-promise-methods': 'error'},
	};
	for (const method of ['race', 'any']) {
		const code = `const object = {value: Promise.resolve(1)}; delete Promise.${method}([object.value]); "value" in object;`;
		const [problem] = linter.verify(code, config);
		t.assert.strictEqual(problem.suggestions.length, 1);
		t.assert.strictEqual(problem.suggestions[0].messageId, 'no-single-promise-in-promise-methods/use-promise-resolve');
		const {fix} = problem.suggestions[0];
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.strictEqual(runInNewContext(code), true);
		t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
	}
});

test.svelte({
	valid: [],
	invalid: ['race', 'any'].map(method => ({
		code: `{Promise.${method}([/x/.source])}`,
		errors: [{
			messageId: 'no-single-promise-in-promise-methods/error',
			suggestions: [
				{messageId: 'no-single-promise-in-promise-methods/unwrap', output: '{(/x/.source)}'},
				{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: '{Promise.resolve(/x/.source)}'},
			],
		}],
	})),
});
