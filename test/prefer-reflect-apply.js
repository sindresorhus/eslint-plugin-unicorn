import nodeTest from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

const linterConfig = {
	plugins: {unicorn: {rules: {'prefer-reflect-apply': rule}}},
	rules: {'unicorn/prefer-reflect-apply': 'error'},
};

nodeTest('optional target chains preserve missing targets and argument evaluation', t => {
	for (const [initialization, missing] of [
		['null', true],
		['undefined', true],
		['{value(input) { calls.push("call"); return input; }, getValue() { calls.push("factory"); return this.value; }}', false],
	]) {
		for (const [expression, usesFactory] of [
			['object?.value.apply(null, [record()])', false],
			['object?.["value"]["apply"](null, [record()])', false],
			['object?.getValue().apply(null, [record()])', true],
			['object?.getValue?.().apply(null, [record()])', true],
			['wrapper.value?.value.apply(null, [record()])', false],
		]) {
			const code = outdent`
				const calls = [];
				function record() { calls.push("argument"); return "argument"; }
				const object = ${initialization};
				const wrapper = {value: object};
				const result = ${expression};
				JSON.stringify({result, calls});
			`;
			const expected = missing
				? '{"calls":[]}'
				: JSON.stringify({result: 'argument', calls: [...(usesFactory ? ['factory'] : []), 'argument', 'call']});
			const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
			t.assert.strictEqual(runInNewContext(code), expected);
			t.assert.strictEqual(runInNewContext(output), expected);
			t.assert.strictEqual(output, code);
			t.assert.strictEqual(fixed, false);
			t.assert.deepStrictEqual(messages, []);
		}
	}
});

nodeTest('grouped optional targets retain autofixes and existing call failures', t => {
	for (const [initialization, expected] of [
		['null', 'TypeError'],
		['undefined', 'TypeError'],
		['{value() { return 2; }}', 2],
	]) {
		const code = `const object = ${initialization}; let result; try { result = (object?.value).apply(null, []); } catch (error) { result = error.name; } result;`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code.replace('(object?.value).apply(null, [])', 'Reflect.apply(object?.value, null, [])'));
		t.assert.strictEqual(runInNewContext(code), expected);
		t.assert.strictEqual(runInNewContext(output), expected);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
	}
});

for (const [position, getExpression] of [
	['direct apply', effect => `value[(${effect}, "apply")](null, [])`],
	['prototype', effect => `Function[(${effect}, "prototype")].apply.call(value, null, [])`],
	['prototype apply', effect => `Function.prototype[(${effect}, "apply")].call(value, null, [])`],
	['prototype call', effect => `Function.prototype.apply[(${effect}, "call")](value, null, [])`],
]) {
	nodeTest(`computed ${position} keys preserve their evaluation`, t => {
		for (const [effect, expected] of [
			['count++', 1],
			['fail()', 'RangeError'],
		]) {
			const code = outdent`
				let count = 0;
				function fail() { throw new RangeError("key"); }
				function value() { return count; }
				let result;
				try { result = ${getExpression(effect)}; } catch (error) { result = error.name; }
				result;
			`;
			const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
			t.assert.strictEqual(runInNewContext(code), expected);
			t.assert.strictEqual(runInNewContext(output), expected);
			t.assert.strictEqual(output, code);
			t.assert.strictEqual(fixed, false);
			t.assert.deepStrictEqual(messages, []);
		}
	});
}

nodeTest('literal and static template method names retain safe autofixes', t => {
	for (const expression of [
		'value.apply(null, [2])',
		'value["apply"](null, [2])',
		'value[`apply`](null, [2])',
		'Function.prototype.apply.call(value, null, [2])',
		'Function["prototype"]["apply"]["call"](value, null, [2])',
		'Function[`prototype`][`apply`][`call`](value, null, [2])',
	]) {
		const code = `function value(input) { return input + 1; } ${expression};`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, 'function value(input) { return input + 1; } Reflect.apply(value, null, [2]);');
		t.assert.strictEqual(runInNewContext(code), 3);
		t.assert.strictEqual(runInNewContext(output), 3);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
	}
});

nodeTest('computed targets and sequence target arguments keep their evaluation order', t => {
	for (const [expression, replacement] of [
		[
			'object[(record("target"), "value")].apply(null, [record("argument")])',
			'Reflect.apply(object[(record("target"), "value")], null, [record("argument")])',
		],
		[
			'Function.prototype.apply.call((record("target"), value), null, [record("argument")])',
			'Reflect.apply((record("target"), value), null, [record("argument")])',
		],
	]) {
		const code = outdent`
			const calls = [];
			function record(value) { calls.push(value); return value; }
			function value() { calls.push("call"); return calls; }
			const object = {value};
			JSON.stringify(${expression});
		`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code.replace(expression, () => replacement));
		t.assert.strictEqual(runInNewContext(code), '["target","argument","call"]');
		t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
	}
});

const MESSAGE_ID = 'prefer-reflect-apply';

const errors = [
	{
		messageId: MESSAGE_ID,
	},
];

