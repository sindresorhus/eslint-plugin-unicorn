import vm from 'node:vm';
import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);

testRule.snapshot({
	valid: [
		'function format(value) { return value; } format(1); format(2);',
		'function format(value) { return value; } format(1);',
		'function format(value) { return value; }',
		'function format(value) { return value; } for (const item of items) { format(1); }',
		'export function format(value) { return value; } format(1); format(1);',
		'function format(value) { return value; } export {format}; format(1); format(1);',
		'function format(value) { return value; } export default format; format(1); format(1);',
		'const format = value => value; consume(format); format(1); format(1);',
		'const format = value => value; const alias = format; format(1); format(1);',
		'function format(value) { return value; } format.length; format(1); format(1);',
		'function format(value) { return value; } format.call(undefined, 1); format(1); format(1);',
		'function format(value) { return value; } format.apply(undefined, [1]); format(1); format(1);',
		'function format(value) { return value; } format.bind(undefined, 1); format(1); format(1);',
		'let format = value => value; format(1); format(1); format = other;',
		'function format(value) { return arguments[0]; } format(1); format(1);',
		'function format(value) { return (() => arguments[0])(); } format(1); format(1);',
		'const format = value => value; eval(source); format(1); format(1);',
		'function format(value) { return value; } format(...items); format(1); format(1);',
		'function format(value) { return value; } format(0); format(-0);',
		'function format(value) { return value; } format(1); format(1n);',
		'function format(value) { return value; } format(null); format(undefined);',
		'const undefined = 1; function format(value) { return value; } format(); format(undefined);',
		'function format(value) { return value; } format({}); format({});',
		'function format(value) { return value; } format([]); format([]);',
		'function format(value) { return value; } format(/test/); format(/test/);',
		'function format(value) { return value; } format(compute()); format(compute());',
		'function format(value) { return value; } format(void compute()); format(void compute());',
		'let limit = 1; function format(value) { return value; } format(limit); limit++; format(limit);',
		'import {limit} from "limits"; function format(value) { return value; } format(limit); format(limit);',
		'const first = 1; const second = 1; function format(value) { return value; } format(first); format(second);',
		'function format(value) { return value; } { const limit = 1; format(limit); format(limit); }',
		'class Formatter { format(value) { return value; } run() { this.format(1); this.format(1); } }',
		'export class Point { constructor(value) { this.value = value; } } new Point(1); new Point(1);',
		'class Point { constructor(value) { this.value = value; } } class Other extends Point {} new Point(1); new Point(1);',
		'class Formatter { #format(value) { return value; } run() { consume(this.#format); this.#format(1); this.#format(1); } }',
		'class Formatter { #format(value) { return value; } run() { this.#format(1); this.#format(2); } }',
		'function walk(value, callback) { return value ? walk(value.next, other) : callback(value); } walk(first, print); walk(second, print);',
		'function condition(value, allowOr = true) { return value && condition(value.next, false); } condition(first); condition(second);',
		'function walk(value, callback) { callback = other; return value ? walk(value.next, callback) : value; } walk(first, print); walk(second, print);',
		'function walk(value, callback) { return value ? walk(value.next, callback) : callback(value); } walk(first, print);',
		'function format(...values) { return values; } format(1); format(1);',
		'function format({value}) { return value; } format({value: 1}); format({value: 2});',
		'function format({value}) { return value; } format(options); format(options);',
		'function format({value}) { return value; } format({value: 1, ...other}); format({value: 1});',
		'function format({value}) { return value; } format({value: 1, value: 1}); format({value: 1});',
		'function format({value}) { return value; } format({get value() { return 1; }}); format({value: 1});',
		'function format({value}) { return value; } format({[key]: 1}); format({value: 1});',
		'function format({value}) { return value; } format({__proto__: other, value: 1}); format({value: 1});',
		'function format({nested: {value}}) { return value; } format({nested: {value: 1}}); format({nested: {value: 1}});',
		'function format([value]) { return value; } format([1]); format([1]);',
		'function format(value) { return value; } format`literal`; format(1); format(1);',
		{code: 'function format(value) { return value; } format(1); format(1);', languageOptions: {sourceType: 'script'}},
		{code: 'function format(value) { return value; } with (object) { format(1); format(1); }', languageOptions: {sourceType: 'script'}},
		{code: 'function format(value) { return value; } format(1); format(1);', options: [{minimumCallCount: 3}]},
	],
	invalid: [
		'function format(value) { return value; } format(1); format(1);',
		'const format = value => value; format(1); format(1);',
		'const format = (value) => value; format(1); format(1);',
		'const format = function (value) { return value; }; format(1); format(1);',
		'const format = function inner(value) { return value; }; format(1); format(1);',
		'function format(first, unit, last) { return first + unit + last; } format(1, "px", 2); format(3, "px", 4);',
		'function format(value) { return value; } format("text"); format(\'text\');',
		'function format(value) { return value; } format(16); format(0x10);',
		'function format(value) { return value; } format(-1); format(-0x1);',
		'function format(value) { return value; } format(+1); format(1);',
		'function format(value) { return value; } format(-0); format(-0);',
		'function format(value) { return value; } format(1n); format(0x1n);',
		'function format(value) { return value; } format(-1n); format(-1n);',
		'function format(value) { return value; } format(true); format(true);',
		'function format(value) { return value; } format(false); format(false);',
		'function format(value) { return value; } format(null); format(null);',
		'function format(value) { return value; } format(`text`); format("text");',
		'function format(value) { return value; } format(); format();',
		'function format(value) { return value; } format(); format(undefined);',
		'function format(value) { return value; } format(void 0); format(undefined);',
		'function format(value = false) { return value; } format(); format(false); format(undefined);',
		'function format(value = 1) { return value; } format(2); format(2);',
		'function format(first, second = first, third = second) { return [first, second, third]; } format(1); format(2);',
		'function format(value = create()) { return value; } format(); format(undefined);',
		'function format(value = {}) { return value; } format(); format();',
		'function format(first, second = first) { return first + second; } format(1); format(2);',
		'function format(first, second = first) { second++; return first + second; } format(1); format(2);',
		'const format = (first, second = first) => first + second; format(1); format(2);',
		'async function format(first, second = first) { return first + second; } format(1); format(2);',
		'function * format(first, second = first) { yield first + second; } format(1); format(2);',
		'function format(value) { value++; return value; } format(1); format(1);',
		'const limit = 10; function format(value) { return value; } format(limit); format(limit);',
		'let limit = 10; function format(value) { return value; } format(limit); format(limit);',
		'const value = 1; function format(value) { return value; } format(value); format(value);',
		'function outer(limit) { function format(value) { return value; } format(limit); format(limit); }',
		'function format(root) { return root; } format(document); format(document);',
		'function format(value) { return value; } format?.(1); format?.(1);',
		'function format(value) { return value; } (format)(1); ((format))(1);',
		'function format(value) { return () => value; } format(1); format(1);',
		'function format(value) { return {value}; } format(1); format(1);',
		'function format(value) { return value.toString(); } format(1); format(1);',
		'function format(value) { return -value; } format(-1); format(-1);',
		{code: 'const format = value => <span>{value}</span>; format(1); format(1);', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'function format(value) { function other() { return arguments[0]; } return value; } format(1); format(1);',
		'class Point { constructor(x, y, z) { this.point = [x, y, z]; } } new Point(1, 2, 0); new Point(3, 4, 0);',
		'function Point(x, y, z) { this.point = [x, y, z]; } new Point(1, 2, 0); new Point(3, 4, 0);',
		'const Point = class { constructor(value) { this.value = value; } }; new Point(1); new Point(1);',
		'class Formatter { #format(value, unit) { return value + unit; } run() { this.#format(1, "px"); this.#format(2, "px"); } }',
		'export class Formatter { #format(value, unit) { return value + unit; } run() { this.#format(1, "px"); this.#format(2, "px"); } }',
		'class Formatter { static #format(value, unit) { return value + unit; } static run() { this.#format(1, "px"); this.#format(2, "px"); } }',
		'class Formatter { #format(value) { return value; } run(other) { other.#format(1); other.#format(1); } }',
		'class Formatter { #format(value) { return value; } run() { return class Other { run(formatter) { formatter.#format(1); formatter.#format(1); } }; } }',
		outdent`
			class Formatter {
				#format(value) { return value; }
				run() {
					this.#format(1);
					this.#format(1);
					return class Other {
						#format(value) { return value; }
						run() { this.#format(2); this.#format(3); }
					};
				}
			}
		`,
		'function walk(value, callback) { return value ? walk(value.next, callback) : callback(value); } walk(first, print); walk(second, print);',
		'const walk = function inner(value, callback) { return value ? inner(value.next, callback) : callback(value); }; walk(first, print); walk(second, print);',
		'function walk(value, callback) { return value ? walk(value.next, callback) : callback(value); } walk(first, print); walk(second, print); function print(value) { return value; }',
		'function walk(value, unit) { return value ? walk(value.next, "px") : unit; } walk(first, "px"); walk(second, "px");',
		'function format({path, verbose, dryRun = false}) { return [path, verbose, dryRun]; } format({path: "a", verbose: true}); format({path: "b", verbose: true, dryRun: false});',
		'function format({value: renamed}) { return renamed; } format({value: 1}); format({value: 1});',
		'const value = 1; function format({value}) { return value; } format({value}); format({value});',
		'function format({value = 1}) { return value; } format({}); format({value: undefined});',
		'function format({value = 1}) { return value; } format({}); format({value: 1});',
		'function format({first, second = first}) { return [first, second]; } format({first: 1}); format({first: 2});',
		'function format({value}) { return value; } format({}); format({});',
		'function format({value, ...rest}) { return [value, rest]; } format({value: 1, other: 2}); format({value: 1, other: 3});',
		'function format({value = 1} = {}) { return value; } format(); format({});',
		'function format({"unit": unit}) { return unit; } format({unit: "px"}); format({"unit": "px"});',
		'function format(value, other) { return value + other; } format(1, ...items); format(1, 2);',
		'function format(value /* keep */) { return value; } format(1); format(1);',
		'function format(value) { return value; } format(/* keep */ 1); format(1);',
		'function format({value /* keep */}) { return value; } format({value: 1}); format({value: 1});',
		'function format({value}) { return value; } format({value: /* keep */ 1}); format({value: 1});',
		'function format(value) { const limit = 2; return value; } const limit = 1; format(limit); format(limit);',
		'function format(value) { return value; } format(limit); format(limit); const limit = 1;',
		{code: 'function format(value) { return value; } format(1);', options: [{minimumCallCount: 1}]},
		{code: 'function format(value) { return value; } format(1); format(1); format(1);', options: [{minimumCallCount: 3}]},
		{code: 'function outer() { function format(value) { return value; } format(1); format(1); }', languageOptions: {sourceType: 'script'}},
		outdent`
			function format(first, second = first) {
				'use custom directive';
				return first + second;
			}
			format(1);
			format(2);
		`,
		'function format(first, second = first) {\r\n    return first + second;\r\n}\r\nformat(1);\r\nformat(2);',
	],
});

testRule.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		'class Formatter { private format(value: number) { return value; } run() { this.format(1); this.format(1); } }',
		'class Formatter { #format(value); #format(value) { return value; } run() { this.#format(1); this.#format(1); } }',
		'class Point { constructor(public value: number) {} } new Point(1); new Point(1);',
		'function format(value) { return value; } format(1); format(1); (eval as any)("format(2)");',
		'function format(value) { return value; } format(1); format(1); eval!("format(2)");',
		'class Point { constructor(@decorate value) { this.value = value; } } new Point(1); new Point(1);',
		'function format(value: number) { return value; } format(1); format(2);',
	],
	invalid: [
		'function format(value: number) { return value; } format(1); format(1);',
		'const format: (value: number) => number = value => value; format(1); format(1);',
		'function format<T>(value: T) { return value; } format<number>(1); format<number>(1);',
		'function format(value: number) { return value; } format(1 as number); format(1 satisfies number);',
		'const limit = 1; function format(value: number) { return value; } format(limit!); format(limit as number);',
		'function format(this: void, value: number) { return value; } format(1); format(1);',
		'class Point { constructor(public x: number, value: number) { this.value = value; } } new Point(1, 0); new Point(2, 0);',
		'class Formatter { #format(value: number, unit: string) { return value + unit; } run() { this.#format(1, "px"); this.#format(2, "px"); } }',
		'class Point { constructor(value: number) { this.value = value; } } let point: Point; new Point(1); new Point(1);',
		'function format(value) { return value; } type Signature = typeof format; format(1); format(1);',
	],
});

