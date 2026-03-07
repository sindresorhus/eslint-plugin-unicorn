import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const error = {messageId: 'switch-case-break-position'};

test.snapshot({
	valid: [
		// Break inside braces
		outdent`
			switch(foo) {
				case 1: {
					doStuff();
					break;
				}
			}
		`,
		// Return inside braces (in function)
		outdent`
			function bar() {
				switch(foo) {
					case 1: {
						doStuff();
						return;
					}
				}
			}
		`,
		// Break without braces (not the pattern we're looking for)
		outdent`
			switch(foo) {
				case 1:
					doStuff();
					break;
			}
		`,
		// Fall-through (no break)
		outdent`
			switch(foo) {
				case 1: {
					doStuff();
				}
				case 2: {
					doOtherStuff();
					break;
				}
			}
		`,
		// Empty case
		outdent`
			switch(foo) {
				case 1:
				case 2: {
					doStuff();
					break;
				}
			}
		`,
		// Block with only break
		outdent`
			switch(foo) {
				case 1: {
					break;
				}
			}
		`,
		// Default with break inside
		outdent`
			switch(foo) {
				default: {
					doStuff();
					break;
				}
			}
		`,
		// Empty block with break after (not fixable, so not flagged)
		outdent`
			switch(foo) {
				case 1: {}
				break;
			}
		`,
	],
	invalid: [
		// Basic: break after block
		outdent`
			switch(foo) {
				case 1: {
					doStuff();
				}
				break;
			}
		`,
		// Return after block (in function)
		outdent`
			function bar() {
				switch(foo) {
					case 1: {
						doStuff();
					}
					return;
				}
			}
		`,
		// Return with value after block (in function)
		outdent`
			function bar() {
				switch(foo) {
					case 1: {
						doStuff();
					}
					return result;
				}
			}
		`,
		// Throw after block
		outdent`
			switch(foo) {
				case 1: {
					doStuff();
				}
				throw new Error('bad');
			}
		`,
		// Default case with break after block
		outdent`
			switch(foo) {
				default: {
					doStuff();
				}
				break;
			}
		`,
		// Block on its own line with break after
		outdent`
			switch(foo) {
				case 1:
					{
						doStuff();
					}
					break;
			}
		`,
		// Multiple cases, one bad
		outdent`
			switch(foo) {
				case 1: {
					doStuff();
					break;
				}
				case 2: {
					doOtherStuff();
				}
				break;
			}
		`,
		// Continue after block (in loop)
		outdent`
			for (const foo of items) {
				switch(foo) {
					case 1: {
						doStuff();
					}
					continue;
				}
			}
		`,
		// Labeled break after block
		outdent`
			outer: for (let i = 0; i < 3; i++) {
				switch(foo) {
					case 1: {
						doStuff();
					}
					break outer;
				}
			}
		`,
		// Comment between block and break (fix skipped, error still reported)
		outdent`
			switch(foo) {
				case 1: {
					doStuff();
				}
				// This break is intentional
				break;
			}
		`,
	],
});

test({
	valid: [],
	invalid: [
		// Inline comment
		{
			code: outdent`
				switch(foo) {
					case 1: {
						doStuff(); // Keep this comment with the statement
					}
					break;
				}
			`,
			output: outdent`
				switch(foo) {
					case 1: {
						doStuff(); // Keep this comment with the statement
						break;
					}
				}
			`,
			errors: [error],
		},
		// Block comment
		{
			code: outdent`
				switch(foo) {
					case 1: {
						doStuff(); /* Keep this block comment with the statement */
					}
					break;
				}
			`,
			output: outdent`
				switch(foo) {
					case 1: {
						doStuff(); /* Keep this block comment with the statement */
						break;
					}
				}
			`,
			errors: [error],
		},
		// Before closing brace
		{
			code: outdent`
				switch(foo) {
					case 1: {
						doStuff();
						// Keep this comment before the inserted break
					}
					break;
				}
			`,
			output: outdent`
				switch(foo) {
					case 1: {
						doStuff();
						// Keep this comment before the inserted break
						break;
					}
				}
			`,
			errors: [error],
		},
		// ESLint directive
		{
			code: outdent`
				switch(foo) {
					case 1: {
						console.log(foo); // eslint-disable-line no-console
					}
					break;
				}
			`,
			output: outdent`
				switch(foo) {
					case 1: {
						console.log(foo); // eslint-disable-line no-console
						break;
					}
				}
			`,
			errors: [error],
		},
		// Single-line block — error reported but fix skipped (would produce malformed output)
		{
			code: 'switch(foo) { case 1: { doStuff(); } break; }',
			errors: [error],
		},
	],
});
