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
		'const Number = {}; value % 1 === 0',
		'import Number from "number"; Math.trunc(value) === value',
		'function foo(Number) { return _.isInteger(value); }',
		'value % 1 == 0', // Loose equality
		'value % 1 !== 0', // Negative check
		'0 !== value % 1', // Negative check
		'(value | 0) === value', // Bitwise check
		'Number.parseInt(value, 10) === value',
		'Math.round(value) === value',
		'Math.floor(value) === otherValue',
		'Math.trunc(value) === otherValue',
		'Math.floor(value) == value', // Loose equality
		'Math.trunc(value) !== value', // Negative check
		'const Math = {trunc() {}}; Math.trunc(value) === value',
		'Math.trunc?.(value) === value',
		'Math?.trunc(value) === value',
		'Math[trunc](value) === value',
		'Math["trunc"](value) === value',
		'Math.floor(...value) === value',
		'Math.trunc(...value) === value',
		'Math.trunc(value, extra) === value',
		'_.isInteger?.(value)',
		'_?.isInteger(value)',
		'_[isInteger](value)',
		'_["isInteger"](value)',
		'_.isInteger(...value)',
		'_.isInteger(value, extra)',
		'lodash.isSafeInteger(...value)',
		'underscore.isSafeInteger(value, extra)',
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
		'value % 1 === 0',
		'0 === value % 1',
		'object.value % 1 === 0',
		'(foo, bar) % 1 === 0',
		'Math.floor(value) === value',
		'value === Math.floor(value)',
		'Math.trunc(value) === value',
		'value === Math.trunc(value)',
		'Math.trunc(object.value) === object.value',
		'Math.trunc(object["value"]) === object.value',
		'_.isInteger(value)',
		'lodash.isInteger(value)',
		'underscore.isInteger(value)',
		'_.isSafeInteger(value)',
		'lodash.isSafeInteger(value)',
		'underscore.isSafeInteger(value)',
		'_.isInteger(/* comment */ value)', // Reported without suggestion to avoid dropping comments
		'Math.trunc(/* comment */ value) === value', // Reported without suggestion to avoid dropping comments
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
		{
			code: 'Math.trunc(value as number) === value',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
