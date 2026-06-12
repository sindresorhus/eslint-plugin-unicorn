import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = NaN;',
		'const foo = Infinity;',
		'const foo = -Infinity;',
		'const foo = Number.MAX_SAFE_INTEGER;',
		'const foo = object.Number.NaN;',
		'Number.NaN = 1;',
		'Number.POSITIVE_INFINITY ||= 1;',
		'[Number.NEGATIVE_INFINITY] = [];',
		outdent`
			const Number = {
				NaN: 1,
				POSITIVE_INFINITY: 2,
				NEGATIVE_INFINITY: -2,
			};
			const foo = Number.NaN + Number.POSITIVE_INFINITY + Number.NEGATIVE_INFINITY;
		`,
		outdent`
			function foo() {
				const NaN = 1;
				const value = Number.NaN;
			}
		`,
		outdent`
			function foo() {
				const Infinity = 1;
				const positive = Number.POSITIVE_INFINITY;
				const negative = Number.NEGATIVE_INFINITY;
			}
		`,
		{
			code: 'const NaN = 1; const value = Number.NaN;',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: 'const Infinity = 1; const positive = Number.POSITIVE_INFINITY; const negative = Number.NEGATIVE_INFINITY;',
			languageOptions: {sourceType: 'script'},
		},
	],
	invalid: [
		'const foo = Number.NaN;',
		'const foo = window.Number.NaN;',
		'const foo = Number["NaN"];',
		'const foo = Number.POSITIVE_INFINITY;',
		'const foo = Number.NEGATIVE_INFINITY;',
		'const foo = Number.NEGATIVE_INFINITY.toString();',
		'const foo = {value: Number.NaN};',
		'const foo = {[Number.POSITIVE_INFINITY]: Number.NEGATIVE_INFINITY};',
		'const foo = Number /* comment */ .NaN;',
	],
});
