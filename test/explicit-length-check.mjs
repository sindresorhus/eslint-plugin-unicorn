import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

const suggestionCase = ({code, output, desc, options = []}) => {
	const suggestion = {output};
	if (desc) {
		suggestion.desc = desc;
	}

	return {
		code,
		options,
		errors: [
			{suggestions: [suggestion]},
		],
	};
};

const nonZeroCases = [
	'foo.length',
	'!!foo.length',
	'foo.length !== 0',
	'foo.length != 0',
	'foo.length > 0',
	'foo.length >= 1',
	'0 !== foo.length',
	'0 != foo.length',
	'0 < foo.length',
	'1 <= foo.length',
];

const zeroCases = [
	'!foo.length',
	'foo.length === 0',
	'foo.length == 0',
	'foo.length < 1',
	'0 === foo.length',
	'0 == foo.length',
	'1 > foo.length',
];

test({
	valid: [
		// Not `.length`
		'if (foo.notLength) {}',
		'if (length) {}',
		'if (foo[length]) {}',
		'if (foo["length"]) {}',

		// Already in wanted style
		'foo.length === 0',
		'foo.length > 0',

		// Not boolean
		'const bar = foo.length',
		'const bar = +foo.length',
		'const x = Boolean(foo.length, foo.length)',
		'const x = new Boolean(foo.length)',
		'const x = NotBoolean(foo.length)',
		'const length = foo.length ?? 0',
		'if (foo.length ?? bar) {}',

		// Checking 'non-zero'
		'if (foo.length > 0) {}',
		{
			code: 'if (foo.length > 0) {}',
			options: [{'non-zero': 'greater-than'}],
		},
		{
			code: 'if (foo.length !== 0) {}',
			options: [{'non-zero': 'not-equal'}],
		},

		// Checking 'non-zero'
		'if (foo.length === 0) {}',

		// `ConditionalExpression`
		'const bar = foo.length === 0 ? 1 : 2',
		// `WhileStatement`
		outdent`
			while (foo.length > 0) {
				foo.pop();
			}
		`,
		// `DoWhileStatement`
		outdent`
			do {
				foo.pop();
			} while (foo.length > 0);
		`,
		// `ForStatement`
		'for (; foo.length > 0; foo.pop());',

		'if (foo.length !== 1) {}',
		'if (foo.length > 1) {}',
		'if (foo.length < 2) {}',

		// With known static length value
		'const foo = { size: "small" }; if (foo.size) {}', // Not a number
		'const foo = { length: -1 }; if (foo.length) {}', // Array lengths cannot be negative
		'const foo = { length: 1.5 }; if (foo.length) {}', // Array lengths must be integers
		'const foo = { length: NaN }; if (foo.length) {}', // Array lengths cannot be NaN
		'const foo = { length: Infinity }; if (foo.length) {}', // Array lengths cannot be Infinity
	],
	invalid: [
		suggestionCase({
			code: 'const x = foo.length || bar()',
			output: 'const x = foo.length > 0 || bar()',
			desc: 'Replace `.length` with `.length > 0`.',
		}),
		suggestionCase({
			code: 'const x = foo.length || bar()',
			output: 'const x = foo.length !== 0 || bar()',
			desc: 'Replace `.length` with `.length !== 0`.',
			options: [{'non-zero': 'not-equal'}],
		}),
		suggestionCase({
			code: 'const x = foo.length || bar()',
			output: 'const x = foo.length > 0 || bar()',
			desc: 'Replace `.length` with `.length > 0`.',
			options: [{'non-zero': 'greater-than'}],
		}),
		suggestionCase({
			code: '() => foo.length && bar()',
			output: '() => foo.length > 0 && bar()',
		}),
		suggestionCase({
			code: 'alert(foo.length && bar())',
			output: 'alert(foo.length > 0 && bar())',
		}),
	],
});

test.snapshot({
	valid: [
		// Ignored
		outdent`
			class A {
				a() {
					if (this.length);
					while (!this.size || foo);
				}
			}
		`,
	],
	invalid: [
		outdent`
			if (
				!!!(
					${zeroCases.filter(code => code !== 'foo.length === 0').join(' &&\n\t\t')}
				) ||
				!(
					${nonZeroCases.filter(code => code !== 'foo.length > 0').join(' ||\n\t\t')}
				)
			) {}
		`,
		{
			code: outdent`
				if (
					${nonZeroCases.filter(code => code !== 'foo.length !== 0').join(' ||\n\t')}
				) {}
			`,
			options: [{'non-zero': 'not-equal'}],
		},
		{
			// Known, number static value
			code: 'const foo = { length: 123 }; if (foo.length) {}',
			options: [{'non-zero': 'not-equal'}],
		},
		'if (foo.bar && foo.bar.length) {}',
		'if (foo.length || foo.bar()) {}',
		'if (!!(!!foo.length)) {}',
		'if (!(foo.length === 0)) {}',
		'while (foo.length >= 1) {}',
		'do {} while (foo.length);',
		'for (let i = 0; (bar && !foo.length); i ++) {}',
		'const isEmpty = foo.length < 1;',
		'bar(foo.length >= 1)',
		'bar(!foo.length || foo.length)',
		'const bar = void !foo.length;',
		'const isNotEmpty = Boolean(foo.length)',
		'const isNotEmpty = Boolean(foo.length || bar)',
		'const isEmpty = Boolean(!foo.length)',
		'const isEmpty = Boolean(foo.length === 0)',
		'const isNotEmpty = !Boolean(foo.length === 0)',
		'const isEmpty = !Boolean(!Boolean(foo.length === 0))',
		'if (foo.size) {}',
		'if (foo.size && bar.length) {}',
		'function foo() {return!foo.length}',
		'function foo() {return(foo.length >= 1)}',
		'function foo() {throw!foo.length}',
	],
});

test.snapshot({
	testerOptions: {
		parser: parsers.vue,
	},
	valid: [
		'<not-template><div v-if="foo.length"></div></not-template>',
		'<template><div v-not-if="foo.length"></div></template>',
		'<template><div v-if="foo.notLength"></div></template>',
		'<template><div v-SHoW="foo.length"></div></template>',
		'<template><div hidden="!foo.length"></div></template>',
		'<template><img :width="foo.length"/></template>',
	],
	invalid: [
		'<template><div v-if="foo.length"></div></template>',
		outdent`
			<template>
				<div>
					<div v-if="foo"></div>
					<div v-else-if="bar.length"></div>
				</div>
			</template>
		`,
		'<template><div v-if="foo.length"></div></template>',
		{
			code: '<template><div v-if="foo.length"></div></template>',
			options: [{'non-zero': 'not-equal'}],
		},
		{
			code: '<template><div v-if="foo.length"></div></template>',
			options: [{'non-zero': 'greater-than'}],
		},
		'<template><div v-if="foo.length && bar"></div></template>',
		'<script>if (foo.length) {}</script>',
		'<template><div v-show="foo.length"></div></template>',
		'<template><div :hidden="foo.length >= 1"></div></template>',
		// This doesn't make sense, but valid code
		'<template><div @click="foo.length >= 1"></div></template>',
		'<template><div @click="method($event, foo.length >= 1)"></div></template>',
		'<template><div v-bind:hidden="0 === foo.length"></div></template>',
		'<template><input :disabled="Boolean(foo.length)"></template>',
		'<template><custom-component :custom-property="!foo.length"></custom-component></template>',
	],
});
