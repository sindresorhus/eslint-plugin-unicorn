import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['function f() {return(true) && read(/* keep */);}', 'function f() {return read(/* keep */);}'],
		['function f() {return(true) && read(/* keep */) && other;}', 'function f() {return read(/* keep */) && other;}'],
		['function f() {throw(false) || read(/* keep */);}', 'function f() {throw read(/* keep */);}'],
		['function* f() {yield(true) && read(/* keep */);}', 'function* f() {yield read(/* keep */);}'],
		['for (const value of(false) || read(/* keep */)) {}', 'for (const value of read(/* keep */)) {}'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

nodeTest('logical operand fixes preserve compact return and throw statements', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-useless-logical-operand': rule}}},
		rules: {'unicorn/no-useless-logical-operand': 'error'},
	};
	for (const [statement, tail] of [['return', ''], ['return', ' && other'], ['throw', ''], ['throw', ' && other']]) {
		const code = outdent`
			function run() {${statement}(true) && read(/* keep */)${tail};}
			let result;
			try { result = run(); } catch (error) { result = error; }
			result;
		`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes(`${statement} read(/* keep */)${tail}`));
		for (const value of [0, 3]) {
			for (const source of [code, output]) {
				let calls = 0;
				const result = runInNewContext(source, {
					other: 7,
					read() {
						calls++;
						return value;
					},
				});
				t.assert.strictEqual(result, value && tail ? 7 : value);
				t.assert.strictEqual(calls, 1);
			}
		}
	}
});

