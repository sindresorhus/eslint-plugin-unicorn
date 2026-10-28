import {runInNewContext} from 'node:vm';
import test from 'node:test';
import outdent from 'outdent';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {ruleId, rule, test: ruleTester} = getTester(import.meta);

ruleTester({
	valid: [
		'const value = (a && x > 1) || (a && b);',
		'if ((a + b && c) || (a + b && d)) {}',
		'if ((a && b * c) || (a && d)) {}',
		'if ((a && x?.value > 1) || (a && b)) {}',
		'if ((x++ > 1 && a) || (x++ > 1 && b)) {}',
	],
	invalid: [
		['if ((a && x > 1) || (a && b)) {}', 'if (a && (x > 1 || b)) {}'],
		['if ((a == null && b) || (a == null && c)) {}', 'if (a == null && (b || c)) {}'],
		['const value = (x > 1 && y < 2) || (x > 1 && y > 5);', 'const value = x > 1 && (y < 2 || y > 5);'],
		['for ((a in b && false) || (a in b && true);;) {break;}', 'for ((a in b) && (false || true);;) {break;}'],
		['for (value = (a in b === true || false) && (a in b === true || true);;) {break;}', 'for (value = (a in b === true) || (false && true);;) {break;}'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

for (const operator of ['==', '!=', '<', '<=', '>', '>=', 'in', 'instanceof']) {
	const commonText = operator === 'in' ? '(a in b)' : `a ${operator} b`;

	ruleTester({
		valid: [],
		invalid: [
			[`if ((a ${operator} b && c) || (a ${operator} b && d)) {}`, `if (${commonText} && (c || d)) {}`],
			[`if ((a ${operator} b || c) && (a ${operator} b || d)) {}`, `if (${commonText} || (c && d)) {}`],
			[`if ((a && b ${operator} c) || (a && d)) {}`, `if (a && (b ${operator} c || d)) {}`],
			[`if ((a || b) && (a || c ${operator} d)) {}`, `if (a || (b && c ${operator} d)) {}`],
		].map(([code, output]) => ({code, output, errors: 1})),
	});
}

ruleTester({
	valid: [],
	invalid: [
		{
			code: 'if (((x as number) > 1 && a) || ((x as number) > 1 && b)) {}',
			output: 'if ((x as number) > 1 && (a || b)) {}',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'if ((a == null /* keep */ && b) || (a == null && c)) {}',
			errors: [{messageId: 'prefer-simplified-conditions', suggestions: []}],
		},
		{
			code: 'if ((getValue() > 1 && a) || (getValue() > 1 && b)) {}',
			errors: [{
				messageId: 'prefer-simplified-conditions',
				suggestions: [{messageId: 'suggestion', output: 'if (getValue() > 1 && (a || b)) {}'}],
			}],
		},
		{
			code: 'if ((a && getValue() < 1) || (a && b)) {}',
			errors: [{
				messageId: 'prefer-simplified-conditions',
				suggestions: [{messageId: 'suggestion', output: 'if (a && (getValue() < 1 || b)) {}'}],
			}],
		},
	],
});

ruleTester({
	valid: [
		'if ((object.property && a) || (object[tag`property`] && b)) {}',
		'if ((object.property && a) || (object[`prop${name}`] && b)) {}', // eslint-disable-line no-template-curly-in-string
	],
	invalid: [
		{
			code: 'if ((object.property && a) || (object[`property`] && b)) {}',
			output: 'if (object.property && (a || b)) {}',
			errors: 1,
		},
		{
			code: 'if ((object[`prop\\u0065rty`] && a) || (object.property && b)) {}',
			output: 'if (object[`prop\\u0065rty`] && (a || b)) {}',
			errors: 1,
		},
		{
			code: 'if (`ready` || ("ready" && value)) {}',
			output: 'if (`ready`) {}',
			errors: 1,
		},
		{
			code: 'function check(ready) { if ((ready && ``) || ready) {} }',
			output: 'function check(ready) { if (ready) {} }',
			errors: 1,
		},
		{
			code: 'if ((object.property && a) || (object[`property` as string] && b)) {}',
			output: 'if (object.property && (a || b)) {}',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

ruleTester({
	valid: [],
	invalid: [
		['if (x || (a && b) || (a && c)) {}', 'if (x || (a && (b || c))) {}'],
		['if ((a && b) || (a && c && d)) {}', 'if (a && (b || (c && d))) {}'],
		['if ((a === `x` && b) || (a === `x` && c)) {}', 'if (a === `x` && (b || c)) {}'],
		['({} || (a === true && b === true)) || (a === true && c === true);', '({} || (a === true && (b === true || c === true)));'],
		['const getValue = () => ({} || (a === true && b === true)) || (a === true && c === true);', 'const getValue = () => ({} || (a === true && (b === true || c === true)));'],
		['export default (class {} || (a === true && b === true)) || (a === true && c === true);', 'export default (class {} || (a === true && (b === true || c === true)));'],
		['foo()\na === true && b === true || a === true && c === true || x', 'foo()\n;(a === true && (b === true || c === true)) || x'],
		['if (x || (Array.isArray(value) && a) || (Array.isArray(value) && b && c)) {}', 'if (x || (Array.isArray(value) && (a || (b && c)))) {}'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

ruleTester.snapshot({
	valid: [
		'a && b',
		'a || b',
		'!a',
		'!!a',
		'!!(a && b)',
		'!(a && b)',
		'!(a || b)',
		'!(a && b && c)',
		'!(a || b || c)',
		'!(a && (b || c))',
		'!((a && b) || (a && c))',
		'!(a > b)',
		'!(a >= b)',
		'!(a < b)',
		'!(a <= b)',
		'!(min <= x && x <= max)',
		'!(key in object)',
		'!(value instanceof Class)',
		'!((a))',
		'const result = !(!a && b);',
		'foo(!(!function () {} && b));',
		'!(!a && !b)',
		'!(!a && !b && !c)',
		'!(key === "y" && !isEditable(target))',
		'!(a > b && c)',
		'!(a && b > c)',
		'!(a?.b && c)',
		'!(a && b /* comment */)',
		'!/* comment */(a && b)',
		'foo(!(a && b))',
		outdent`
			foo
			!(a && b)
		`,
		outdent`
			foo
			!(!(a && b) && c)
		`,
		outdent`
			function foo() {
				return!
					(a && b);
			}
		`,
		outdent`
			function foo() {
				throw!
					(a || b);
			}
		`,
		'function foo() { return!(a && b); }',
		'function foo() { throw!(a || b); }',
		'!(a && b) && c',
		'const value = !(a && b) === c;',
		'async function foo() { await !(a && b); }',
		'(!(a && b)).toString();',
		'(!(a && b))();',
		'new (!(a && b))();',
		'(!(a && b))`x`',
		{
			code: '!(foo! && bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '!((foo as string) && bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '!((foo satisfies string) && bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '!(<string>foo && bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const value = (!(a && b)) as boolean;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		'(a && b) || c',
		'a || (b && c)',
		'(a && b) || (c && d)',
		'if ((a?.b && c) || (a?.b && d)) {}',
		'if ((a && b?.c) || (a && d)) {}',
		'(a && object.property) || (a && c)',
		'(foo() && a) || (foo() && b)',
		'(new Foo() && a) || (new Foo() && b)',
		'(a && b) || (a && b)',
		'if ((a && b) || (a && b)) {}',
		'if ((a || b) && (b || a)) {}',
		'if ((a && b) || (c && a)) {}',
		'if ((b && a) || (a && c)) {}',
		'if ((b && a) || (c && a)) {}',
		'while ((a || c) && (b || c)) {}',
		'if ((c || a) && (b || c)) {}',
		'if ((a || c) && (c || b)) {}',
		'if (((a || c) && (b || c)) && d) {}',
		'if ((a && b) || a) {}',
		'if (a || (b && a)) {}',
		'if ((a || b) && a) {}',
		'if (a && (b || a)) {}',
		'if ((object.property && a) || a) {}',
		'const value = (a && b) || a;',
		'function foo(a, b) { const value = (a && b) || a; }',
		'function foo(a) { let b; if ((b && a) || a) {} }',
		'function foo(a) { const b = true; if ((b && a) || a) {} }',
		'class Foo extends Bar { constructor(a) { if ((this && a) || a) {} super(); } }',
		'class Foo extends Bar { constructor(a) { if ((a && this) || a) {} super(); } }',
		'if ((a++ && b) || (a++ && c)) {}',
		'if (((a = value) && b) || ((a = value) && c)) {}',
		'if ((Array?.isArray(value) && a) || (Array?.isArray(value) && b)) {}',
		'if ((Array.isArray?.(value) && a) || (Array.isArray?.(value) && b)) {}',
		'if ((Number?.isInteger(value) && a) || (Number?.isInteger(value) && b)) {}',
		'if ((Number.isInteger?.(value) && a) || (Number.isInteger?.(value) && b)) {}',
		'const value = (a && b) || (a && c)',
		'const value = (a || c) && (b || c)',
		'const value = (a === true || c === true) && (b === true || c === true);',
		'const value = (a && object.property) || (a && c)',
		'const value = (Array.isArray(value) && a) || (Array.isArray(value) && b)',
		'const value = (a && b /* comment */) || (a && c)',
		{
			code: 'declare const a: boolean; declare const b: boolean; declare const c: boolean; const value = (a || c) && (b || c);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		typeAware('declare const flags: {a: boolean; b: boolean; c: boolean}; const a = flags.a; const b = flags.b; const c = flags.c; const value = (a || c) && (b || c);'),
		// Only parameters, function names, and `var` variables are safe to drop
		'function foo(a) { if ((arguments && a) || a) {} }',
		'import b from "b"; function foo(a) { if ((b && a) || a) {} }',
		// TypeScript wrappers around a control flow test are not looked through
		{
			code: 'if (((a && b) || (a && c)) as boolean) {}',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
		'if (!(!a && !b)) {}',
		'if (!(!a && b)) {}',
		'while (!(!a && b)) {}',
		'if (!(!a && !b && !c)) {}',
		'if (!(x !== undefined && y !== undefined)) {}',
		'if (!(key === "y" && !isEditable(target))) {}',
		'!(key !== "y" || isEditable(target))',
		'!(a == b && c != d)',
		'if (!(!a && b /* comment */)) {}',
		'if (a || (a && b)) {}',
		'if (a || (a && b /* comment */)) {}',
		'if (a && (a || b)) {}',
		'const value = a || (a && b);',
		'function foo(a, b) { return(a || (a && b)); }',
		'function foo(a, b) { throw(a || (a && b)); }',
		'if ((a && true) || a) {}',
		'function foo(a, b) { if ((a && b) || a) {} }',
		'function foo(a, b) { if ((b && a) || a) {} }',
		'function foo(a, b) { if (a || (b && a)) {} }',
		'function foo(a, b) { if ((a || b) && a) {} }',
		'function foo(a, b) { if (a && (b || a)) {} }',
		'function foo(a) { var b; if ((b && a) || a) {} }',
		'if ((a && b) || (a && c)) {}',
		'function foo() { return(a === true && b === true) || (a === true && c === true); }',
		'function foo() { throw(a === true && b === true) || (a === true && c === true); }',
		'if ((a && b /* comment */) || (a && c)) {}',
		'if ((Array.isArray(value) && a) || (Array.isArray(value) && b)) {}',
		'if ((ArrayBuffer.isView(value) && a) || (ArrayBuffer.isView(value) && b)) {}',
		'if ((Error.isError(value) && a) || (Error.isError(value) && b)) {}',
		'if ((Number.isFinite(value) && a) || (Number.isFinite(value) && b)) {}',
		'if ((Number.isInteger(value) && a) || (Number.isInteger(value) && b)) {}',
		'if ((Number.isNaN(value) && a) || (Number.isNaN(value) && b)) {}',
		'if ((Number.isSafeInteger(value) && a) || (Number.isSafeInteger(value) && b)) {}',
		'if ((c || a) && (c || b)) {}',
		'if (((c || a) && (c || b)) && d) {}',
		'Boolean((a && b) || (a && c))',
		'const value = (a === true && b === true) || (a === true && c === true);',
		'const value = (Array.isArray(value) && a === true) || (Array.isArray(value) && b === true);',
		'const value = (Error.isError(value) && a === true) || (Error.isError(value) && b === true);',
		'const value = (Number.isInteger(value) && a === true) || (Number.isInteger(value) && b === true);',
		{
			code: 'declare const a: boolean; declare const b: boolean; declare const c: boolean; const value = (a && b) || (a && c);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'function foo(a: boolean, b: boolean) { const value = (a && b) || a; }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		typeAware('declare const flags: {a: boolean; b: boolean; c: boolean}; const a = flags.a; const b = flags.b; const c = flags.c; const value = (a && b) || (a && c);'),
		'if (!(!(a || b) || !c)) {}',
		'function foo(a, b) { if (a || (!b && a)) {} }',
		'if ((a !== b && c) || (a !== b && d)) {}',
		'foo(!(a !== b && c !== d));',
		'foo[!(a !== b && c !== d)];',
		{
			code: 'const value = !(a !== b && c !== d) as boolean;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// Absorption keeps the value, so it does not need a boolean context
		{
			code: 'if ((a || (a && b))!) {}',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// The opening parenthesis of a non-null assertion does not need a semicolon before the replacement
		{
			code: 'if (((a) || (a && b))!) {}',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});

ruleTester.snapshot({
	valid: [
		'if ((foo?.() && a) || (foo?.() && b)) {}',
		'if ((object.property && a) || (object?.property && b)) {}',
		'if ((object?.property && a) || (object.property && b)) {}',
		'if ((a && foo?.()) || (a && b)) {}',
		'if ((foo(object?.property) && a) || (foo(object?.property) && b)) {}',
		'if ((object[foo?.()] && a) || (object[foo?.()] && b)) {}',
		'if ((object.property && a) || (object.other && b)) {}',
		'if ((foo(a) && b) || (foo(c) && d)) {}',
		'if ((new Foo() && a) || (new Foo() && b)) {}',
		'if ((a && b++) || (a && c)) {}',
		'if ((a && (b = value)) || (a && c)) {}',
		'const value = (object.property && a) || (object.property && b);',
		'const value = (foo() || a) && (foo() || b);',
		// Complex member objects and computed keys are intentionally unsupported.
		'Boolean((tag`x`.enabled && a) || (tag`x`.enabled && b));',
		'Boolean((object[tag`x`] && a) || (object[tag`x`] && b));',
		'Boolean((a && tag`x`.enabled) || (a && b));',
		'const values = [1].values(); Boolean(([...values].length && false) || ([...values].length && true));',
		'Boolean((object[[...values]] && a) || (object[[...values]] && b));',
		'Boolean(({a: true}.a && false) || ({a: true}.a && true));',
		'if ((class {static enabled = true}.enabled && a) || (class {static enabled = true}.enabled && b)) {}',
		'if ((new Foo().enabled && a) || (new Foo().enabled && b)) {}',
		'if ((object[0] && a) || (object[(key = 0)] && b)) {}',
	],
	invalid: [
		'if ((foo.bar && a) || (foo.bar && b)) {}',
		'if ((foo.bar || a) && (foo.bar || b)) {}',
		'if ((a && object.property) || (a && c)) {}',
		'if ((a || b) && (a || object.property)) {}',
		'if ((object[key] && a) || (object[key] && b)) {}',
		'if ((object.nested.property && a) || (object.nested.property && b)) {}',
		'if ((object.property && a) || (object["property"] && b)) {}',
		'if ((!object.property && a) || (!object.property && b)) {}',
		'if ((object.property === value && a) || (object.property === value && b)) {}',
		'if (((foo).bar && a) || ((foo).bar && b)) {}',
		'if (((foo.bar) && (a)) || ((foo.bar) && (b))) {}',
		'if ((foo.bar /* keep */ && a) || (foo.bar && b)) {}',
		'if ((foo() && a) || (foo() && b)) {}',
		'if ((foo() || a) && (foo() || b)) {}',
		'if ((a && mutateA()) || (a && b)) {}',
		'if ((a || b) && (a || foo())) {}',
		'if ((object.method(value) && a) || (object.method(value) && b)) {}',
		'if ((getObject().property && a) || (getObject().property && b)) {}',
		'if ((object[getKey()] && a) || (object[getKey()] && b)) {}',
		'if ((object[0] && a) || (object[[0].at(0)] && b)) {}',
		'if ((!foo() && a) || (!foo() && b)) {}',
		'if ((foo() !== value && a) || (foo() !== value && b)) {}',
		'if ((foo() /* keep */ && a) || (foo() && b)) {}',
		'if ((a && foo(/* keep */)) || (a && b)) {}',
		'if ((Array.isArray(object.property) && a) || (Array.isArray(object.property) && b)) {}',
		'if ((Array.isArray(foo()) && a) || (Array.isArray(foo()) && b)) {}',
		'if ((Number.isInteger(foo()) && a) || (Number.isInteger(foo()) && b)) {}',
		'const Array = {isArray() { return true; }}; if ((Array.isArray(value) && a) || (Array.isArray(value) && b)) {}',
		'const Number = {isInteger() { return true; }}; if ((Number.isInteger(value) && a) || (Number.isInteger(value) && b)) {}',
		'if ((Array.isArray(value) && foo()) || (Array.isArray(value) && b)) {}',
		'if ((a && Array.isArray(value)) || (a && b)) {}',
		'class Foo extends Bar { method() { if ((super.enabled && a) || (super.enabled && b)) {} } }',
		'class Foo { #enabled; method() { if ((this.#enabled && a) || (this.#enabled && b)) {} } }',
		'if ((Array.isArray([...values]) && a) || (Array.isArray([...values]) && b)) {}',
	],
});

ruleTester.snapshot({
	valid: [],
	invalid: [
		'if (((object.property as boolean) && a) || ((object.property as boolean) && b)) {}',
		'if ((object.property! && a) || (object.property! && b)) {}',
		'if (((object.property satisfies boolean) && a) || ((object.property satisfies boolean) && b)) {}',
		'if (((<boolean>object.property) && a) || ((<boolean>object.property) && b)) {}',
		'if ((foo<boolean>() && a) || (foo<boolean>() && b)) {}',
		'if (((foo() as boolean) && a) || ((foo() as boolean) && b)) {}',
		'declare function foo(): boolean; declare const a: boolean; declare const b: boolean; const value = (foo() && a) || (foo() && b);',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
});

ruleTester.snapshot({
	valid: [],
	invalid: [typeAware('declare const flags: {a: boolean; b: boolean; c: boolean}; const value = (flags.a && flags.b) || (flags.a && flags.c);')],
});

test('autofixes common member reads', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('if ((foo.bar && a) || (foo.bar && b)) {}', {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, 'if (foo.bar && (a || b)) {}');
	t.assert.deepStrictEqual(result.messages, []);
});

test('member factoring preserves boolean results', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	};
	const values = [undefined, false, true, 0, 1, '', 'text'];

	for (const expression of [
		'(object.property && a) || (object.property && b)',
		'(object.property || a) && (object.property || b)',
		'(a && object.property) || (a && b)',
	]) {
		const code = `Boolean(${expression})`;
		const {fixed, output, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);

		for (const property of values) {
			for (const a of values) {
				for (const b of values) {
					const context = {object: {property}, a, b};
					t.assert.strictEqual(runInNewContext(output, context), runInNewContext(code, context));
				}
			}
		}
	}
});

for (const [code, expectedOutput] of [
	['if ((foo() && a) || (foo() && b)) {}', 'if (foo() && (a || b)) {}'],
	['(function () {}() === true && false) || (function () {}() === true && true);', '(function () {}() === true && (false || true));'],
	['(async function () {}() === true && false) || (async function () {}() === true && true);', '(async function () {}() === true && (false || true));'],
	['const get = () => ({method() {}}.method() === true && false) || ({method() {}}.method() === true && true);', 'const get = () => ({method() {}}.method() === true && (false || true));'],
	['(class {static get() {}}.get() === true && false) || (class {static get() {}}.get() === true && true);', '(class {static get() {}}.get() === true && (false || true));'],
	['if ((Array.isArray([...values]) && a) || (Array.isArray([...values]) && b)) {}', 'if (Array.isArray([...values]) && (a || b)) {}'],
	['if ((Array.isArray(...values) && a) || (Array.isArray(...values) && b)) {}', 'if (Array.isArray(...values) && (a || b)) {}'],
]) {
	test(`suggests common calls without autofixing: ${code}`, t => {
		const linter = new Linter();
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {[ruleId]: rule}}},
			rules: {[`unicorn/${ruleId}`]: 'error'},
		});

		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		const {suggestions} = result.messages[0];
		t.assert.strictEqual(suggestions.length, 1);
		const {fix} = suggestions[0];
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.deepStrictEqual(linter.verify(output, {}), []);
	});
}

ruleTester.snapshot({
	valid: [
		'!a',
		'!!(a && b)',
		'!(a ?? b)',
		'!(a < b)',
		'!((a && b) as boolean)',
		'const value = (a && b) || (a && c);',
	].map(code => ({
		code,
		options: [{negatedConditions: 'expand'}],
		languageOptions: {parser: parsers.typescript},
	})),
	invalid: [
		'if (!(loggedInUser && isWebPage())) {}',
		'!(a && b)',
		'!(a || b)',
		'!(a && b && c)',
		'!(a || b || c)',
		'!(a && (b || c))',
		'!(a || (b && c))',
		'!((a && b) || (a && c))',
		'const value = !(!a && b);',
		'const value = !(!a || b);',
		'if (!(!a && b)) {}',
		'!(a === b && c === d)',
		'!(a == b || c != d)',
		'!(min <= value && value <= max)',
		'!(a?.b && foo?.())',
		'!((a ?? b) && c)',
		'!(a && b) ?? c',
		'c ?? !(a || b)',
		'!(a && (b ? c : d))',
		'!(a && (b = c))',
		'!(a && (b, c))',
		'!(a && (() => b))',
		'function* foo() { return !(a && (yield b)); }',
		'function foo() { return!\n(a && b); }',
		'function foo() { throw!\r\n(a || b); }',
		'function foo() {\r\n  return !(a && b);\r\n}',
		'!(a && b) && c',
		'const value = !(a && b) === c;',
		'async function foo() { await !(a && b); }',
		'(!(a && b)).toString();',
		'!(a && b /* comment */)',
		'!/* comment */(a && b)',
	].map(code => ({code, options: [{negatedConditions: 'expand'}]})),
});

ruleTester.snapshot({
	valid: [],
	invalid: [
		{
			code: 'const element = <div>{!(a && b)}</div>;',
			options: [{negatedConditions: 'expand'}],
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
});

ruleTester.snapshot({
	valid: [],
	invalid: [
		'!(foo! && bar)',
		'!((foo as string) && bar)',
		'!((foo satisfies string) && bar)',
		'!(<string>foo && bar)',
		'const value = (!(a && b)) as boolean;',
	].map(code => ({
		code,
		options: [{negatedConditions: 'expand'}],
		languageOptions: {parser: parsers.typescript},
	})),
});

ruleTester.snapshot({
	valid: [],
	invalid: [
		{
			code: 'declare const a: boolean; const value = !(!a && b);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const flags: {a: boolean}; const value = !(!flags.a || b);'),
	].map(testCase => ({...testCase, options: [{negatedConditions: 'expand'}]})),
});

ruleTester.snapshot({
	valid: ['!(a && b)', '!(a || b)'].map(code => ({code, options: [{negatedConditions: 'simplify'}]})),
	invalid: [],
});

for (const [options, code, output] of [
	[[], 'if (!(!a && !b && !c)) {}', 'if (a || b || c) {}'],
	[[], 'if ((a && b && c) || (a && b && d)) {}', 'if (a && (b && (c || d))) {}'],
	[[], 'if ((a || b || c) && (a || b || d)) {}', 'if (a || (b || (c && d))) {}'],
	[[{negatedConditions: 'expand'}], 'if (!(a && (b || c))) {}', 'if (!a || (!b && !c)) {}'],
	[[{negatedConditions: 'expand'}], 'const a = true;\nfoo()\n!(!(a) && b && c)', 'const a = true;\nfoo()\n;(a) || !b || !c'],
	[[{negatedConditions: 'expand'}], 'foo()\n!(!(a === b) && c && d)', 'foo()\n;(a === b) || !c || !d'],
]) {
	test(`applies repeated fixes until no nested simplifications remain: ${code}`, t => {
		const linter = new Linter({configType: 'flat'});
		const result = linter.verifyAndFix(
			code,
			{
				plugins: {
					'rule-to-test': {
						rules: {
							[ruleId]: rule,
						},
					},
				},
				rules: {
					[`rule-to-test/${ruleId}`]: ['error', ...options],
				},
			},
			{filename: 'test.js'},
		);

		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
	});
}

test('expanded conditions preserve values and evaluation order', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: ['error', {negatedConditions: 'expand'}]},
	};
	const values = [undefined, false, true, 0, 1, NaN, '', 'text'];

	for (const expression of [
		'!(a() && b())',
		'!(a() || b())',
		'!(!a() && b())',
		'!(!a() || b())',
		'!(a() && !b())',
		'!(a() || !b())',
		'!(a() && (b() || a()))',
		'!(a() || (b() && a()))',
		'!(a() <= b() && b() <= 10)',
	]) {
		const code = `const result = ${expression}; result;`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);

		for (const left of values) {
			for (const right of values) {
				const originalCalls = [];
				const fixedCalls = [];
				const getContext = calls => ({
					a() {
						calls.push('a');
						return left;
					},
					b() {
						calls.push('b');
						return right;
					},
				});

				t.assert.strictEqual(runInNewContext(output, getContext(fixedCalls)), runInNewContext(code, getContext(originalCalls)));
				t.assert.deepStrictEqual(fixedCalls, originalCalls);
			}
		}
	}
});

test('expanded conditions settle with related rules enabled', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {
			[`unicorn/${ruleId}`]: ['error', {negatedConditions: 'expand'}],
			'unicorn/no-negated-comparison': ['error', {checkLogicalExpressions: true}],
			'unicorn/no-negated-condition': 'error',
			'unicorn/prefer-early-return': 'error',
		},
	};

	for (const [code, expectedOutput] of [
		['if (!(a === b && c === d)) { foo(); } else { bar(); }', 'if ((a === b && c === d)) { bar(); } else { foo(); }'],
		['const result = !(a && b) ? c : d;', 'const result = a && b ? d : c;'],
		['const result = !(a || b) ? c : d;', 'const result = a || b ? d : c;'],
		['function foo() { if (a && b) { bar(); baz(); qux(); } }', 'function foo() { if (!a || !b) {\n\treturn;\n}\n\nbar(); baz(); qux(); }'],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

// Absorption must not turn a value into a reference.
ruleTester({
	valid: ['(object.method || (object.method && other))();'],
	invalid: [
		...[
			'delete (value || (value && other));',
			'(callback || (callback && other))();',
			'(callback || (callback && other))?.();',
			'(tag || (tag && other))`text`;',
			'(eval || (eval && other))("typeof local");',
		].map(code => ({code, errors: [{messageId: 'prefer-simplified-conditions'}]})),
		...[
			'(callback || (callback && other))!();',
			'delete ((value || (value && other)) as unknown);',
		].map(code => ({
			code,
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-simplified-conditions'}],
		})),
		{
			code: 'const result = value || (value && other);',
			output: 'const result = value;',
			errors: [{messageId: 'prefer-simplified-conditions'}],
		},
		{
			code: 'new (Constructor || (Constructor && other))();',
			output: 'new (Constructor)();',
			errors: [{messageId: 'prefer-simplified-conditions'}],
		},
	],
});

test('absorption preserves indirect eval scope', t => {
	const code = 'function check() { const local = 1; return (eval || (eval && other))("typeof local"); } check();';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	});

	t.assert.strictEqual(runInNewContext(code), 'undefined');
	t.assert.strictEqual(runInNewContext(result.output), 'undefined');
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
});

ruleTester({
	valid: [],
	invalid: [
		['!({} === value && other !== final);', '({} !== value || other === final);'],
		['!(({} === value) && other !== final);', '({} !== value || other === final);'],
		['!((function () {} === value) && other !== final);', '(function () {} !== value || other === final);'],
		['const get = () => !(({} === value) && other !== final);', 'const get = () => ({} !== value || other === final);'],
		['!(function () {} === value && other !== final);', '(function () {} !== value || other === final);'],
		['const get = () => !({} === value && other !== final);', 'const get = () => ({} !== value || other === final);'],
		['const result = !({} === value && other !== final);', 'const result = {} !== value || other === final;'],
		['!(({}) === value && other !== final);', '({}) !== value || other === final;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

ruleTester.svelte({
	valid: [],
	invalid: [
		['{!(!/x/.test(value) && !/y/.test(value))}', '{(/x/.test(value) || /y/.test(value))}'],
		['{!(!/x/.test(value) || !/y/.test(value))}', '{(/x/.test(value) && /y/.test(value))}'],
		['{(!(!/x/.test(value) && !/y/.test(value)))}', '{(/x/.test(value) || /y/.test(value))}'],
		['{!(!(/x/.test(value)) && !/y/.test(value))}', '{(/x/.test(value)) || /y/.test(value)}'],
		['{/* keep */ !(!/x/.test(value) && !/y/.test(value))}', '{/* keep */ /x/.test(value) || /y/.test(value)}'],
		['<div title={!(!/x/.test(value) && !/y/.test(value))}></div>', '<div title={/x/.test(value) || /y/.test(value)}></div>'],
		['{@html !(!/x/.test(value) && !/y/.test(value))}', '{@html /x/.test(value) || /y/.test(value)}'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	ruleTester({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {?boolean} flag */ function run(flag) { return !(!flag && other); }',
			'/** @param {boolean | string} flag */ function run(flag) { return !(!flag || other); }',
			[
				'/** @param {boolean} first\n * @param {boolean} second\n * @param {unknown} third */',
				'function run(first, second, third) { return (first && second) || (first && third); }',
			].join('\n'),
			[
				'/** @param {boolean} first */ function run(first) {',
				' /** @type {boolean} */ const second = source;',
				' return (second && first) || first;',
				'}',
			].join('\n'),
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			[
				'/** @param {boolean} flag */ function run(flag) { return !(!flag && other); }',
				'/** @param {boolean} flag */ function run(flag) { return flag || !other; }',
			],
			[
				'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return !(!first || !second); }',
				'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return first && second; }',
			],
			[
				'/** @param {string} text */ function run(text) { return !(!text.includes("x") && other); }',
				'/** @param {string} text */ function run(text) { return text.includes("x") || !other; }',
			],
			[
				'/** @returns {boolean} */ function read() { return source; } !(!read() || other);',
				'/** @returns {boolean} */ function read() { return source; } read() && !other;',
			],
			[
				'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return (first && second) || first; }',
				'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return first; }',
			],
			[
				[
					'/** @param {boolean} first\n * @param {boolean} second\n * @param {boolean} third */',
					'function run(first, second, third) { return (first && second) || (first && third); }',
				].join('\n'),
				[
					'/** @param {boolean} first\n * @param {boolean} second\n * @param {boolean} third */',
					'function run(first, second, third) { return first && (second || third); }',
				].join('\n'),
			],
			[
				'/** @param {Set<string>} values */ function run(values) { return !(!values.has(key) || other); }',
				'/** @param {Set<string>} values */ function run(values) { return values.has(key) && !other; }',
			],
			[
				'/** @param {string} flag */ function run(/** @type {boolean} */ flag) { return !(!flag && other); }',
				'/** @param {string} flag */ function run(/** @type {boolean} */ flag) { return flag || !other; }',
			],
		].map(([code, output]) => ({
			code, output, filename: 'file.ts', errors: [{messageId: 'prefer-simplified-conditions'}],
		})),
	});

	ruleTester({
		testerOptions: {languageOptions},
		valid: [],
		invalid: [{
			code: [
				'/** @returns {boolean} */ function read() { return source; }',
				'/** @param {boolean} first\n * @param {boolean} second */',
				'function run(first, second) { return (read() && first) || (read() && second); }',
			].join('\n'),
			filename: 'file.ts',
			errors: [{
				messageId: 'prefer-simplified-conditions',
				suggestions: [{
					messageId: 'suggestion',
					output: [
						'/** @returns {boolean} */ function read() { return source; }',
						'/** @param {boolean} first\n * @param {boolean} second */',
						'function run(first, second) { return read() && (first || second); }',
					].join('\n'),
				}],
			}],
		}],
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	ruleTester({
		testerOptions: {languageOptions},
		valid: [{code: '/** @param {boolean} flag */ function run(flag) { return !(!(flag as string) && other); }', filename: 'file.ts'}],
		invalid: [],
	});
}

ruleTester.svelte({
	valid: [
		'{x || (a && b) || (a && c && d)}',
		'{x && (a || b) && (a || c || d)}',
	],
	invalid: [
		['{#if x || (a && b) || (a && c && d)}<p />{/if}', '{#if x || (a && (b || (c && d)))}<p />{/if}'],
		['{#if x && (a || b) && (a || c || d)}<p />{/if}', '{#if x && (a || (b && (c || d)))}<p />{/if}'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

ruleTester.svelte({
	valid: [],
	invalid: [
		{
			code: '{(/x/.test(value) === true && false) || (/x/.test(value) === true && true)}',
			errors: [
				{
					messageId: 'prefer-simplified-conditions',
					suggestions: [
						{
							messageId: 'suggestion',
							output: '{(/x/.test(value) === true && (false || true))}',
						},
					],
				},
			],
		},
	],
});

ruleTester.snapshot({
	valid: [
		'if ((a && b) || x || (a && c)) {}',
		`if (${Array.from({length: 100}, (_, index) => `flag${index}`).join(' || ')}) {}`,
		'if ((a || b) && x && (a || c)) {}',
		'if ((a && b && c) || (a && b && c)) {}',
		'if ((b && c && a) || (d && e && a)) {}',
		'if (x || (a && b) || (a && c && value?.property)) {}',
		'if (x || (a && b) || (a && c && d++)) {}',
		'if ((a === `${x}` && b) || (a === `${x}` && c)) {}', // eslint-disable-line no-template-curly-in-string
		'if (x || (object[`${key}`] && a) || (object[`${key}`] && b && c)) {}', // eslint-disable-line no-template-curly-in-string
		'if ((a === tag`x` && b) || (a === tag`x` && c)) {}',
		'if ((a === `x` && b) || (a === `y` && c)) {}',
		'const value = x || (a && b) || (a && c);',
		'const value = (a && b) || (a && c && d);',
		'const value = (a === `x` && b) || (a === `x` && c);',
		{
			code: 'if ((x || (a && b) || (a && c)) as boolean) {}',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'if (x || (a && b) || (a && c && object.property)) {}',
		'if (x || (a && b) || (a && c && foo())) {}',
		'if ((a && b) || (a && c) || x) {}',
		'if (x || (a && b) || (a && c) || y) {}',
		'if ((x || (a && b)) || ((a && c) || y)) {}',
		'if (x || ((a && b) || ((a && c) || y))) {}',
		'if ((a && b && c) || (a && d && e)) {}',
		'if ((a && (b && c)) || (a && (d && e))) {}',
		'if (((((a)) && (b))) || (((a) && (c && d)))) {}',
		'if (x && (a || b) && (a || c)) {}',
		'if ((a || b) && (a || c || d)) {}',
		'if ((a || b || c) && (a || d || e)) {}',
		'if ((x && (a || b)) && ((a || c) && y)) {}',
		'if (before() || (a && b) || (a && c) || after()) {}',
		'if ((a === `` && b) || (a === `` && c)) {}',
		'if ((a !== `line\\nx` || b) && (a !== `line\\nx` || c)) {}',
		'if ((`x` && b) || (`x` && c)) {}',
		'if (x || (a && b /* keep */) || (a && c)) {}',
		'if ((a && b) || (a && c && /* keep */ d)) {}',
		'if ((a && b) || (a && c) || x /* keep */) {}',
		'!((a && b) || (a && c) || x)',
		'if (x || /* keep */ (a && b) || (a && c)) {}',
		'if (\r\n  x ||\r\n  (a && b) ||\r\n  (a && c && d)\r\n) {}',
		'const value = x || (a === true && b === true) || (a === true && c === true && d === true);',
		'(function () {} || (a === true && b === true)) || (a === true && c === true);',
		'foo()\n;({} || (a === true && b === true)) || (a === true && c === true);',
		{
			code: 'declare const a: boolean; declare const b: boolean; declare const c: boolean; declare const d: boolean; const value = x || (a && b) || (a && c && d);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if (x || ((a as boolean) && b) || ((a as boolean) && c && d)) {}',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const flags: {a: boolean; b: boolean; c: boolean; d: boolean}; const {a, b, c, d} = flags; const value = x || (a && b) || (a && c && d);'),
		{
			code: 'const element = <div>{x || (a && b) || (a && c && d) ? "yes" : "no"}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'if (x || (object.property && a) || (object.property && b && c)) {}',
		'if (x || (isFoo(node) && a) || (isFoo(node) && b && c)) {}',
		'if (x || (object[`key`] && a) || (object.key && b && c)) {}',
	],
});

test('factoring disjoint pairs settles through repeated fixes', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	};
	const code = 'if (x || (a && b) || (a && c) || y || (d && e) || (d && f)) {}';
	const result = linter.verifyAndFix(code, config);

	t.assert.strictEqual(result.output, 'if (x || (a && (b || c)) || y || (d && (e || f))) {}');
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(linter.verifyAndFix(result.output, config).fixed, false);
});

test('factoring longer chains preserves truthiness and surrounding calls', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	};
	const values = [undefined, false, true, 0, 1, '', 'text'];

	for (const expression of [
		'x || (a && b) || (a && c && d)',
		'x && (a || b) && (a || c || d)',
		'(a && b && c) || (a && d && x)',
		'(a || b || c) && (a || d || x)',
		'before() || (a && b) || (a && c && d) || after()',
	]) {
		const code = `Boolean(${expression});`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);

		for (const common of values) {
			for (const left of values) {
				for (const right of values) {
					const originalCalls = [];
					const fixedCalls = [];
					const getContext = calls => ({
						a: common,
						b: left,
						c: right,
						d: left,
						x: right,
						before() {
							calls.push('before');
							return right;
						},
						after() {
							calls.push('after');
							return left;
						},
					});

					t.assert.strictEqual(runInNewContext(output, getContext(fixedCalls)), runInNewContext(code, getContext(originalCalls)));
					t.assert.deepStrictEqual(fixedCalls, originalCalls);
				}
			}
		}
	}
});

ruleTester({
	valid: [],
	invalid: [
		['(let[0] || (a === true && b === true)) || (a === true && c === true);', '(let[0] || (a === true && (b === true || c === true)));'],
		['(let[0] && (a === true || b === true)) && (a === true || c === true);', '(let[0] && (a === true || (b === true && c === true)));'],
		['((let[0] || x) || (a === true && b === true)) || (a === true && c === true);', '(let[0] || x || (a === true && (b === true || c === true)));'],
		['(let[`key`] === true && false) || (let[`key`] === true && true);', '(let[`key`] === true && (false || true));'],
		['(let[0] === true || false) && (let[0] === true || true || false);', '(let[0] === true || (false && (true || false)));'],
		['for ((let[`key`] === true && false) || (let[`key`] === true && true);;) {break;}', 'for ((let[`key`] === true && (false || true));;) {break;}'],
		['for (; (let[0] && a) || (let[0] && b);) {}', 'for (; let[0] && (a || b);) {}'],
		['const result = () => (let[0] === true && false) || (let[0] === true && true);', 'const result = () => let[0] === true && (false || true);'],
	].map(([code, output]) => ({
		code, output, errors: 1, languageOptions: {sourceType: 'script'},
	})),
});

test('factoring preserves exact values and calls with independent operands', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	};

	for (const expression of [
		'before() || (a === true && b === true) || (a === true && c === true && d === true) || after()',
		'before() && (a === true || b === true) && (a === true || c === true || d === true) && after()',
	]) {
		const code = `${expression};`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);

		for (const [a, b, c, d, prefix, suffix] of [
			[false, false, true, true, undefined, 'fallback'],
			[true, false, true, true, 0, 'fallback'],
			[true, false, true, false, 0, 'fallback'],
			[false, true, false, true, 'prefix', 'fallback'],
			[false, true, false, false, 'prefix', 0],
			[true, false, true, false, true, 'fallback'],
			[true, true, false, false, NaN, undefined],
		]) {
			const originalCalls = [];
			const fixedCalls = [];
			const getContext = calls => ({
				a,
				b,
				c,
				d,
				before() {
					calls.push('before');
					return prefix;
				},
				after() {
					calls.push('after');
					return suffix;
				},
			});

			t.assert.strictEqual(runInNewContext(output, getContext(fixedCalls)), runInNewContext(code, getContext(originalCalls)));
			t.assert.deepStrictEqual(fixedCalls, originalCalls);
		}
	}
});

test('factoring stateful calls in longer chains remains suggestion-only', t => {
	const code = outdent`
		let calls = 0;
		const matches = () => ++calls === 2;
		const result = Boolean(false || (matches() && true) || (matches() && true && true));
		JSON.stringify({result, calls});
	`;
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	});

	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].suggestions.length, 1);
	t.assert.strictEqual(runInNewContext(code), '{"result":true,"calls":2}');

	const {fix} = result.messages[0].suggestions[0];
	const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.strictEqual(runInNewContext(suggested), '{"result":false,"calls":1}');
});

ruleTester.vue({
	valid: [
		'<template><div>{{ x || (a && b) || (a && c && d) }}</div></template>',
		'<template><div :title="x || (a && b) || (a && c && d)" /></template>',
		'<template><div v-if="(a?.enabled && b) || (a?.enabled && c)" /></template>',
		'<template><div v-if=(a&&b)||(a&&c) /></template>',
		'<template><button @click="foo()\n!(!(a === b) && !c)"></button></template>',
		'<template><div v-if="(() => { foo()\n!(!(a === b) && !c) })()" /></template>',
		{
			code: '<template><div :title="!(a && b)" /></template>',
			options: [{negatedConditions: 'expand'}],
		},
	],
	invalid: [
		['<template><div v-if="x || (a && b) || (a && c && d)" /></template>', '<template><div v-if="x || (a && (b || (c && d)))" /></template>'],
		['<template><div v-if="visible" /><div v-else-if="(a && b) || (a && c)" /></template>', '<template><div v-if="visible" /><div v-else-if="a && (b || c)" /></template>'],
		['<template><div v-show="x && (a || b) && (a || c || d)" /></template>', '<template><div v-show="x && (a || (b && (c || d)))" /></template>'],
		['<template><div v-if="x || ((a && b) || (a && c))" /></template>', '<template><div v-if="x || (a && (b || c))" /></template>'],
		['<template><div v-if="!(!a && b)" /></template>', '<template><div v-if="a || !b" /></template>'],
		['<template><div v-if=\'(a && b) || (a && c)\' /></template>', '<template><div v-if=\'a && (b || c)\' /></template>'],
		['<template><div v-if="!(a !== b && c !== d)" /></template>', '<template><div v-if="a === b || c === d" /></template>'],
		['<template><div v-if="(a === &quot;x&quot; &amp;&amp; b) || (a === &quot;x&quot; &amp;&amp; c)" /></template>', '<template><div v-if="a === &quot;x&quot; && (b || c)" /></template>'],
		['<template><div v-show="a || (a && b)" /></template>', '<template><div v-show="a" /></template>'],
		['<template><!-- keep --><div v-if="(a && b) || (a && c)" /></template>', '<template><!-- keep --><div v-if="a && (b || c)" /></template>'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

ruleTester.vue({
	valid: [],
	invalid: [
		'<template><div v-if="(a && b /* keep */) || (a && c)" /></template>',
		'<template><div v-if="(isFoo(value) /* keep */ && a) || (isFoo(value) && b)" /></template>',
		'<template><div v-if="!(!a && b /* keep */)" /></template>',
	].map(code => ({code, errors: [{messageId: 'prefer-simplified-conditions', suggestions: []}]})),
});

ruleTester.vue({
	valid: [],
	invalid: [
		{
			code: '<template><div v-if="x || (isFoo(value) && a) || (isFoo(value) && b && c)" /></template>',
			errors: [{
				messageId: 'prefer-simplified-conditions',
				suggestions: [{
					messageId: 'suggestion',
					output: '<template><div v-if="x || (isFoo(value) && (a || (b && c)))" /></template>',
				}],
			}],
		},
		{
			code: '<template><div v-if="(Array.isArray(value) && a) || (Array.isArray(value) && b)" /></template>',
			errors: [{
				messageId: 'prefer-simplified-conditions',
				suggestions: [{
					messageId: 'suggestion',
					output: '<template><div v-if="Array.isArray(value) && (a || b)" /></template>',
				}],
			}],
		},
		{
			code: '<script>if ((a && b) || (a && c)) {}</script><template><div v-if="x || (d && e) || (d && f)" /></template>',
			output: '<script>if (a && (b || c)) {}</script><template><div v-if="x || (d && (e || f))" /></template>',
			errors: 2,
		},
		{
			code: '<template><div v-if="!(a !== b && c !== d)" /></template><script>if (!(!x && y)) {}</script>',
			output: '<template><div v-if="a === b || c === d" /></template><script>if (x || !y) {}</script>',
			errors: 2,
		},
		{
			code: '<script setup lang="ts">const a: boolean = true;</script><template><div v-if="((a as boolean) && b) || ((a as boolean) && c)" /></template>',
			output: '<script setup lang="ts">const a: boolean = true;</script><template><div v-if="(a as boolean) && (b || c)" /></template>',
			languageOptions: {parserOptions: {parser: typescriptEslintParser}},
			errors: 1,
		},
	],
});

const narrowedBooleanOperands = outdent`
	function check(a: unknown, b: boolean, c: boolean, d: boolean) {
		if (typeof a === 'boolean') {
			return (a && b) || (a && c && d);
		}
	}
`;

ruleTester({
	valid: [
		{
			code: narrowedBooleanOperands,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const flags: {a: boolean; b: boolean; c: boolean | undefined; d: boolean}; const value = (flags.a && flags.b) || (flags.a && flags.c && flags.d);'),
	],
	invalid: [
		{
			...typeAware(narrowedBooleanOperands),
			output: outdent`
				function check(a: unknown, b: boolean, c: boolean, d: boolean) {
					if (typeof a === 'boolean') {
						return a && (b || (c && d));
					}
				}
			`,
			errors: 1,
		},
	],
});
