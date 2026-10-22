import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [
		'if (typeof missing !== `undefined` && missing) {}',
		'if (`undef\\u0069ned` !== typeof missing && missing) {}',
	],
	invalid: [
		{
			code: 'if (check() && value === `ready`) {}',
			errors: 1,
		},
	],
});
const error = {messageId: 'prefer-simple-condition-first'};
const unsafeError = {messageId: 'prefer-simple-condition-first/unsafe'};

test({
	valid: [],
	invalid: [
		['if ((a /* keep */ ? b : c) && ready) {}', 'if (ready && (a /* keep */ ? b : c)) {}'],
	].map(([code, output]) => ({code, output, errors: [error]})),
});

test({
	valid: [],
	invalid: [
		...[
			['if ((a ? b : c) && (ready // keep\r\n)) {}', 'if ((ready // keep\r\n) && (a ? b : c)) {}'],
			['if ((a ? b : c) || (/* keep */ ready)) {}', 'if ((/* keep */ ready) || (a ? b : c)) {}'],
		].map(([code, output]) => ({code, output, errors: [error]})),
		{
			code: 'if ((a ? b : c) && (ready as /* keep */ boolean)) {}',
			output: 'if ((ready as /* keep */ boolean) && (a ? b : c)) {}',
			languageOptions: {parser: parsers.typescript},
			errors: [error],
		},
		{
			code: 'if (((a ? b : c) && ready /* discard */) && enabled) {}',
			errors: [error],
		},
		{
			code: 'if (check(/* keep */) && ready) {}',
			errors: [unsafeError],
		},
		...[
			'if (/* keep */ (a ? b : c) && ready) {}',
			'if ((a ? b : c) && ready /* keep */) {}',
		].map(code => ({code, errors: [error]})),
	],
});

nodeTest('comment-preserving condition reordering retains boolean-context results', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-simple-condition-first': rule}}},
		rules: {'unicorn/prefer-simple-condition-first': 'error'},
	};
	for (const operator of ['&&', '||']) {
		const code = `let result = false; if ((flag /* keep */ ? first : second) ${operator} ready) { result = true; } result;`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output.split('/* keep */').length, 2);
		for (const flag of [false, true]) {
			for (const ready of [0, 1]) {
				for (const [first, second] of [[undefined, 'value'], [1, '']]) {
					const globals = {
						flag, first, second, ready,
					};
					t.assert.strictEqual(runInNewContext(output, {...globals}), runInNewContext(code, {...globals}));
				}
			}
		}
	}
});