test({
	valid: [],
	invalid: [
		['const value = true && (/* keep */ input);', 'const value = (/* keep */ input);'],
		['const value = input(/* keep */) && true && other;', 'const value = input(/* keep */) && other;'],
		['const value = false || object[/* keep */ key];', 'const value = object[/* keep */ key];'],
		['const value = (/* keep */ false) && never();', 'const value = (/* keep */ false);'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [
		'delete (true && object[/* keep */ key]);',
		'(true && object[/* keep */ key])();',
		'(true && object[/* keep */ key])`template`;',
	],
	invalid: [
		...[
			['const value = true && getValue(\r\n  // keep\r\n);', 'const value = getValue(\r\n  // keep\r\n);'],
			['const value = (first || /* keep */ second) && true && last;', 'const value = (first || /* keep */ second) && last;'],
			['use()\ntrue && [/* keep */ 1];', 'use()\n;[/* keep */ 1];'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'const value = true && (input as /* keep */ boolean);',
			output: 'const value = (input as /* keep */ boolean);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			'const value = input && (/* keep */ true) && other;',
			'const value = false && call(/* keep */);',
			'const value = true && ((/* keep */ true) && input);',
		].map(code => ({code, errors: 1})),
		{
			code: 'const value = (true as /* keep */ boolean) && input;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

nodeTest('commented logical operands retain values and short-circuit evaluation order', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-useless-logical-operand': rule}}},
		rules: {'unicorn/no-useless-logical-operand': 'error'},
	};
	for (const [expression, getExpectedEvents] of [
		['true && read(/* keep */ "left")', () => ['left']],
		['read(/* keep */ "left") && true && read("right")', left => left ? ['left', 'right'] : ['left']],
		['false || (read(/* keep */ "left") || read("right"))', left => left ? ['left'] : ['left', 'right']],
		['(/* keep */ false) && read("right")', () => []],
	]) {
		const code = `const result = ${expression}; JSON.stringify({result, events});`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		for (const left of [false, 0, 'value']) {
			const results = [code, output].map(source => {
				const events = [];
				const result = runInNewContext(source, {
					events,
					read(name) {
						events.push(name);
						return name === 'left' ? left : 42;
					},
				});
				t.assert.deepStrictEqual(events, getExpectedEvents(left));
				return result;
			});
			t.assert.strictEqual(results[1], results[0]);
		}
	}
});

test.snapshot({
	valid: [
		// Trailing identity operands are not value-preserving outside boolean contexts.
		'const value = input && true;',
		'const value = input || false;',

		// Non-leading absorbing operands are intentionally out of scope.
		'const value = input && false;',
		'const value = input || true;',
		'const flag = input === other;\nconst value = flag && false;',
		'const flag = input === other;\nconst value = flag || true;',
		'const value = !input && false;',
		'const value = input === other || true;',
		'const value = key in object && false;',
		'const value = input < other || true;',

		// Keep side effects from known-boolean calls.
		'const value = isReady() && false;',
		'const value = isReady() || true;',
		'const value = Number.isFinite(input) && false;',
		'const value = /foo/.test(input) || true;',

		// Out of scope.
		'const value = input ?? false;',
		'const value = input === true;',
		'const value = input !== false;',
		'const value = input & true;',
		'const value = input | false;',

		// Mixed logical operators are not flattened together.
		'const value = input && (other || false);',
		'const value = input || (other && true);',

		// Trailing identity operands are still not safe inside parenthesized same-operator chains.
		'const value = input && (other && true);',
		'const value = input || (other || false);',

		// A `yield` expression evaluates to its resume value, not the yielded argument, so its type is unknown.
		'function * foo() {\n\tconst value = (yield a > b) || false;\n}',
		'function * foo() {\n\tconst value = (yield a > b) && true;\n}',

		// Optional chaining and unknown types are not known boolean in value contexts.
		'const value = object?.enabled && true;',
		{code: 'declare const value: unknown;\nconst result = value && true;', languageOptions: {parser: parsers.typescript}},

		// JSX.
		{code: 'const element = <div>{input && true}</div>;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},

		// `for` initializers are not boolean contexts.
		'for (input && true;;) {}',

		// Directive prologue positions are ignored when simplifying to a string literal could change semantics.
		'true && \'use strict\';',
		'true && \'directive\';\n\'use strict\';',
		'\'directive\';\ntrue && \'use strict\';',
		outdent`
			function foo() {
				false || 'use strict';
			}
		`,
		{code: 'true && (\'use strict\' as const);', languageOptions: {parser: parsers.typescript}},
		{code: 'true && (\'use strict\' satisfies string);', languageOptions: {parser: parsers.typescript}},
		{code: 'true && \'use strict\'!;', languageOptions: {parser: parsers.typescript}},
		{code: 'true && <const>\'use strict\';', languageOptions: {parser: parsers.typescript}},

		// `switch` compares its discriminant with `===`, so it is not a truthiness test
		'switch (foo && true) {}',
		'switch (foo || false) {}',
		'switch (foo && bar) {}',
		'switch (foo && true) { case true: break; }',

		// `(true && obj.method)()` calls with `this` undefined, but `(obj.method)()` would pass `obj`, and `delete` needs a reference, so the operand is not a plain value there
		'(true && obj.method)();',
		'(false || obj.method)();',
		'(true && obj.method)`tag`;',
		'delete (true && obj.property);',
		'delete (true && variable);',
		'(true && obj.method)?.();',
		{code: '(true && obj.method)!();', languageOptions: {parser: parsers.typescript}},
		{code: '((true && obj.method) as Function)();', languageOptions: {parser: parsers.typescript}},
		{code: '(<any>(true && obj.method))`tag`;', languageOptions: {parser: parsers.typescript}},
		{code: 'delete (true && obj.property)!;', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		// Leading identity operands.
		'const value = true && input;',
		'const value = false || input;',

		// Middle identity operands are value-preserving.
		'const value = input && true && other;',
		'const value = input || false || other;',
		'const value = true && input && true && other;',
		'const value = false || input || false || other;',

		// Partial simplification can leave a trailing identity operand that is unsafe to remove.
		'const value = true && input && true;',
		'const value = false || input || false;',

		// All-identity chains collapse to one literal.
		'const value = true && true;',
		'const value = false || false;',

		// Trailing identity operands in boolean contexts.
		'if (input && true) {}',
		'if (input || false) {}',
		'if (input && (other && true)) {}',
		'if (input || (other || false)) {}',
		'if (object?.enabled && true) {}',
		'while (input && true) {}',
		'for (; input && true;) {}',
		'do {} while (input || false);',
		'const value = input && true ? yes : no;',
		'const value = Boolean(input || false);',
		'const value = !(input && true);',

		// Trailing identity operands with known boolean values.
		'const flag = input === other;\nconst value = flag && true;',
		'const flag = input === other;\nconst value = flag || false;',
		'const value = !input && true;',
		'const value = input === other || false;',
		'const value = Number.isFinite(input) && true;',
		'const value = /foo/.test(input) || false;',

		// Leading absorbing operands.
		'const value = false && input;',
		'const value = true || input;',

		// Parenthesized chains.
		'const value = (true && input);',
		'const value = ((false || input));',

		// Member expressions and calls.
		'const value = true && input?.property;',
		'const value = false || input.member;',
		'const value = true && input();',
		'new (true && Constructor)();',
		'new (false || Constructor)();',
		// Only the callee position is skipped, an argument or a member object is a plain value
		'foo(true && obj.method);',
		'(true && obj).method();',
		'typeof (true && obj.property);',

		// Mixed operators and grouped operands preserve needed parentheses.
		'const value = true && (input || other);',
		'const value = false || (input && other);',
		'const value = true && (foo = bar) && baz;',
		'const value = true && (foo, bar) && baz;',
		'const value = true && (input || other) && final;',
		'const value = (input || false || other) && final;',
		'const value = final && (input || false || other);',
		'const value = (input && true && other) || final;',

		// Object expressions must remain valid when they become the first operand.
		'const value = true && {};',
		'true && {};',
		'const value = true && {} && input;',
		'true && {} && input;',
		'true && function () {} && input;',
		'true && class {} && input;',
		'true && (function () {}) && input;',
		'true && (class {}) && input;',
		{code: 'true && {} as Foo && input;', languageOptions: {parser: parsers.typescript}},
		{code: 'true && {} satisfies Foo && input;', languageOptions: {parser: parsers.typescript}},
		{code: 'true && {}! && input;', languageOptions: {parser: parsers.typescript}},
		{code: 'true && <Foo>{} && input;', languageOptions: {parser: parsers.typescript}},

		// ASI-sensitive replacements.
		outdent`
			const value = input
			true && [1, 2, 3].map(number => number)
		`,
		outdent`
			const value = input
			false || (1 + 2)
		`,

		// String literals outside directive prologues are still fixable.
		'foo();\ntrue && \'use strict\';',

		// TypeScript wrappers around the logical expression keep the replacement parenthesized.
		{code: '(true && \'use strict\') as const;', languageOptions: {parser: parsers.typescript}},
		{code: '(false || \'use strict\') satisfies string;', languageOptions: {parser: parsers.typescript}},
		{code: '(true && \'use strict\')!;', languageOptions: {parser: parsers.typescript}},
		{code: '<const>(true && \'use strict\');', languageOptions: {parser: parsers.typescript}},

		// Comments in removed syntax block fixes, while copied operand comments are preserved.
		'const value = true /* keep */ && input;',
		'if (input && /* keep */ true) {}',
		'const value = true && call(/* keep */);',
		'const value = true && call(/* keep */) && other;',

		// Comments outside the chain are preserved.
		'const value = /* keep */ true && input;',
		'const value = true && input /* keep */;',

		// TypeScript.
		{code: 'declare const flag: boolean;\nconst value = flag && true;', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const flag: true;\nconst value = flag || false;', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const flag: boolean;\nconst value = flag! && true;', languageOptions: {parser: parsers.typescript}},
		{code: 'const value = (input as boolean) && true;', languageOptions: {parser: parsers.typescript}},
		{code: 'const value = (input satisfies boolean) || false;', languageOptions: {parser: parsers.typescript}},

		// JSX.
		{code: 'const element = <div>{true && child}</div>;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},

		// TypeScript: a boolean literal wrapped in a type-only expression is still a literal
		{code: 'declare const a: unknown;\nif (a && (true as boolean)) {}', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const a: unknown;\nif (a && (true!)) {}', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const a: unknown;\nif (a && (<boolean>true)) {}', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const a: unknown;\nif (a && (true satisfies boolean)) {}', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const a: unknown;\nif ((true as boolean) && a) {}', languageOptions: {parser: parsers.typescript}},

		// A binary operand gets parentheses for readability
		'const value = foo === 1 && true && bar;',
		// Not in a directive prologue position
		'if (condition) {\n\ttrue && \'use strict\';\n}',
		// ASI protection
		'foo\ntrue && (a || b) && c',
	],
});

// Removing an identity must not expose a block or declaration at the start of a statement.
test({
	valid: [],
	invalid: [
		...[
			['true && function () {}.length;', '(function () {}.length);'],
			['true && class {}.name;', '(class {}.name);'],
			['true && async function () {}.length;', '(async function () {}.length);'],
			['true && {value: 1}.value && flag;', '({value: 1}.value) && flag;'],
			['true && function () {}.length && flag;', '(function () {}.length) && flag;'],
			['true && class {}.name && flag;', '(class {}.name) && flag;'],
			['use()\ntrue && function () {}.length;', 'use()\n;(function () {}.length);'],
		].map(([code, output]) => ({code, output, errors: 1})),
	],
});

test({
	valid: [],
	invalid: [
		['const value = true && function () {}.length && flag;', 'const value = function () {}.length && flag;'],
		['const get = () => true && {value: 1}.value && flag;', 'const get = () => ({value: 1}.value) && flag;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test.svelte({
	valid: [],
	invalid: [
		['{true && /x/}', '{(/x/)}'],
		['<div>{true && /x/ && value}</div>', '<div>{(/x/) && value}</div>'],
		['{ true && /x/}', '{ (/x/)}'],
		['{(true && /x/)}', '{(/x/)}'],
		['{true && (/x/)}', '{(/x/)}'],
		['<div title={true && /x/}></div>', '<div title={/x/}></div>'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {boolean} [flag] */ function run(flag) { return flag && true; }',
			'/** @returns {?boolean} */ function read() { return source; } read() || false;',
			'/** @param {boolean | string} flag */ function run(flag) { return flag || false; }',
			'/** @type {() => boolean} */ let read = source; read = () => "changed"; read() && true;',
			'/** @param {string | Array<string>} values */ function run(values) { return values.includes(key) && true; }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...[
				[
					'/** @param {boolean} flag */ function run(flag) { return flag && true; }',
					'/** @param {boolean} flag */ function run(flag) { return flag; }',
				],
				[
					'/** @returns {boolean} */ function read() { return source; } read() || false;',
					'/** @returns {boolean} */ function read() { return source; } read();',
				],
				[
					'/** @param {() => boolean} read */ function run(read) { return read() && true; }',
					'/** @param {() => boolean} read */ function run(read) { return read(); }',
				],
				[
					'/** @param {string} text */ function run(text) { return text.includes("x") || false; }',
					'/** @param {string} text */ function run(text) { return text.includes("x"); }',
				],
				[
					'/** @param {Set<string>} values */ function run(values) { return values.has(key) || false; }',
					'/** @param {Set<string>} values */ function run(values) { return values.has(key); }',
				],
				[
					'/** @param {ReadonlyMap<string, number>} values */ function run(values) { return values.has(key) && true; }',
					'/** @param {ReadonlyMap<string, number>} values */ function run(values) { return values.has(key); }',
				],
				[
					'/** @param {RegExp} pattern */ function run(pattern) { return pattern.sticky && true; }',
					'/** @param {RegExp} pattern */ function run(pattern) { return pattern.sticky; }',
				],
				[
					'/** @param {Array<string> | Uint8Array} values */ function run(values) { return values.some(predicate) && true; }',
					'/** @param {Array<string> | Uint8Array} values */ function run(values) { return values.some(predicate); }',
				],
				[
					'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return first && true && second && true; }',
					'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return first && second; }',
				],
			].map(([code, output]) => ({
				code, output, filename: 'file.ts', errors: [{messageId: 'no-useless-logical-operand'}],
			})),
			{
				code: '/** @param {boolean} flag */ function run(flag) { return flag && /* keep */ true; }',
				filename: 'file.ts',
				errors: [{messageId: 'no-useless-logical-operand'}],
			},
		],
	});
}
