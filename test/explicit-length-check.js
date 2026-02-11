import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const TYPE_NON_ZERO = 'non-zero';
const TYPE_ZERO = 'zero';

const suggestionCase = ({code, messageId, output, desc, options = []}) => ({
	code,
	options,
	errors: [
		{
			messageId,
			suggestions: [{desc, output}],
		},
	],
});

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
		// Logical OR with number or string fallback
		'const x = foo.length || 2',
		'const A_NUMBER = 2; const x = foo.length || A_NUMBER',
		'const x = foo.length || "bar"',
		'const x = foo.length || `bar`',
		'const A_STRING = "bar"; const x = foo.length || A_STRING',
		'const size = props.size || "mini"',
	],
	invalid: [
		{
			code: 'if (!foo.length > 0) {}',
			// eslint-disable-next-line unicorn/no-null
			output: null,
			errors: [{messageId: TYPE_ZERO}],
		},
		{
			code: 'if (!foo.length === 0) {}',
			// eslint-disable-next-line unicorn/no-null
			output: null,
			errors: [{messageId: TYPE_ZERO}],
		},
		suggestionCase({
			code: 'const x = foo.length || bar()',
			messageId: TYPE_NON_ZERO,
			output: 'const x = foo.length > 0 || bar()',
			desc: 'Replace `.length` with `.length > 0`.',
		}),
		suggestionCase({
			code: 'const x = foo.length || unknown',
			messageId: TYPE_NON_ZERO,
			output: 'const x = foo.length > 0 || unknown',
			desc: 'Replace `.length` with `.length > 0`.',
		}),
		suggestionCase({
			code: 'const NON_NUMBER = true; const x = foo.length || NON_NUMBER',
			messageId: TYPE_NON_ZERO,
			output: 'const NON_NUMBER = true; const x = foo.length > 0 || NON_NUMBER',
			desc: 'Replace `.length` with `.length > 0`.',
		}),
		suggestionCase({
			code: 'const x = foo.length || bar()',
			messageId: TYPE_NON_ZERO,
			output: 'const x = foo.length !== 0 || bar()',
			desc: 'Replace `.length` with `.length !== 0`.',
			options: [{'non-zero': 'not-equal'}],
		}),
		suggestionCase({
			code: 'const x = foo.length || bar()',
			messageId: TYPE_NON_ZERO,
			output: 'const x = foo.length > 0 || bar()',
			desc: 'Replace `.length` with `.length > 0`.',
			options: [{'non-zero': 'greater-than'}],
		}),
		suggestionCase({
			code: '() => foo.length && bar()',
			messageId: TYPE_NON_ZERO,
			desc: 'Replace `.length` with `.length > 0`.',
			output: '() => foo.length > 0 && bar()',
		}),
		suggestionCase({
			code: 'alert(foo.length && bar())',
			messageId: TYPE_NON_ZERO,
			desc: 'Replace `.length` with `.length > 0`.',
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
		// Space after keywords
		'function foo() {return!foo.length}',
		'function foo() {throw!foo.length}',
		'async function foo() {await!foo.length}',
		'function * foo() {yield!foo.length}',
		'function * foo() {yield*!foo.length}',
		'delete!foo.length',
		'typeof!foo.length',
		'void!foo.length',
		'a instanceof!foo.length',
		'a in!foo.length',
		'export default!foo.length',
		'if(true){}else!foo.length',
		'do!foo.length;while(true) {}',
		'switch(foo){case!foo.length:{}}',
		'for(const a of!foo.length);',
		'for(const a in!foo.length);',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.vue,
		},
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