test({
	valid: [
		// Simple conditions already come first
		'if (ready && check());',
		'if (ready || object.value);',
		'if (ready && (foo ? bar : baz));',
		'if (a && b && check());',

		// Conditions in the same category keep their relative order
		'if (a && b);',
		'if (foo === 1 && bar !== 2);',
		'if (!!ready && enabled);',
		'if (1 === value && ready);',
		'if (typeof value === "string" && ready);',
		'if (expectedType !== typeof value && ready);',
		'if (typeof first === typeof second && ready);',
		'if (!(typeof value === "string") && ready);',
		'if (index === -1n && ready);',
		'if (-1n === index && ready);',
		'if (value == null && ready);',
		'if (value != null && ready);',
		'if (null == value && ready);',
		'if (null != value && ready);',
		'if (!(value == null) && ready);',
		'if (first() && second());',

		// A guarded identifier does not trigger a report
		'if (typeof FLAG !== "undefined" && check() && FLAG);',
		'if ("undefined" !== typeof FLAG && check() && FLAG);',
		'if (typeof FLAG !== "undefined" && FLAG && ready);',

		// A single condition has no ordering to enforce
		'if (ready);',

		// Value-producing logical expressions are ignored
		'const value = check() || fallback;',
		'const value = object.value && fallback;',
		'returnValue((foo ? bar : baz) && ready);',
		'const value = ((foo ? bar : baz) && ready) || fallback;',
		'function run(Boolean) { Boolean((foo ? bar : baz) && ready); }',

		// Nullish coalescing is outside the rule
		'const value = object.value ?? fallback;',
		'if ((((foo ? 0 : 1) && ready) ?? fallback));',
	],
	invalid: [
		// Stable partition of the complete homogeneous chain
		{
			code: 'if ((foo ? bar : baz) && a && b);',
			output: 'if (a && b && (foo ? bar : baz));',
			errors: [{...error, column: 26, endColumn: 27}],
		},
		{
			code: 'if ((foo ? bar : baz) && (a && b));',
			output: 'if (a && b && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((first ? second : third) && a && (fourth ? fifth : sixth) && b);',
			output: 'if (a && b && (first ? second : third) && (fourth ? fifth : sixth));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) || a || b);',
			output: 'if (a || b || (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && !ready && count === -1);',
			output: 'if (!ready && (count === -1) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && !!ready && count !== +1);',
			output: 'if (!!ready && (count !== +1) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && typeof value === "string");',
			output: 'if ((typeof value === "string") && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && index === -1n);',
			output: 'if ((index === -1n) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && value == null);',
			output: 'if ((value == null) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && null != value);',
			output: 'if ((null != value) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) || value == null);',
			output: 'if ((value == null) || (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && !(value == null));',
			output: 'if (!(value == null) && (foo ? bar : baz));',
			errors: [error],
		},

		// Boolean contexts other than `if`
		{
			code: 'while ((foo ? bar : baz) && ready) {}',
			output: 'while (ready && (foo ? bar : baz)) {}',
			errors: [error],
		},
		{
			code: 'for (; (foo ? bar : baz) && ready;) {}',
			output: 'for (; ready && (foo ? bar : baz);) {}',
			errors: [error],
		},
		{
			code: 'do {} while ((foo ? bar : baz) && ready);',
			output: 'do {} while (ready && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: '((foo ? bar : baz) && ready) ? first : second;',
			output: '(ready && (foo ? bar : baz)) ? first : second;',
			errors: [error],
		},
		{
			code: 'Boolean((foo ? bar : baz) && ready);',
			output: 'Boolean(ready && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: '!((foo ? bar : baz) && ready);',
			output: '!(ready && (foo ? bar : baz));',
			errors: [error],
		},

		// Mixed operators form separate homogeneous chains
		{
			code: 'if (((foo ? bar : baz) && a) || ((one ? two : three) && b));',
			output: 'if ((a && (foo ? bar : baz)) || (b && (one ? two : three)));',
			errors: [error, error],
		},
		{
			code: 'if (((foo ? bar : baz) && ready) || enabled);',
			output: 'if ((ready && (foo ? bar : baz)) || enabled);',
			errors: [error, unsafeError],
		},

		// Parentheses around operands are preserved when useful
		{
			code: 'if ((((foo ? bar : baz))) && ready);',
			output: 'if (ready && (((foo ? bar : baz))));',
			errors: [error],
		},
		{
			code: 'if ((foo ? true : false) && ready);',
			output: 'if (ready && (foo ? true : false));',
			errors: [error],
		},
		{
			code: 'if ((foo ? 1 : -1) && ready);',
			output: 'if (ready && (foo ? 1 : -1));',
			errors: [error],
		},
		{
			code: 'if ((foo ? (bar ? baz : qux) : quux) && ready);',
			output: 'if (ready && (foo ? (bar ? baz : qux) : quux));',
			errors: [error],
		},
		{
			code: 'if ((flag ? value === 1 : fallback) && ready);',
			output: 'if (ready && (flag ? value === 1 : fallback));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && ready && check());',
			output: 'if (ready && (foo ? bar : baz) && check());',
			errors: [error],
		},
		{
			code: 'if (typeof FLAG !== "undefined" && (foo ? bar : baz) && FLAG && ready);',
			output: 'if ((typeof FLAG !== "undefined") && FLAG && ready && (foo ? bar : baz));',
			errors: [error],
		},

		// Comments in discarded syntax or adjacent to the chain block fixes; comments inside copied operands are preserved
		{
			code: 'if ((foo ? bar : baz) /* keep */ && ready);',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && /* keep */ ready);',
			errors: [error],
		},
		{
			code: 'if ((foo ? /* keep */ bar : baz) && ready);',
			output: 'if (ready && (foo ? /* keep */ bar : baz));',
			errors: [error],
		},
		{
			code: 'if (/* describes complex */ (foo ? bar : baz) && ready);',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && ready /* describes ready */);',
			errors: [error],
		},

		// Observable or potentially throwing expressions are reported without a fix
		{code: 'if (check() && ready);', errors: [unsafeError]},
		{code: 'if (check() || ready);', errors: [unsafeError]},
		{code: 'if (check() && a && b);', errors: [unsafeError]},
		{code: 'if (typeof FLAG !== "undefined" && check() && OTHER);', errors: [unsafeError]},
		{code: 'if (typeof FLAG === "undefined" && check() && FLAG);', errors: [unsafeError]},
		{code: 'if (check() && typeof FLAG !== "undefined" && FLAG);', errors: [{...unsafeError, column: 16, endColumn: 43}]},
		{code: 'if (check() && FLAG && typeof FLAG !== "undefined");', errors: [unsafeError]},
		{code: 'if (typeof FLAG !== "undefined" || check() || FLAG);', errors: [unsafeError]},
		{code: 'if (typeof FLAG !== "undefined" && check() && FLAG && ready);', errors: [{...unsafeError, column: 55, endColumn: 60}]},
		{code: 'if ((first ? second : third) && check() && ready);', errors: [unsafeError]},
		{code: 'if (check() && value == null);', errors: [unsafeError]},
		{code: 'if (check() || null != value);', errors: [unsafeError]},
		{code: 'if (new Example() && ready);', errors: [unsafeError]},
		{code: 'if ((state.ready = true) && ready);', errors: [unsafeError]},
		{code: 'if (++counter && ready);', errors: [unsafeError]},
		{code: 'if (object.value && ready);', errors: [unsafeError]},
		{code: 'if (object?.value && ready);', errors: [unsafeError]},
		{code: 'if (object[property] && ready);', errors: [unsafeError]},
		{code: 'if (true && ready);', errors: [unsafeError]},
		{code: 'if (-1 && ready);', errors: [unsafeError]},
		{code: 'if (index === +1n && ready);', errors: [unsafeError]},
		{code: 'if (value == 1 && ready);', errors: [unsafeError]},
		{code: 'if (value != 1 && ready);', errors: [unsafeError]},
		{code: 'if (value == undefined && ready);', errors: [unsafeError]},
		{code: 'if (value != undefined && ready);', errors: [unsafeError]},
		{code: 'if (typeof value == null && ready);', errors: [unsafeError]},
		{code: 'if (typeof value != null && ready);', errors: [unsafeError]},
		{code: 'if (object.value == null && ready);', errors: [unsafeError]},
		{code: 'if (getValue() != null && ready);', errors: [unsafeError]},
		{code: 'if (typeof object.value === "string" && ready);', errors: [unsafeError]},
		{code: 'if ((foo + bar) && ready);', errors: [unsafeError]},
		{code: 'if ((key in object) && ready);', errors: [unsafeError]},
		{code: 'if ((value instanceof Example) && ready);', errors: [unsafeError]},
		{code: 'if (((key in object) ? first : second) && ready);', errors: [unsafeError]},
		{code: 'if (((value instanceof Example) ? first : second) && ready);', errors: [unsafeError]},
		{code: 'if (tag`value` && ready);', errors: [unsafeError]},
		{code: 'if (import("module") && ready);', errors: [unsafeError]},
		{code: 'async function run() { if ((await check()) && ready); }', errors: [unsafeError]},
		{code: 'function* run() { if ((yield value) && ready); }', errors: [unsafeError]},
		// Only a `typeof … !== "undefined"` check guards a later operand
		{code: 'if (first !== second && check() && ready);', errors: [unsafeError]},
		{code: 'if (typeof FLAG !== "string" && check() && FLAG);', errors: [unsafeError]},
	],
});