const config = {
	languageOptions: {ecmaVersion: 'latest'},
	plugins: {unicorn: plugin},
	rules: {'unicorn/no-unnecessary-parameters': 'error'},
};

const linter = new Linter();

test('fixes multiple parameters across successive passes', t => {
	const code = 'function format(first, second, third) { return [first, second, third]; } format(1, 2, 3); format(1, 2, 3);';
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.regex(result.output, /function format\(\)/);
	t.regex(result.output, /format\(\); format\(\);$/);
	t.false(linter.verifyAndFix(result.output, config).fixed);
});

test('preserves results when fixing literal, constructor, and recursive arguments', t => {
	const code = outdent`
		function format(value, unit) {
			return value + unit;
		}
		class Point {
			constructor(x, y, z) {
				this.point = [x, y, z];
			}
		}
		function walk(value, unit) {
			return value.next ? walk(value.next, unit) : value.value + unit;
		}
		[
			format(1, 'px'),
			format(2, 'px'),
			new Point(1, 2, 0).point,
			new Point(3, 4, 0).point,
			walk({next: {value: 1}}, 'px'),
			walk({value: 2}, 'px'),
		];
	`;
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('preserves object rest while removing a destructured property', t => {
	const code = 'function format({value, ...rest}) { return [value, rest]; } [format({value: 1, other: 2}), format({value: 1, other: 3})];';
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('preserves earlier-parameter defaults and parameter mutation', t => {
	const code = 'function format(first, second = first) { second++; return [first, second]; } [format(1), format(2)];';
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('does not inline a callback into a direct eval call', t => {
	const code = 'function format(callback) { const secret = 1; return callback("typeof secret"); } format(eval); format(eval);';
	const result = linter.verifyAndFix(code, {...config, languageOptions: {globals: {eval: 'readonly'}}});
	t.false(result.fixed);
	t.is(result.messages.length, 1);
	t.is(vm.runInNewContext(result.output), 'undefined');
});

test('keeps a default that reads a parameter shadowed by a body variable', t => {
	const code = 'function format(first, second = first) { var first = 10; return second; } [format(1), format(2)];';
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.messages.length, 1);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), '[1,2]');
});

test('does not move fresh default values into a generator body', t => {
	const code = 'let count = 0; function * format(value = ++count) { yield value; } const first = format(); const second = format(); [count, first.next().value, second.next().value];';
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.messages.length, 1);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), '[2,1,2]');
});

