import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

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

		// Simple on left, complex on right — correct order
		'if (bar || foo());',
	],
	invalid: [
		// Call on left, identifier on right — suggestion (has call)
		'if (check(foo) && bar);',

		// Member expression on left, identifier on right — auto-fix (no calls)
		'if (a.b && c);',

		// Complex comparison on left, simple comparison on right — auto-fix
		'if (foo.bar.baz === 1 && bar === 2);',

		// Call on left, identifier on right with || — suggestion
		'const x = foo() || bar',

		// new expression on left — suggestion
		'if (new Foo() && bar);',

		// Member + call on left, simple comparison on right — suggestion
		'if (foo.bar() && baz === 1);',

		// Chained: complex && complex && simple — outermost flagged
		'if (a() && b() && c);',

		// Assignment context — no calls, auto-fix
		'const x = a.b.c && d',
	],
});
