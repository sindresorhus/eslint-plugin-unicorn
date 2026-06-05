import outdent from 'outdent';
import {getTester} from './utils/test.js';

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
		'value > limit || value < limit',
		'value > limit || otherValue < -limit',
		'value > limit || value <= -limit',
		'value > limit || value < -otherLimit',
		'value > 0n || value < -0n',
		'value > BigInt(0) || value < -BigInt(0)',
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