test({
	valid: [
		// `super` is not a valid standalone expression
		'class A extends B { m() { return super.apply(null, [1]); } }',
		'foo.apply();',
		'foo.apply(null);',
		'foo.apply(this);',
		'foo.apply(null, 42);',
		'foo.apply(this, 42);',
		'foo.apply(bar, arguments);',
		'[].apply(null, [42]);',
		'foo.apply(bar);',
		'foo.apply(bar, []);',
		'foo.apply;',
		'apply;',
		'Reflect.apply(foo, null);',
		'Reflect.apply(foo, null, [bar]);',
		// Computed method expressions are ignored, even when their name can be inferred
		'const apply = "apply"; foo[apply](null, [42]);',
		'foo["ap" + "ply"](null, [42]);',
		'Function["proto" + "type"].apply.call(foo, null, []);',
		'Function.prototype["ap" + "ply"].call(foo, null, []);',
		'Function.prototype.apply["ca" + "ll"](foo, null, []);',
		'foo?.["apply"](null, []);',
		'foo["apply"]?.(null, []);',
		'Function.prototype.apply?.call(foo, null, []);',
		'object?.value.apply(null, []);',
		'object?.getValue().apply(null, []);',
		'((object?.value.apply))(null, []);',
		...[
			'object?.value!.apply(null, []);',
			'object?.getValue()!.apply(null, []);',
			'object?.getValue<Function>().apply(null, []);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
		{
			code: 'foo[("apply" as const)](null, []);',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		{
			code: 'foo.apply(null, [42]);',
			output: 'Reflect.apply(foo, null, [42]);',
			errors,
		},
		{
			// Empty array argument list
			code: 'foo.apply(null, []);',
			output: 'Reflect.apply(foo, null, []);',
			errors,
		},
		{
			// Parenthesized callee object
			code: '(foo.bar).apply(null, [42]);',
			output: 'Reflect.apply(foo.bar, null, [42]);',
			errors,
		},
		{
			code: 'foo.bar.apply(null, [42]);',
			output: 'Reflect.apply(foo.bar, null, [42]);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo, null, [42]);',
			output: 'Reflect.apply(foo, null, [42]);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo.bar, null, [42]);',
			output: 'Reflect.apply(foo.bar, null, [42]);',
			errors,
		},
		{
			code: 'foo.apply(null, arguments);',
			output: 'Reflect.apply(foo, null, arguments);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo, null, arguments);',
			output: 'Reflect.apply(foo, null, arguments);',
			errors,
		},
		{
			code: 'foo.apply(this, [42]);',
			output: 'Reflect.apply(foo, this, [42]);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo, this, [42]);',
			output: 'Reflect.apply(foo, this, [42]);',
			errors,
		},
		{
			code: 'foo.apply(this, arguments);',
			output: 'Reflect.apply(foo, this, arguments);',
			errors,
		},
		{
			code: 'Function.prototype.apply.call(foo, this, arguments);',
			output: 'Reflect.apply(foo, this, arguments);',
			errors,
		},
		{
			code: 'foo["apply"](null, [42]);',
			output: 'Reflect.apply(foo, null, [42]);',
			errors,
		},
		{
			code: 'foo[`apply`](null, [42]);',
			output: 'Reflect.apply(foo, null, [42]);',
			errors,
		},
		{
			code: '((object?.value))["apply"](null, []);',
			output: 'Reflect.apply(object?.value, null, []);',
			errors,
		},
		{
			code: '(object?.getValue()).apply(null, []);',
			output: 'Reflect.apply(object?.getValue(), null, []);',
			errors,
		},
		...[
			['(object?.value as Function).apply(null, []);', 'Reflect.apply(object?.value as Function, null, []);'],
			['(object?.value!).apply(null, []);', 'Reflect.apply(object?.value!, null, []);'],
		].map(([code, output]) => ({
			code,
			output,
			languageOptions: {parser: parsers.typescript},
			errors,
		})),
		...[
			['(foo as Function)["apply"](null, []);', 'Reflect.apply(foo as Function, null, []);'],
			['(foo!)["apply"](null, []);', 'Reflect.apply(foo!, null, []);'],
		].map(([code, output]) => ({
			code, output, languageOptions: {parser: parsers.typescript}, errors,
		})),

		// A parenthesized sequence expression target must keep its parentheses
		{
			code: '(0, fn).apply(this, []);',
			output: 'Reflect.apply((0, fn), this, []);',
			errors: 1,
		},
		{
			code: 'Function.prototype.apply.call((0, fn), this, []);',
			output: 'Reflect.apply((0, fn), this, []);',
			errors: 1,
		},
		{
			code: '(a, b).apply(null, [1]);',
			output: 'Reflect.apply((a, b), null, [1]);',
			errors: 1,
		},

		// A comment in the call is preserved by not fixing
		{
			code: 'fn.apply(/* keep */ this, []);',
			errors: 1,
		},
		{
			code: 'fn.apply(this, /* keep */ []);',
			errors: 1,
		},
		{
			code: 'fn /* keep */.apply(this, []);',
			errors: 1,
		},
		{
			code: 'fn[/* keep */ "apply"](null, []);',
			errors: 1,
		},
		// `super` is not a valid standalone expression
		{
			code: 'class A extends B { m() { return super.method.apply(this, [1]); } }',
			output: 'class A extends B { m() { return Reflect.apply(super.method, this, [1]); } }',
			errors: 1,
		},
	],
});