test('keeps comments in ranges removed by positional fixes', t => {
	const code = 'function format(value /* signature */) { return value; } format(/* argument */ 1); format(1);';
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.output, code);
	t.is(result.messages.length, 1);
});

test('keeps distinct object identities from default initializers', t => {
	const code = 'function format(value = {}) { return value; } const values = [format(), format()]; values[0] === values[1];';
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.messages.length, 1);
	t.false(vm.runInNewContext(result.output));
});

test('reports readonly globals without replacing argument snapshots', t => {
	const code = 'function format(root) { return () => root; } format(document); format(document);';
	const result = linter.verifyAndFix(code, {...config, languageOptions: {globals: {document: 'readonly'}}});
	t.false(result.fixed);
	t.is(result.messages.length, 1);
});

test('does not turn a replaced parameter into a strict-mode directive', t => {
	const code = 'function format(value) { value; return this === undefined; } [format("use strict"), format("use strict")];';
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('preserves statement boundaries before a parenthesized numeric receiver', t => {
	const code = outdent`
		function consume() {}
		function format(value) {
			consume()
			value.toString();
			return value;
		}
		[format(1), format(1)];
	`;
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('preserves rest arguments when removing a middle parameter', t => {
	const code = 'function format(first, unit, ...rest) { return [first, unit, rest]; } [format(1, "px", 2), format(3, "px", 4, 5)];';
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), JSON.stringify(vm.runInNewContext(code)));
});

test('keeps the original earlier-parameter snapshot across recursive forwarding', t => {
	const code = 'function walk(node, saved = node) { return node.next ? walk(node.next, saved) : saved.value; } [walk({value: 1, next: {value: 2}}), walk({value: 3, next: {value: 4}})];';
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.messages.length, 1);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), '[1,3]');
});

