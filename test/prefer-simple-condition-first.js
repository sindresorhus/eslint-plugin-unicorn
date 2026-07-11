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
		'if (!!ready && enabled);',
		'if (1 === value && ready);',
		'if (typeof value === "string" && ready);',
		'if (expectedType !== typeof value && ready);',
		'if (typeof first === typeof second && ready);',
		'if (index === -1n && ready);',
		'if (first() && second());',

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
			code: 'if ((foo ? bar : baz) && typeof value === "string");',
			output: 'if ((typeof value === "string") && (foo ? bar : baz));',
			errors: [error],
		},
		{
			code: 'if ((foo ? bar : baz) && index === -1n);',
			output: 'if ((index === -1n) && (foo ? bar : baz));',
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
			code: 'if ((foo ? bar : baz) && ready && check());',
			output: 'if (ready && (foo ? bar : baz) && check());',
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
		{code: 'if (check() && a && b);', errors: [unsafeError]},
		{code: 'if ((first ? second : third) && check() && ready);', errors: [unsafeError]},
		{code: 'if (new Example() && ready);', errors: [unsafeError]},
		{code: 'if ((state.ready = true) && ready);', errors: [unsafeError]},
		{code: 'if (++counter && ready);', errors: [unsafeError]},
		{code: 'if (object.value && ready);', errors: [unsafeError]},
		{code: 'if (object?.value && ready);', errors: [unsafeError]},
		{code: 'if (object[property] && ready);', errors: [unsafeError]},
		{code: 'if (true && ready);', errors: [unsafeError]},
		{code: 'if (-1 && ready);', errors: [unsafeError]},
		{code: 'if (index === +1n && ready);', errors: [unsafeError]},
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
	],
});

test.typescript({
	valid: [
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