test.typescript({
	valid: [
		'declare const FLAG: boolean | undefined; if (typeof FLAG !== "undefined" && check() && FLAG);',
		'declare const FLAG: boolean | undefined; if (typeof (FLAG as boolean) !== "undefined" && check() && (FLAG as boolean));',
		'if ((ready as boolean) && enabled!);',
		'if (((value as string) === "value") && ready);',
		'if ((value! === "value") && ready);',
		'if (((value satisfies string) === "value") && ready);',
		'if ((<string>value === "value") && ready);',
	],
	invalid: [
		{
			code: 'if ((foo ? bar : baz) && ((value as string) === "value"));',
			output: 'if (((value as string) === "value") && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && index === -(1 as number));',
			output: 'if ((index === -(1 as number)) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && index === -(<number>1));',
			output: 'if ((index === -(<number>1)) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && index === -(1n as bigint));',
			output: 'if ((index === -(1n as bigint)) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && typeof (value as string) === "string");',
			output: 'if ((typeof (value as string) === "string") && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && (ready as boolean));',
			output: 'if ((ready as boolean) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && (value as string) != null);',
			output: 'if (((value as string) != null) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && (value as string) == null);',
			output: 'if (((value as string) == null) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && null != (value as string));',
			output: 'if ((null != (value as string)) && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((((foo ? bar : baz) && ready) satisfies boolean));',
			output: 'if (((ready && (foo ? bar : baz)) satisfies boolean));',
			errors: [error],
		},
		{
			code: 'if ((((foo ? bar : baz) && ready) as boolean) && enabled);',
			errors: [error],
		},
	],
});
