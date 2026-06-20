import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// No shared statements
		'if (a) { foo(); } else { bar(); }',
		'if (a) { foo(); baz(); } else { bar(); qux(); }',
		// No `else` — incomplete chain
		'if (a) { foo(); cleanup(); }',
		'if (a) { foo(); } else if (b) { foo(); }',
		// Empty branches
		'if (a) {} else {}',
		'if (a) { foo(); } else {}',
		// Asymmetric — shared statement is not aligned at an edge
		'if (a) { foo(); bar(); } else { foo(); }',
		'if (a) { foo(); } else { foo(); bar(); }',
		// Whole branches identical (handled by `no-duplicate-if-branches`, not this rule)
		'if (a) { foo(); } else { foo(); }',
		'if (a) { foo(); bar(); } else { foo(); bar(); }',
		// Hoisting would empty a branch — not reported
		'if (a) { foo(); cleanup(); } else { cleanup(); }',
		'if (a) { setup(); foo(); } else { setup(); foo(); bar(); }',
		// Same statement in the middle only
		'if (a) { x(); shared(); y(); } else { p(); shared(); q(); }',
		// Different statements (different tokens)
		'if (a) { foo(1); rest(); } else { foo(2); rest2(); }',
		// Non-block branches are not handled
		'if (a) foo(); else foo();',
		'if (a) { foo(); shared(); } else shared();',
		'if (a) foo(); else { foo(); bar(); }',
		// `else if` chain without a final `else`
		'if (a) { foo(); cleanup(); } else if (b) { bar(); cleanup(); } else if (c) { baz(); cleanup(); }',
	],
	invalid: [
		// Shared trailing statement (autofix)
		'if (a) { foo(); cleanup(); } else { bar(); cleanup(); }',
		// Shared trailing inside supported non-block statement lists
		outdent`
			class C {
				static {
					if (a) {
						foo();
						cleanup();
					} else {
						bar();
						cleanup();
					}
				}
			}
		`,
		outdent`
			switch (value) {
				case 1:
					if (a) {
						foo();
						cleanup();
					} else {
						bar();
						cleanup();
					}
			}
		`,
		// Shared leading inside supported non-block statement lists
		outdent`
			class C {
				static {
					if (a) {
						x;
						foo();
					} else {
						x;
						bar();
					}
				}
			}
		`,
		outdent`
			switch (value) {
				case 1:
					if (a) {
						x;
						foo();
					} else {
						x;
						bar();
					}
			}
		`,
		// Shared trailing across 3 branches
		'if (a) { foo(); cleanup(); } else if (b) { bar(); cleanup(); } else { baz(); cleanup(); }',
		// Multiple shared trailing statements
		'if (a) { foo(); save(); flush(); } else { bar(); save(); flush(); }',
		// Shared trailing `return`
		'function f() { if (a) { foo(); return result; } else { bar(); return result; } }',
		// Shared leading statement with side effects (suggestion only)
		'if (a) { log("start"); foo(); } else { log("start"); bar(); }',
		// Clippy false-positive shape: leading mutation read by later conditions → suggestion only
		'if (counter === 0) { counter += 1; first(); } else if (counter === 1) { counter += 1; second(); } else { counter += 1; other(); }',
		// Shared leading statement before an impure condition → suggestion only
		'if (initialize()) { ready; foo(); } else { ready; bar(); }',
		// Shared leading statement before a tagged-template condition → suggestion only
		'if (initialize`x`) { ready; foo(); } else { ready; bar(); }',
		// Shared leading statement before an impure `else if` condition → suggestion only
		'if (ready) { value; foo(); } else if (initialize()) { value; bar(); } else { value; baz(); }',
		// Shared leading tagged-template statement → suggestion only
		'if (ready) { initialize`x`; foo(); } else { initialize`x`; bar(); }',
		// Shared leading side-effect-free statement (autofix)
		'if (a) { x; foo(); } else { x; bar(); }',
		// Leading semicolon differences do not stop matching otherwise identical statements
		'if (a) { x\nfoo(); } else { x; bar(); }',
		// Multiple shared leading side-effect-free statements (autofix)
		'if (a) { x; y; foo(); } else { x; y; bar(); }',
		// ASI: hoisted leading statement must not merge with the previous statement
		'foo\nif (a) { [x]; bar(); } else { [x]; baz(); }',
		// Shared leading abrupt completions → suggestion only
		'function f() { if (missing) { return x; foo(); } else { return x; bar(); } }',
		'while (condition) { if (a) { break; foo(); } else { break; bar(); } }',
		'while (condition) { if (a) { continue; foo(); } else { continue; bar(); } }',
		// Shared leading statement with nested abrupt completion → suggestion only
		'function f() { if (missing) { if (ready) { return x; } foo(); } else { if (ready) { return x; } bar(); } }',
		// Both leading and trailing shared (two separate reports)
		'if (a) { setup(); foo(); teardown(); } else { setup(); bar(); teardown(); }',
		// Both leading and trailing side-effect-free → both autofix in a single pass
		'if (a) { x; foo(); y; } else { x; bar(); y; }',
		// `if` is the unbraced body of a parent statement → report-only (fix would move code outside the parent)
		'while (condition) if (a) { foo(); cleanup(); } else { bar(); cleanup(); }',
		// Leading shared code in an unbraced parent statement → report-only (fix would become the only parent body)
		'while (condition) if (a) { x; foo(); } else { x; bar(); }',
		// Leading shared code after a comment before the `if` → report-only (fix would detach the comment)
		'/* istanbul ignore next */ if (a) { x; foo(); } else { x; bar(); }',
		// Leading shared code after a comment between statements → report-only (fix would detach the comment)
		'previous(); /* istanbul ignore next */ if (a) { x; foo(); } else { x; bar(); }',
		// Trailing statement references a branch-local declaration → report-only (no fix)
		'if (a) { const x = 1; use(x); } else { const x = 2; use(x); }',
		'if (a) { const {x} = objectA; useA(); cleanup(x); } else { const {x} = objectB; useB(); cleanup(x); }',
		'if (a) { useA(); function helper() {} doA(); helper(); } else { useB(); function helper() {} doB(); helper(); }',
		// Leading shared declaration → report-only (no fix)
		'if (a) { const x = 1; foo(); } else { const x = 1; bar(); }',
		// Trailing shared declaration → report-only (would leak scope)
		'if (a) { foo(); const x = compute(); } else { bar(); const x = compute(); }',
		// Trailing shared code after a `using` declaration → report-only (would move it past disposal)
		'if (a) { using resource = a(); work(); cleanup(); } else { using resource = b(); work(); cleanup(); }',
		'async function f() { if (a) { await using resource = a(); work(); cleanup(); } else { await using resource = b(); work(); cleanup(); } }',
		// Leading comment before a shared statement → report-only (fix would detach the comment)
		'if (a) { /* istanbul ignore next */ x; foo(); } else { /* istanbul ignore next */ x; bar(); }',
		'if (a) { x; foo(); } else { /* istanbul ignore next */ x; bar(); }',
		'if (a) { x; foo(); } else if (b) { /* istanbul ignore next */ x; bar(); } else { x; baz(); }',
		// Comment after a shared leading statement → report-only (fix would detach the comment)
		'if (a) { x; /* keep */ foo(); } else { x; bar(); }',
		// Comment between shared leading statements → report-only (fix would detach the comment)
		'if (a) { x; /* keep */ y; foo(); } else { x; y; bar(); }',
		// Comment inside the shared leading statement → report-only (fix would detach the comment)
		'if (a) { x /* keep */; foo(); } else { x; bar(); }',
		// Comment inside a non-first branch's shared region → no fix (comment would be dropped)
		'if (a) { foo(); cleanup(); } else { bar(); /* keep */ cleanup(); }',
		// Trailing comment after a shared statement → report-only (fix would detach the comment)
		'if (a) { foo(); cleanup(); /* keep */ } else { bar(); cleanup(); /* keep */ }',
		outdent`
			if (a) {
				foo();
				cleanup(); // keep
			} else {
				bar();
				cleanup();
			}
		`,
		outdent`
			if (a) {
				foo();
				cleanup();
			} else {
				bar();
				cleanup(); // keep
			}
		`,
		// Trailing comment after a multi-statement shared tail → report-only (fix would detach the comment)
		'if (a) { foo(); save(); cleanup(); /* keep */ } else { bar(); save(); cleanup(); }',
		// Comment between shared tail statements → report-only (fix would detach the comment)
		'if (a) { foo(); save(); /* keep */ cleanup(); } else { bar(); save(); cleanup(); }',
		'if (a) { foo(); save(); cleanup(); } else if (b) { bar(); save(); cleanup(); /* keep */ } else { baz(); save(); cleanup(); }',
		// Trailing shared code before a same-line comment after the `if` → report-only (fix would attach the comment to the hoisted statement)
		'if (a) { foo(); cleanup(); } else { bar(); cleanup(); } /* istanbul ignore next */ next();',
		outdent`
			if (a) {
				foo();
				cleanup();
			} else {
				bar();
				cleanup();
			} // istanbul ignore next
			next();
		`,
		// A following-line comment after the `if` stays attached to the next statement, so the fix is still safe.
		outdent`
			if (a) {
				foo();
				cleanup();
			} else {
				bar();
				cleanup();
			}
			/* istanbul ignore next */
			next();
		`,
		// Trailing branch-local not referenced by the tail → autofix is still safe
		'if (a) { const x = 1; useA(x); cleanup(); } else { const y = 2; useB(y); cleanup(); }',
		// Trailing statement closes over a branch-local declaration → report-only (would lose scope)
		'if (a) { const x = 1; useA(); cleanup(() => x); } else { const x = 2; useB(); cleanup(() => x); }',
		// One shared at each edge with distinct middle, three branches
		'if (a) { start(); a1(); end(); } else if (b) { start(); b1(); end(); } else { start(); c1(); end(); }',
		// TypeScript: shared trailing with type assertion
		{
			code: 'function f() { if (a) { foo(); return x as Bar; } else { bar(); return x as Bar; } }',
			languageOptions: {parser: parsers.typescript},
		},
		// TypeScript: shared leading with non-null assertion
		{
			code: 'if (a) { value!; foo(); } else { value!; bar(); }',
			languageOptions: {parser: parsers.typescript},
		},
		// TypeScript: shared leading with `satisfies`
		{
			code: 'if (a) { value satisfies Foo; foo(); } else { value satisfies Foo; bar(); }',
			languageOptions: {parser: parsers.typescript},
		},
		// Multiline trailing — verify re-indentation
		outdent`
			if (a) {
				foo();
				cleanup();
			} else {
				bar();
				cleanup();
			}
		`,
		// Multiline leading side-effect-free — autofix with re-indentation
		outdent`
			if (a) {
				x;
				foo();
			} else {
				x;
				bar();
			}
		`,
		// Multiline nested inside a function — verify deeper indentation
		outdent`
			function run() {
				if (a) {
					doA();
					flush();
				} else {
					doB();
					flush();
				}
			}
		`,
		// Shared statement that itself spans multiple lines — verify continuation lines are re-indented
		outdent`
			if (a) {
				foo();
				cleanup(
					first,
					second,
				);
			} else {
				bar();
				cleanup(
					first,
					second,
				);
			}
		`,
		// Comment inside the first branch's shared region → no fix (comment would be dropped)
		'if (a) { foo(); /* note */ cleanup(); } else { bar(); cleanup(); }',
		// Comment inside the shared trailing statement → report-only (fix would detach the comment)
		'if (a) { foo(); cleanup(/* keep */); } else { bar(); cleanup(); }',
		// Comment in the retained middle (not in the removed range) → fix still applies
		'if (a) { /* note */ foo(); cleanup(); } else { /* other */ bar(); cleanup(); }',
		// ASI: hoisted trailing statement must not merge with the following statement
		'if (a) { doA(); foo } else { doB(); foo }\n(bar())',
		// Semicolon differences do not stop matching otherwise identical statements
		'if (a) { foo(); cleanup() } else { bar(); cleanup(); }',
		// `var` is function-scoped, so a trailing hoist past it is still safe to fix
		'if (a) { var x = 1; useA(x); cleanup(); } else { var y = 2; useB(y); cleanup(); }',
		// Token comparison: computed member and `this` in the shared statement
		'if (a) { doA(); obj[key](); } else { doB(); obj[key](); }',
		'if (a) { doA(); this.cleanup(); } else { doB(); this.cleanup(); }',
		// Shared leading statement that is itself an `if` (suggestion, has side effects)
		'if (a) { if (x) { foo(); } doA(); } else { if (x) { foo(); } doB(); }',
		// Shared leading tagged template (suggestion — a tag call may have side effects and must not be reordered before the condition)
		'if (a) { tag`x`; doA(); } else { tag`x`; doB(); }',
		// Shared trailing statement that is itself an `if` (autofix — trailing code is always safe to hoist)
		'if (a) { doA(); if (x) { bar(); } } else { doB(); if (x) { bar(); } }',
		// Shared leading `throw` (suggestion only — the condition might have side effects)
		'function f() { if (a) { throw new Error("x"); doA(); } else { throw new Error("x"); doB(); } }',
	],
});
