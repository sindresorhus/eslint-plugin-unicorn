import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const error = {messageId: 'prefer-simple-condition-first'};

test.snapshot({
	valid: [
		// Simple first — already correct
		'if (bar && check(foo));',
		'if (bar && foo.baz);',
		'if (bar && foo.bar.baz === 1);',

		// Both simple — order doesn't matter
		'if (a && b);',
		'if (foo === 1 && bar === 2);',
		'if (a !== "hello" && b);',

		// Neither simple — not flagged in v1
		'if (a.b && c.d);',
		'if (foo() && bar());',
		'if (a.b.c && d.e.f);',

		// Single condition — not a LogicalExpression
		'if (foo);',

		// Negation of identifier — still simple
		'if (!foo && bar);',
		'if (bar && !foo);',
		'if (!a || !b);',

		// Simple on left, complex on right — correct order
		'if (bar || foo());',

		// Negative numeric literal — both sides are simple
		'if (x === -1 && y);',

		// Potentially unsafe to reorder (side effects / throws)
		'if ((state.ready = true) && ok);',
		'if (++counter && ok);',
		'if ((foo + bar) && ready);',
		'if (check(foo) && bar);',
		'if (new Foo() && bar);',
		'while (foo() && bar) {}',
		'for (; foo() && bar; ) {}',
		'(foo() && bar) ? 1 : 0',
		'if (a() && b() && c);',
		'if (object.deep.value && ok);',
		'const x = object.deep.value || ok;',
		'if (tag`x` && ok);',
		'async function f() { if ((await foo) && bar); }',
		'function* f() { if ((yield foo) && bar); }',
		'if (import("foo") && bar);',

		// Nested side effects
		'if ((a + (b = c)) && ok);',
		'if (-(++x) && ok);',

		// Deep member chain in comparison
		'if (foo.bar.baz === 1 && bar === 2);',
		'const x = a.b.c && d',

		// Nullish coalescing — not handled by rule
		'const x = foo.bar ?? baz',

		// Shallow member access can throw if object is nullish
		'if (a.b && c);',
		'if (a?.b && c);',
		'if (a[b] && c);',

		// `in` and `instanceof` throw if right operand is not object/constructor
		'if (foo in bar && baz);',
		'if (foo instanceof bar && baz);',

		// Value-producing contexts — reordering changes the result, not just evaluation order
		'const x = foo() || bar',
		'const x = a.b && c',

		// Member + call on left — member access can throw
		'if (foo.bar() && baz === 1);',

		// Member expression in various positions — all can throw
		'if ((a.b || c) && d);',
		'if ((a.b) && c);',
		'if (a.b && !c);',
		'if (a.b && x === -1);',
	],
	invalid: [
		// Pure non-simple expression on the left — auto-fix
		'if ((foo ? bar : baz) && ready);',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'if ((foo ? bar : baz) /* keep */ && ready);',
			errors: [error],
		},
	],
});