test('fixes a parameter with the same name as a stable outer binding', t => {
	const code = 'const value = 1; function format(value) { return value; } [format(value), format(value)];';
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.regex(result.output, /function format\(\)/);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('fixes shorthand object arguments with the same name as an outer binding', t => {
	const code = 'const value = 1; function format({value}) { return value; } [format({value}), format({value})];';
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
});

test('does not remove snapshots from async and generator signatures', t => {
	for (const declaration of ['async function', 'function *']) {
		const code = `${declaration} format(first, second = first) { return first + second; } format(1); format(2);`;
		const result = linter.verifyAndFix(code, config);
		t.false(result.fixed);
		t.is(result.messages.length, 1);
	}
});

test('skips own arguments in named function expressions and their arrows', t => {
	for (const body of ['return arguments[0];', 'return (() => arguments[0])();']) {
		const code = `const format = function inner(value) { ${body} }; [format(1), format(1)];`;
		const result = linter.verifyAndFix(code, config);
		t.false(result.fixed);
		t.deepEqual(result.messages, []);
		t.is(JSON.stringify(vm.runInNewContext(result.output)), '[1,1]');
	}
});

test('avoids overlapping edits while expanding a recursive concise arrow', t => {
	const code = 'const format = (first, second = first) => first ? format(0, undefined) : second; [format(1), format(2)];';
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.messages.length, 1);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), '[0,0]');
});

