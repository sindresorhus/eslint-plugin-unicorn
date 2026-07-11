import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const error = {messageId: 'prefer-simple-condition-first'};
const unsafeError = {messageId: 'prefer-simple-condition-first/unsafe'};

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
		'if (first() && second());',

		// A single condition has no ordering to enforce
		'if (ready);',

		// Value-producing logical expressions are ignored
		'const value = check() || fallback;',
		'const value = object.value && fallback;',
		'returnValue((foo ? bar : baz) && ready);',

		// Nullish coalescing is outside the rule
		'const value = object.value ?? fallback;',
	],
	invalid: [
		// Stable partition of the complete homogeneous chain
		{
			code: 'if ((foo ? bar : baz) && a && b);',
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
			code: '((foo ? bar : baz) && ready) ? first : second;',
			output: '(ready && (foo ? bar : baz)) ? first : second;',
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

		// Parentheses around operands are preserved when useful
		{
			code: 'if ((((foo ? bar : baz))) && ready);',
			output: 'if (ready && (((foo ? bar : baz))));',
			errors: [error],
		},

		// Comments make the chain unfixable, but do not suppress the report
		{
			code: 'if ((foo ? bar : baz) /* keep */ && ready);',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && /* keep */ ready);',
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
		{code: 'if (new Example() && ready);', errors: [unsafeError]},
		{code: 'if ((state.ready = true) && ready);', errors: [unsafeError]},
		{code: 'if (++counter && ready);', errors: [unsafeError]},
		{code: 'if (object.value && ready);', errors: [unsafeError]},
		{code: 'if (object?.value && ready);', errors: [unsafeError]},
		{code: 'if (object[property] && ready);', errors: [unsafeError]},
		{code: 'if ((foo + bar) && ready);', errors: [unsafeError]},
		{code: 'if ((key in object) && ready);', errors: [unsafeError]},
		{code: 'if ((value instanceof Example) && ready);', errors: [unsafeError]},
		{code: 'if (((key in object) ? first : second) && ready);', errors: [unsafeError]},
		{code: 'if (((value instanceof Example) ? first : second) && ready);', errors: [unsafeError]},
		{code: 'if (tag`value` && ready);', errors: [unsafeError]},
		{code: 'if (import("module") && ready);', errors: [unsafeError]},
		{code: 'async function run() { if ((await check()) && ready); }', errors: [unsafeError]},
		{code: 'function* run() { if ((yield value) && ready); }', errors: [unsafeError]},
	],
});

test.typescript({
	valid: [
		'if ((ready as boolean) && enabled!);',
	],
	invalid: [
		{
			code: 'if ((foo ? bar : baz) && (ready as boolean));',
			output: 'if ((ready as boolean) && (foo ? bar : baz));',
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
