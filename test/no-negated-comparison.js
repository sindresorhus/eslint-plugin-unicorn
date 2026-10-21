import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['!/* keep */(a === b || c === d);', '/* keep */(a !== b && c !== d);'],
		['!(/* keep */a === b || c === d);', '(/* keep */a !== b && c !== d);'],
	].map(([code, output]) => ({
		code, output, options: [{checkLogicalExpressions: true}], errors: [{messageId: 'no-negated-comparison/logical-error'}],
	})),
});

test({
	valid: [],
	invalid: [
		...[
			['!// keep\r\n(a === b && c === d);', '// keep\r\n(a !== b || c !== d);'],
			['!((a === b || c === d)/* keep */);', '((a !== b && c !== d)/* keep */);'],
			['function f() { return!/* keep */(a === b || c === d); }', 'function f() { return /* keep */(a !== b && c !== d); }'],
			['function f() { return!// keep\r\n(a === b || c === d); }', 'function f() { return (// keep\r\n(a !== b && c !== d)); }'],
			['function f() { throw!// keep\r\n(a === b || c === d); }', 'function f() { throw (// keep\r\n(a !== b && c !== d)); }'],
			['before()\n!/* keep */(a === b || c === d);', 'before()\n;/* keep */(a !== b && c !== d);'],
		].map(([code, output]) => ({
			code, output, options: [{checkLogicalExpressions: true}], errors: 1,
		})),
		{
			code: 'const value = !/* keep */(a === b || c === d) as boolean;',
			output: 'const value = /* keep */(a !== b && c !== d) as boolean;',
			languageOptions: {parser: parsers.typescript},
			options: [{checkLogicalExpressions: true}],
			errors: 1,
		},
		...[
			'!/* keep */(a /* inside */ === b || c === d);',
			'!(a === b || (/* inside */ c === d));',
			'function* f() { yield!// keep\r\n(a === b || c === d); }',
		].map(code => ({code, options: [{checkLogicalExpressions: true}], errors: 1})),
	],
});

nodeTest('logical negation fixes preserve surrounding comments and short-circuit evaluation', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-negated-comparison': rule}}},
		rules: {'unicorn/no-negated-comparison': ['error', {checkLogicalExpressions: true}]},
	};
	for (const operator of ['&&', '||']) {
		const code = `!/* keep */(read("first") === 1 ${operator} read("second") === 2);`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output.split('/* keep */').length, 2);
		for (const [first, second] of [[1, 2], [0, 2], [1, 0], [undefined, 2], [NaN, 2]]) {
			const execute = source => {
				const events = [];
				const result = runInNewContext(source, {
					read(name) {
						events.push(name);
						return name === 'first' ? first : second;
					},
				});
				t.assert.strictEqual(events.filter(name => name === 'first').length, 1);
				return {events, result};
			};

			t.assert.deepStrictEqual(execute(output), execute(code));
		}
	}
});

