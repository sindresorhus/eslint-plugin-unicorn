import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		...['return', 'throw'].map(keyword => ({
			code: `function foo(value, ready) { ${keyword} !\nvalue === true && ready; }`,
			errors: [{
				messageId: 'no-negation-in-equality-check/error',
				suggestions: [{
					messageId: 'no-negation-in-equality-check/suggestion',
					output: `function foo(value, ready) { ${keyword} ( \nvalue !== true && ready); }`,
				}],
			}],
		})),
		{
			code: 'function* foo(value, ready) { yield !\nvalue === true && ready; }',
			errors: [{messageId: 'no-negation-in-equality-check/error', suggestions: []}],
		},
		{
			code: 'function* foo(value) { yield !\nvalue === true; }',
			errors: [{messageId: 'no-negation-in-equality-check/error', suggestions: []}],
		},
		...['as boolean', 'satisfies boolean'].map(wrapper => ({
			code: `function* foo(value) { yield !\nvalue === true ${wrapper}; }`,
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-negation-in-equality-check/error', suggestions: []}],
		})),
		...[
			['yield (!\nvalue === true)', 'yield (\nvalue !== true)'],
			['yield (!\nvalue) === true', 'yield (\nvalue) !== true'],
			['yield* !\nvalue === true', 'yield* \nvalue !== true'],
		].map(([expression, replacement]) => ({
			code: `function* foo(value) { ${expression}; }`,
			errors: [{
				messageId: 'no-negation-in-equality-check/error',
				suggestions: [{
					messageId: 'no-negation-in-equality-check/suggestion',
					output: `function* foo(value) { ${replacement}; }`,
				}],
			}],
		})),
	],
});

test.snapshot({
	valid: [
		'!foo instanceof bar',
		'+foo === bar',
		'!(foo === bar)',
		'!!foo === bar',
		'!!!foo === bar',
		// We are not checking right side
		'foo === !bar',
	],
	invalid: [
		'!foo === bar',
		'!foo !== bar',
		'!foo == bar',
		'!foo != bar',
		outdent`
			function x() {
				return!foo === bar;
			}
		`,
		outdent`
			function x() {
				return!
					foo === bar;
				throw!
					foo === bar;
			}
		`,
		outdent`
			foo
			!(a) === b
		`,
		outdent`
			foo
			![a, b].join('') === c
		`,
		outdent`
			foo
			! [a, b].join('') === c
		`,
		outdent`
			foo
			!/* comment */[a, b].join('') === c
		`,
	],
});

test({
	valid: [],
	invalid: [{
		code: '!{value: false}.value === true;',
		errors: [{messageId: 'no-negation-in-equality-check/error', suggestions: [{messageId: 'no-negation-in-equality-check/suggestion', output: '({value: false}.value) !== true;'}]}],
	}, ...[
		['!function () {} === true;', '(function () {}) !== true;'],
		['const value = !{value: false}.value === true;', 'const value = {value: false}.value !== true;'],
		['const read = () => !{value: false}.value === true;', 'const read = () => ({value: false}.value) !== true;'],
		['export default !function () {} === true;', 'export default (function () {}) !== true;'],
		['(!{value: false}.value) === true;', '({value: false}.value) !== true;'],
		['!({value: false}.value) === true;', '({value: false}.value) !== true;'],
		['setup()\n!{value: false}.value === true;', 'setup()\n;({value: false}.value) !== true;'],
		['!/* keep */{value: false}.value === true;', '/* keep */({value: false}.value) !== true;'],
	].map(([code, output]) => ({
		code,
		errors: [{messageId: 'no-negation-in-equality-check/error', suggestions: [{messageId: 'no-negation-in-equality-check/suggestion', output}]}],
	}))],
});
