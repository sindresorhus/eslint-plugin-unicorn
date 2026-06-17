import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Number(value);',
		'Math.trunc(Number(value));',
		'parseFloat();',
		'parseInt(value);',
		'parseInt(value, 2);',
		'Number.parseInt(value, 8);',
		'parseInt(value, radix);',
		'Number.parseInt(value, radix);',
		'Number["parseFloat"](value);',
		'Number["parseInt"](value, 10);',
		'object.parseFloat(value);',
		'object.parseInt(value, 10);',
		outdent`
			const parseFloat = value => value;
			parseFloat(value);
		`,
		outdent`
			const parseInt = value => value;
			parseInt(value, 10);
		`,
		outdent`
			function parseFloat() {}
			function inner() {
				return parseFloat(value);
			}
		`,
		outdent`
			function parseInt() {}
			function inner() {
				return parseInt(value, 10);
			}
		`,
	],
	invalid: [
		'parseFloat(value);',
		'Number.parseFloat(value);',
		'globalThis.parseFloat(value);',
		'parseFloat(value, extra);',
		'Number /* comment */ .parseFloat(value);',
		'parseFloat(...argumentsArray);',
		'parseFloat(...firstArguments, ...secondArguments);',
		outdent`
			const {parseFloat} = Number;
			parseFloat(value);
		`,
		'parseInt(value, 10);',
		'Number.parseInt(value, 10);',
		'globalThis.parseInt(value, 10);',
		// Optional call: reported but no suggestion (replacement would be unsafe)
		'parseInt?.(value, 10);',
		'Number.parseInt?.(value, 10);',
		outdent`
			const {parseInt} = Number;
			parseInt(value, 10);
		`,
		'parseInt(value, 0xA);',
		'parseInt(value, 2 * 5);',
		outdent`
			const radix = 10;
			parseInt(value, radix);
		`,
		'parseInt(value, radix = 10);',
		'parseInt((foo, bar), 10);',
		'parseInt(value, 10, extra);',
		'parseInt(/* comment */ value, 10);',
		'parseInt(value, /* comment */ 10);',
	],
});
