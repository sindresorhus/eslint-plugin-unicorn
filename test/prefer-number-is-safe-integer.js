import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Number.isSafeInteger(x)',
		'Number.isInteger', // Not a call
		'new Number.isInteger(x)',
		'isInteger(x)', // No `Number` object
		'Number.isInteger?.(x)', // Optional call
		'Number?.isInteger(x)', // Optional member
		'Number[isInteger](x)', // Computed
		'Number["isInteger"](x)', // Computed
		'Number.isinteger(x)', // Wrong casing
		'NotNumber.isInteger(x)',
		'window.Number.isInteger(x)',
		'Number.isInteger.bind(Number)', // Not a direct call
		'const x = Number.isInteger', // Reference, not a call
		'globalThis.Number.isInteger(x)', // Not the bare `Number` object
		'const Number = {isInteger() {}}; Number.isInteger(x)',
		'import Number from "number"; Number.isInteger(x)',
		'function foo(Number) { return Number.isInteger(x); }',
	],
	invalid: [
		'Number.isInteger(x)',
		'!Number.isInteger(x)',
		'if (Number.isInteger(x)) {}',
		'if (!Number.isInteger(x)) {}',
		'Number.isInteger(0.5)',
		'(( (( Number )).isInteger( ((x)), )))',
		'Number.isInteger(x) ? a : b',
		'Number.isInteger(/* comment */ x)', // Comments are preserved
		'Number.isInteger(...x)', // Spread argument
		'Number.isInteger()', // Flagged regardless of argument count
	],
});

// TypeScript
test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'Number.isInteger(x as number)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Number.isInteger(x!)', // Non-null assertion must survive the suggestion
			languageOptions: {parser: parsers.typescript},
		},
	],
});
