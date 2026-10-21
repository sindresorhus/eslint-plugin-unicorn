import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['consume(object[/* keep */ key] += 0);', 'consume(object[/* keep */ key]);'],
		['const result = ((/* keep */ value) *= 1);', 'const result = ((/* keep */ value));'],
		['function read() { return object./* keep */value /= 1; }', 'function read() { return object./* keep */value; }'],
		['consume(object[getKey(/* keep */)] -= 0);', 'consume(object[getKey(/* keep */)]);'],
		['consume(object[getKey(// keep\r\n)] -= 0);', 'consume(object[getKey(// keep\r\n)]);'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'no-useless-compound-assignment/error',
			suggestions: [{messageId: 'no-useless-compound-assignment/replace', output}],
		}],
	})),
});

test({
	valid: [],
	invalid: [
		...[
			'consume(object[/* keep */ key] += /* do not lose */ 0);',
			'object[/* keep */ key] += 0;',
			'delete (object[/* keep */ key] += 0);',
		].map(code => ({code, errors: [{messageId: 'no-useless-compound-assignment/error', suggestions: []}]})),
		{
			code: 'consume(object[/* keep */ key]! += 0);',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'no-useless-compound-assignment/error',
				suggestions: [{messageId: 'no-useless-compound-assignment/replace', output: 'consume(object[/* keep */ key]!);'}],
			}],
		},
	],
});

nodeTest('compound assignment suggestions preserve comments and evaluate the key once', t => {
	const linter = new Linter();
	const code = [
		'let evaluations = 0;',
		'const object = {value: 42};',
		'const read = () => { evaluations++; return "value"; };',
		'const result = (object[read(/* keep */)] += 0);',
		'JSON.stringify({evaluations, object, result});',
	].join(' ');
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'no-useless-compound-assignment': rule}}},
		rules: {'unicorn/no-useless-compound-assignment': 'error'},
	});

	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].suggestions.length, 1);
	const {range, text} = result.messages[0].suggestions[0].fix;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	t.assert.ok(output.includes('/* keep */'));
	t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
	t.assert.strictEqual(runInNewContext(output), '{"evaluations":1,"object":{"value":42},"result":42}');
});

test.snapshot({
	valid: [
		// Non-identity values
		'x += 1;',
		'x -= 1;',
		'x *= 2;',
		'x /= 2;',
		'x **= 2;',
		'x += 0.5;',

		// Bitwise operators are intentional int32/uint32 coercion idioms
		'x |= 0;',
		'x ^= 0;',
		'x &= -1;',
		'x <<= 0;',
		'x >>= 0;',
		'x >>>= 0;',

		// `%= 1` is `x % 1` (fractional part), not a no-op
		'x %= 1;',

		// Logical assignment operators
		'x ||= 0;',
		'x &&= 1;',
		'x ??= 0;',

		// Plain assignment
		'x = 0;',
		'x = 1;',

		// BigInt is not a plain numeric literal
		'x += 0n;',
		'x -= 0n;',
		'x *= 1n;',

		// `-0`/`+0`/`+1` are `UnaryExpression`, not a `Literal`
		'x += -0;',
		'x -= -0;',
		'x *= +1;',
		'x /= +1;',

		// Non-literal right-hand side
		'x += y;',
		'x *= zero;',
		'x += foo();',

		// TypeScript: `0 as number` is a `TSAsExpression`, not a plain literal
		{code: 'x += 0 as number;', languageOptions: {parser: parsers.typescript}},
		{code: 'x *= (1 satisfies number);', languageOptions: {parser: parsers.typescript}},

		// Wrong identity for the operator (`*`/`**`/`/` identity is `1`, not `0`)
		'x *= 0;',
		'x /= 0;',
		'x **= 0;',
	],
	invalid: [
		// Each operator, statement context (remove suggestion)
		'x += 0;',
		'x -= 0;',
		'x *= 1;',
		'x /= 1;',
		'x **= 1;',

		// Float and hex forms of the identity value
		'x += 0.0;',
		'x /= 1.0;',
		'x *= 0x1;',
		'x -= 0e3;',

		// Member-expression left-hand side
		'obj.x += 0;',
		'this.count -= 0;',
		'foo.bar.baz *= 1;',

		// Value-used context (replace suggestion)
		'foo(x += 0);',
		'foo(obj.x += 0);',
		'const y = (x *= 1);',
		'function f() { return x -= 0; }',
		'a = x += 0;',
		'const f = () => x /= 1;',
		'(x += 0, y);',
		'for (let i = 0; i < n; i += 0) {}',

		// Indented statement inside a block
		'function f() {\n\tx += 0;\n}',

		// Statement directly inside a `switch` case (remove suggestion)
		'switch (x) {\n\tcase 1:\n\t\ty += 0;\n}',

		// Statement directly inside a class static block (remove suggestion)
		'class Foo {\n\tstatic {\n\t\tx += 0;\n\t}\n}',

		// Comment inside the assignment, so no suggestion is offered
		'x += /* keep */ 0;',
		'x /* keep */ *= 1;',

		// Trailing comment is outside the assignment, so the remove suggestion keeps it
		'x += 0; // keep',

		// TypeScript: a plain numeric literal on the right is still flagged
		{code: 'x += 0;', languageOptions: {parser: parsers.typescript}},
		// A trailing comment sits inside the statement that gets removed, so there is no suggestion
		'function f() {\n\tx *= 1/* keep */;\n\ty();\n}',
		'x += 0/* keep */;',
		'function f() {\n\tx += 0 /* keep */;\n}',
		// Only the assignment is replaced, so the trailing comment is kept
		'if (a) x += 0 /* keep */;',
		'function f() {\n\tx += 0; // keep\n}',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'let value = 1\nuse(value)\nvalue += 0;\n[1].forEach(use)',
			errors: [{
				messageId: 'no-useless-compound-assignment/error',
				suggestions: [{
					messageId: 'no-useless-compound-assignment/remove',
					output: 'let value = 1\nuse(value)\n;\n[1].forEach(use)',
				}],
			}],
		},
	],
});

test({
	valid: [],
	invalid: [{
		code: 'if (ready) ({value: 1}.value) += 0;',
		errors: [{messageId: 'no-useless-compound-assignment/error', suggestions: [{messageId: 'no-useless-compound-assignment/replace', output: 'if (ready) ({value: 1}.value);'}]}],
	}, {
		code: 'const read = () => ({value: 1}.value) += 0;',
		errors: [{messageId: 'no-useless-compound-assignment/error', suggestions: [{messageId: 'no-useless-compound-assignment/replace', output: 'const read = () => ({value: 1}.value);'}]}],
	}],
});

test({
	valid: [],
	invalid: [{
		code: 'const object = {value: 1}; delete (object.value += 0);',
		errors: [{messageId: 'no-useless-compound-assignment/error', suggestions: []}],
	}, {
		code: 'const object = {value: 1}; delete (object.value += 0)!;',
		languageOptions: {parser: parsers.typescript},
		errors: [{messageId: 'no-useless-compound-assignment/error', suggestions: []}],
	}],
});
