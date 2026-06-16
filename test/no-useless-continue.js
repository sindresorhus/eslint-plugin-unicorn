import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// `continue` skips real work that follows
		outdent`
			for (const x of xs) {
				if (skip(x)) {
					continue;
				}

				process(x);
			}
		`,
		// The enclosing `if` is not the last statement in the loop body
		outdent`
			for (const x of xs) {
				if (a) {
					continue;
				}

				doMore();
			}
		`,
		// Something runs after the `if`, even with an `else`
		outdent`
			for (const x of xs) {
				if (a) {
					continue;
				} else {
					doMore();
				}

				use(x);
			}
		`,
		// Bare-body loops are a deliberate spin-loop idiom
		'while (cond) continue;',
		'for (;;) continue;',
		'for (const x of xs) continue;',
		// Labeled `continue` may target an outer loop
		outdent`
			outer: for (const x of xs) {
				for (const y of ys) {
					continue outer;
				}
			}
		`,
		// Labeled `continue` targeting its own loop is intentionally ignored
		outdent`
			loop: for (const x of xs) {
				doX();
				continue loop;
			}
		`,
		// `continue` inside a switch breaks out of the switch
		outdent`
			for (const x of xs) {
				switch (x) {
					case 1:
						continue;
				}
			}
		`,
		// `continue` inside try/catch/finally is left alone
		outdent`
			for (const x of xs) {
				try {
					continue;
				} finally {
					cleanup();
				}
			}
		`,
		outdent`
			for (const x of xs) {
				try {
					doX();
					continue;
				} catch {}
			}
		`,
		// `continue` in a `catch` block is left alone
		outdent`
			for (const x of xs) {
				try {
					doX();
				} catch {
					continue;
				}
			}
		`,
		// `continue` in a `finally` block is left alone
		outdent`
			for (const x of xs) {
				try {
					doX();
				} finally {
					continue;
				}
			}
		`,
		// Inner-loop `continue` that is meaningful for the inner loop
		outdent`
			for (const x of xs) {
				for (const y of ys) {
					if (skip(y)) {
						continue;
					}

					process(y);
				}
			}
		`,
		// Not the last statement
		outdent`
			for (const x of xs) {
				continue;
				doX();
			}
		`,
		// A trailing function declaration keeps `continue` from being last (hoisting aside)
		outdent`
			for (const x of xs) {
				continue;
				function f() {}
			}
		`,
		// A trailing empty statement keeps the enclosing `if` from being last
		outdent`
			for (const x of xs) {
				if (a) {
					continue;
				}
				;
			}
		`,
		// A bare nested block that is not last in the loop body
		outdent`
			for (const x of xs) {
				{
					continue;
				}

				doMore();
			}
		`,
		// A labeled block is not a loop, so its trailing `continue` is left alone
		outdent`
			for (const x of xs) {
				block: {
					continue;
				}
			}
		`,
		// `continue` is not last because another statement follows the enclosing `if`
		outdent`
			for (const x of xs) {
				if (a) {
					if (b) {
						continue;
					}
				}

				doMore();
			}
		`,
	],
	invalid: [
		outdent`
			for (const x of xs) {
				process(x);
				continue;
			}
		`,
		// Only statement in the loop body
		outdent`
			for (const x of xs) {
				continue;
			}
		`,
		outdent`
			while (cond) {
				doX();
				continue;
			}
		`,
		outdent`
			do {
				doX();
				continue;
			} while (cond);
		`,
		outdent`
			for (const x in object) {
				doX();
				continue;
			}
		`,
		// Classic three-part `for` loop
		outdent`
			for (let i = 0; i < n; i++) {
				doX();
				continue;
			}
		`,
		// Loop body is an `if` directly, without a surrounding block
		'for (const x of xs) if (a) { continue; }',
		// `continue` is last inside an `if` that is last in the loop body
		outdent`
			for (const x of xs) {
				if (a) {
					continue;
				}
			}
		`,
		// Nested `if`, last at every level
		outdent`
			for (const x of xs) {
				if (a) {
					if (b) {
						continue;
					}
				}
			}
		`,
		// `else` present but the `if` is last → still useless
		outdent`
			for (const x of xs) {
				if (a) {
					doX();
					continue;
				} else {
					doY();
				}
			}
		`,
		// `continue` in the `else` branch, which is last in the loop body
		outdent`
			for (const x of xs) {
				if (a) {
					doX();
				} else {
					doY();
					continue;
				}
			}
		`,
		// `continue` in an `else if` chain (alternate is itself an \`if\`)
		outdent`
			for (const x of xs) {
				if (a) {
					doX();
				} else if (b) {
					doY();
					continue;
				}
			}
		`,
		// \`for await … of\` is a \`ForOfStatement\`
		outdent`
			async function run() {
				for await (const x of xs) {
					process(x);
					continue;
				}
			}
		`,
		// Bare nested block, last in the loop body
		outdent`
			for (const x of xs) {
				{
					continue;
				}
			}
		`,
		// Inner-loop `continue` that is useless
		outdent`
			for (const x of xs) {
				for (const y of ys) {
					process(y);
					continue;
				}
			}
		`,
		// Multiple useless `continue` statements, both reported and fixed in one pass
		outdent`
			for (const x of xs) {
				for (const y of ys) {
					continue;
				}

				continue;
			}
		`,
		// Unlabeled `continue` is useless even when the loop itself is labeled
		outdent`
			outer: for (const x of xs) {
				doX();
				continue;
			}
		`,
		// Of two consecutive `continue` statements, only the last one is useless
		outdent`
			for (const x of xs) {
				continue;
				continue;
			}
		`,
		// `continue` last inside an `if` nested in the `else` branch
		outdent`
			for (const x of xs) {
				if (a) {
					doX();
				} else {
					if (b) {
						continue;
					}
				}
			}
		`,
		// `do … while` with the `continue` wrapped in a trailing `if`
		outdent`
			do {
				if (a) {
					continue;
				}
			} while (cond);
		`,
		// Trailing comment on the same line must not be deleted by the fix
		outdent`
			for (const x of xs) {
				doX();
				continue; // trailing comment
			}
		`,
		// Leading comment must be preserved by the fix
		outdent`
			for (const x of xs) {
				doX();
				// leading comment
				continue;
			}
		`,
	],
});