test({
	valid: [],
	invalid: [
		...['return', 'throw'].map(keyword => ({
			code: `function foo(a, b, ready) { ${keyword} !\n(a === b) && ready; }`,
			output: `function foo(a, b, ready) { ${keyword} ( \na !== b && ready); }`,
			errors: 1,
		})),
		{code: 'function* foo(a, b, ready) { yield !\n(a === b) && ready; }', errors: 1},
		{code: 'function* foo(a, b) { yield !\n(a === b) ? 1 : 2; }', errors: 1},
		{code: 'function* foo(a, b) { yield !\n(a === b); }', errors: 1},
		{
			code: 'function* foo(a, b, c, d) { yield !\n(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
			errors: 1,
		},
		...['as boolean', 'satisfies boolean'].map(wrapper => ({
			code: `function* foo(a, b) { yield !\n(a === b) ${wrapper}; }`,
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		})),
		{
			code: 'function* foo(a, b) { yield (!\n(a === b)); }',
			output: 'function* foo(a, b) { yield (\na !== b); }',
			errors: 1,
		},
		{
			code: 'function* foo(a, b) { yield (!\n(a === b) as boolean); }',
			output: 'function* foo(a, b) { yield (\n(a !== b) as boolean); }',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'function* foo(a, b) { yield* !\n(a === b); }',
			output: 'function* foo(a, b) { yield* \n(a !== b); }',
			errors: 1,
		},
		{
			code: 'function* foo(a, b) { yield <boolean>!\n(a === b); }',
			output: 'function* foo(a, b) { yield <boolean>\n(a !== b); }',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [
		'a === b',
		'a !== b',
		'a > b',
		'!Array.isArray(value)',
		'!(a === b && c === d)',
		'!(a || b)',
		'!(key in object)',
		'!(value instanceof Class)',
		'!foo',
		'!!(a === b)',
		'!foo === bar',
		// Relational comparisons are never checked, since the opposite operator is not equivalent when an operand is not a comparable number.
		'if (!(chr >= 0)) {}',
		'!(a > b)',
		'!(a >= b)',
		'!(a < b)',
		'!(a <= b)',
		'!(null > undefined)',
		'!(a?.b > c)',
		'async function foo() { return await !(a > b); }',
		'const foo = a + !(b > c);',
		{
			code: '!((a?.b as number) > c)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
		'!(a === b)',
		'!(a !== b)',
		'!(a == b)',
		'!(a != b)',
		// The replaced operator is the outer one, since `a === b === c` parses as `(a === b) === c`.
		'!(a === b === c)',
		'!(typeof value === "undefined")',
		'!((a === b))',
		'(!(a === b)).toString()',
		'foo(!(a === b))',
		'!(a /* comment */ === b)',
		'!/* comment */(a === b)',
		outdent`
			foo
			!([a] === b)
		`,
		outdent`
			function foo() {
				return!
					(a === b);
			}
		`,
		outdent`
			function foo() {
				throw!
					(a === b);
			}
		`,
		'function foo() { return!(a === b); }',
		'function foo() { throw!(a === b); }',
		'switch (foo) { case!(a === b): break; }',
		'async function foo() { return await !(a === b); }',
		'async function foo() { return await!(a === b); }',
		'const foo = void !(a === b);',
		'const foo = typeof !(a === b);',
		'const foo = +!(a === b);',
		'const foo = a + !(b === c);',
		'function * foo() { yield !(a === b); }',
		'function * foo() { yield!(a === b); }',
		'foo(...!(a === b));',
		// The parentheses are kept here, so the fixed expression starts with `(` and needs a semicolon.
		outdent`
			foo
			!(a === b) + c
		`,
		outdent`
			const foo = [a]
			!(b === c) + d
		`,
		// Equality comparisons are exact even for `undefined`/`NaN`, so optional chaining does not affect them.
		'!(a?.b === c)',
		'!(a?.b !== c)',
		'!(a?.() == b)',
		{
			code: '!(foo! === bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '!((foo as string) === bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const foo = !(a === b) as boolean;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const foo = !(a === b) satisfies boolean;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const foo = <boolean>!(a === b);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const foo = (!(a === b))!;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});

test.snapshot({
	valid: [
		{
			code: '!(a && b)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && c)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && foo())',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && (c === d || foo()))',
			options: [{checkLogicalExpressions: true}],
		},
		// De Morgan's law does not apply to `??`, so it is not negatable.
		{
			code: '!(a === b ?? c)',
			options: [{checkLogicalExpressions: true}],
		},
		// A relational comparison anywhere in the tree suppresses the whole expression.
		{
			code: '!(a > b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b || c <= d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && (c === d || e <= f))',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!((a || b) > c && d === e)',
			options: [{checkLogicalExpressions: true}],
		},
		// `in` and `instanceof` are not equality comparisons either.
		{
			code: '!(a in b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a instanceof B && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
	],
	invalid: [
		{
			code: '!(a === b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'if (!(a === b && c === d)) {}',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a !== b || c != d)',
			options: [{checkLogicalExpressions: true}],
		},
		// Equality comparisons with optional chaining stay reportable (exact under negation).
		{
			code: '!(a?.b === c && d === e)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && (c === d || e === f))',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!((a === b && c === d) && e === f)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && c === d || e === f)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b || c === d && e === f)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!((a || b) === c && d === e)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!/* comment */(a === b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a /* comment */ === b && c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: '!(a === b && /* comment */ c === d)',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: outdent`
				foo
				!(a === b && c === d)
			`,
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: outdent`
				function foo() {
					return!
						(a === b && c === d);
				}
			`,
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'function foo() { return!(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'function foo() { throw!(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'switch (foo) { case!(a === b && c === d): break; }',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'async function foo() { return await!(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
		},
		{
			code: 'function * foo() { yield!(a === b && c === d); }',
			options: [{checkLogicalExpressions: true}],
		},
	],
});

test({
	valid: [],
	invalid: [
		['!({value: 1}.value === 1);', '({value: 1}.value !== 1);'],
		['!(function () {} === value);', '(function () {} !== value);'],
		['const value = !({value: 1}.value === 1);', 'const value = {value: 1}.value !== 1;'],
		['const read = () => !({value: 1}.value === 1);', 'const read = () => ({value: 1}.value !== 1);'],
		['export default !(function () {} === value);', 'export default (function () {} !== value);'],
		['(!({value: 1}.value === 1));', '({value: 1}.value !== 1);'],
		['setup()\n!({value: 1}.value === 1);', 'setup()\n;({value: 1}.value !== 1);'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test.svelte({
	valid: [],
	invalid: [{
		code: '{!(/x/.test(value) === true)}',
		output: '{(/x/.test(value) !== true)}',
		errors: 1,
	}],
});
