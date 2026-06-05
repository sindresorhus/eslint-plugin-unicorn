import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const absolute = Math.abs(value);',
		'value < 0 ? value : -value',
		'value > 0 ? -value : value',
		'value < 1 ? -value : value',
		'value < 0 ? -otherValue : value',
		'value < 0 ? -value : otherValue',
		'value < 0n ? -value : value',
		'value < BigInt(0) ? -value : value',
		'const value = 1n; value < 0 ? -value : value;',
		'const value = BigInt(1); value < 0 ? -value : value;',
		'function foo(value = 1n) { return value < 0 ? -value : value; }',
		'function foo(value = BigInt(1)) { return value < 0 ? -value : value; }',
		'value > limit || value < limit',
		'value > limit || otherValue < -limit',
		'value > limit || value <= -limit',
		'value > limit || value < -otherLimit',
		'value > 0n || value < -0n',
		'value > BigInt(0) || value < -BigInt(0)',
		'const value = 1n; const limit = 2n; value > limit || value < -limit;',
		'(value + 1) < 0 ? -(value + 1) : value + 1',
		'Math.abs(value) > limit',
		'Math.abs(value) >= limit',
	],
	invalid: [
		'value < 0 ? -value : value',
		'value <= 0 ? -value : value',
		'value > 0 ? value : -value',
		'value >= 0 ? value : -value',
		'value < 0 ? 0 - value : value',
		'value <= 0 ? 0 - value : value',
		'value < 0 ? value * -1 : value',
		'value < 0 ? -1 * value : value',
		'object.value < 0 ? -object.value : object.value',
		'0 > value ? -value : value',
		'0 >= value ? -value : value',
		'0 < value ? value : -value',
		'0 <= value ? value : -value',
		'function foo() {return value < 0 ? -value : value;}',
		'function foo() {return(value < 0 ? -value : value);}',
		'const absolute = value > limit || value < -limit;',
		'const absolute = value >= limit || value <= -limit;',
		'const absolute = value < -limit || value > limit;',
		'const absolute = value <= -limit || value >= limit;',
		'const absolute = limit < value || -limit > value;',
		'const absolute = limit <= value || -limit >= value;',
		'function foo() {return value > limit || value < -limit;}',
		'function foo() {return(value > limit || value < -limit);}',
		'const absolute = object.value > limit || object.value < -limit;',
		'const absolute = value > object.limit || value < -object.limit;',
		'value < 0 ? -/* comment */value : value',
		'value > limit || value < -/* comment */limit',
		outdent`
			if (number > POSITIVE_CONSTANT || number < -POSITIVE_CONSTANT) {
				console.log(number);
			}
		`,
		outdent`
			if (number >= POSITIVE_CONSTANT || number <= -POSITIVE_CONSTANT) {
				console.log(number);
			}
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		outdent`
			function foo(value: bigint) {
				return value < 0 ? -value : value;
			}
		`,
		outdent`
			function foo(value) {
				return (value as bigint) < 0 ? -(value as bigint) : (value as bigint);
			}
		`,
		outdent`
			function foo(value) {
				return (<bigint>value) < 0 ? -(<bigint>value) : (<bigint>value);
			}
		`,
		outdent`
			function foo(value: bigint, limit: bigint) {
				return value > limit || value < -limit;
			}
		`,
		outdent`
			const value: bigint = 1n;
			value < 0 ? -value : value;
		`,
		outdent`
			function foo(value: number | bigint) {
				return value < 0 ? -value : value;
			}
		`,
		outdent`
			function foo(value) {
				return (value as number | bigint) < 0 ? -(value as number | bigint) : (value as number | bigint);
			}
		`,
		outdent`
			function foo(value: bigint & {}) {
				return value < 0 ? -value : value;
			}
		`,
		outdent`
			const value: 1n = 1n;
			value < 0 ? -value : value;
		`,
	],
	invalid: [
		outdent`
			function foo(value: number) {
				return value < 0 ? -value : value;
			}
		`,
	],
});
