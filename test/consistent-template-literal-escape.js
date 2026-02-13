import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Correct: escape the dollar sign
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `\\${a}`',
		// No escaping needed
		'const foo = `hello`',
		'const foo = `$`',
		'const foo = `{`',
		// Empty template literal
		'const foo = ``',
		// Actual template expression (not escaped)
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `${a}`',
		// Template with only expressions
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `${a}${b}`',
		// String.raw tagged template (skipped)
		'const foo = String.raw`$\\{a}`',
		// Escaped backslash before \${ (the backslash is escaped, \${ is correct)
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `\\\\\\${a}`',
		// Regular string (not a template literal)
		String.raw`const foo = '$\{a}'`,
	],
	invalid: [
		// Brace escaped instead of dollar: $\{ → \${
		'const foo = `$\\{a}`',
		// Both escaped: \$\{ → \${
		'const foo = `\\$\\{a}`',
		// Multiple occurrences
		'const foo = `$\\{a} and $\\{b}`',
		// Escaped backslash before $\{ (\\$\{ — the $\{ part is still wrong)
		'const foo = `\\\\$\\{a}`',
		// Both escaped with preceding escaped backslash
		'const foo = `\\\\\\$\\{a}`',
		// Non-String.raw tagged template (should still be flagged)
		'const foo = html`$\\{a}`',
		// Bad escape in head element (before expression)
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `$\\{a}${expr}`',
		// Bad escape in tail element (after expression)
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `${expr}$\\{a}`',
		// Bad escape in both head and tail elements
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `$\\{a}${expr}$\\{b}`',
	],
});