test('preserves a class argument temporal dead zone before entering the function', t => {
	const code = outdent`
		let count = 0;
		function format(value) {
			count++;
			return value;
		}
		try { format(Point); } catch {}
		try { format(Point); } catch {}
		class Point {}
		count;
	`;
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.messages.length, 1);
	t.is(vm.runInNewContext(result.output), 0);
});

test('keeps parameter snapshots when a var initializer executes repeatedly', t => {
	const code = outdent`
		function format(value) {
			return () => value;
		}
		const callbacks = [];
		for (var limit of [1, 2]) {
			callbacks.push(format(limit), format(limit));
		}
		callbacks.map(callback => callback());
	`;
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(JSON.stringify(vm.runInNewContext(result.output)), '[1,1,2,2]');
});

test('preserves a parameter temporal dead zone in an earlier initializer', t => {
	const code = outdent`
		let count = 0;
		function format(first = second, second) {
			count++;
			return second;
		}
		try { format(undefined, 1); } catch {}
		try { format(undefined, 1); } catch {}
		count;
	`;
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.messages.length, 2);
	t.is(vm.runInNewContext(result.output), 0);
});

test('keeps omitted defaults in parameter scope before the body runs', t => {
	for (const [parameter, declaration] of [
		['value = limit', 'const limit = 1;'],
		['{value = limit} = {}', 'const limit = 1;'],
		['value = Point', 'class Point {}'],
	]) {
		const code = `let count = 0; function format(${parameter}) { count++; return value; } try { format(); } catch {} try { format(); } catch {} ${declaration} count;`;
		const result = linter.verifyAndFix(code, config);
		t.false(result.fixed);
		t.is(result.messages.length, 1);
		t.is(vm.runInNewContext(result.output), 0);
	}
});
