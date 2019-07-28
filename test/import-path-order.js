import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/import-path-order';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const errorGroup = {
	ruleId: 'import-path-order',
	messageId: 'import-path-order-group'
};

const errorDepth = {
	ruleId: 'import-path-order',
	messageId: 'import-path-order-depth'
};

const errorOrder = {
	ruleId: 'import-path-order',
	messageId: 'import-path-order'
};

const errorBlankLines = {
	ruleId: 'import-path-order',
	messageId: 'import-path-blanklines'
};

const optionAlphaSensitive = {
	alphabetize: 'case-sensitive'
};

const optionAlphaInsensitive = {
	alphabetize: 'case-insensitive'
};

const optionAlphaParts = {
	alphabetize: 'parts'
};

const optionAlphaOff = {
	alphabetize: 'off'
};

ruleTester.run('import-path-order', rule, {
	valid: [
		outdent`
			const a = require('a');
			const b = require('b');
		`,
		outdent`
			const a = require('ab');
			const b = require('ab');
		`,
		outdent`
			const a = require('a');
			import b from 'b';
		`,
		outdent`
			import a from 'a';
			const b = require('b');
		`,
		outdent`
			import a from 'a';
			import b from 'b';
		`,
		outdent`
			import a from 'ab';
			import b from 'ab';
		`,
		outdent`
			import { a } from 'ab';
			import { b } from 'ab';
		`,
		outdent`
			const z = require('a');
			const y = require('b');
		`,
		outdent`
			const c = require('c');

			function foo() {
				const b = require('b');
				const a = require('a');
			}
		`,
		outdent`
			import fs from 'fs';
			import a from 'a';
		`,
		{
			code: outdent`
				const a = require('a');

				const b = require('b');
			`,
			options: [{
				allowBlankLines: true
			}]
		},
		outdent`
			const a = require('a');
			// Not a blank line
			const b = require('b');
		`,
		outdent`
			const a = require('a');
			/*

			Not a blank line

			*/
			const b = require('b');
		`,
		outdent`
			import 'a';
			import b from 'b';
			const c = require('c');
		`,
		outdent`
			import a from 'a';
			import 'b';
			const c = require('c');
		`,
		outdent`
			import a from 'a';
			require('b');
			const c = require('c');
		`,
		{
			code: outdent`
				const B = require('B');
				const a = require('a');
			`,
			options: [optionAlphaSensitive]
		},
		{
			code: outdent`
				const a = require('a');
				const B = require('B');
			`,
			options: [optionAlphaInsensitive]
		},
		{
			code: outdent`
				const b = require('b');
				const a = require('a');
			`,
			options: [optionAlphaOff]
		},
		{
			code: outdent`
				const one = require('a-one');
				const two = require('a-two');
				const three = require('b-three');
			`,
			options: [optionAlphaParts]
		},
		{
			code: outdent`
				const two = require('a-two');
				const one = require('a-one');
				const three = require('b-three');
			`,
			options: [optionAlphaParts]
		},
		{
			code: outdent`
				const three = require('b-three');
				const one = require('a-one');
				const two = require('a-two');
			`,
			options: [optionAlphaParts]
		},
	],
	invalid: [
		{
			code: outdent`
				const b = require('b');
				const a = require('a');
			`,
			output: outdent`
				const a = require('a');
				const b = require('b');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				const a = require('a');
				const c = require('c');
				const b = require('b');
			`,
			output: outdent`
				const a = require('a');
				const b = require('b');
				const c = require('c');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				const b = require('b');
				const a = require('a');
				const c = require('c');
			`,
			output: outdent`
				const a = require('a');
				const b = require('b');
				const c = require('c');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				const c = require('c');
				const b = require('b');
				const a = require('a');
			`,
			output: outdent`
				const b = require('b');
				const c = require('c');
				const a = require('a');
			`,
			errors: [
				errorOrder,
				errorOrder
			]
		},
		{
			code: outdent`
				const d = require('d');
				const a = require('a');
				const c = require('c');
				const e = require('e');
				const b = require('b');
			`,
			output: outdent`
				const a = require('a');
				const d = require('d');
				const c = require('c');
				const b = require('b');
				const e = require('e');
			`,
			errors: [
				errorOrder,
				errorOrder
			]
		},
		{
			code: outdent`
				import b from 'b';
				const a = require('a');
			`,
			output: outdent`
				const a = require('a');
				import b from 'b';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				const b = require('b');
				import a from 'a';
			`,
			output: outdent`
				import a from 'a';
				const b = require('b');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from 'b';
				import a from 'a';
			`,
			output: outdent`
				import a from 'a';
				import b from 'b';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`

				import b from 'b';
				import a from 'a';
			`,
			output: outdent`

				import a from 'a';
				import b from 'b';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from 'b';
				import a from 'a';

			`,
			output: outdent`
				import a from 'a';
				import b from 'b';

			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from 'b';

				import a from 'a';
			`,
			output: outdent`
				import a from 'a';
				import b from 'b';
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				import b from 'b';




				import a from 'a';
			`,
			output: outdent`
				import a from 'a';
				import b from 'b';
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				import b from 'b';import a from 'a';
			`,
			output: outdent`
				import a from 'a';import b from 'b';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from './b';
				import a from 'a';
			`,
			output: outdent`
				import a from 'a';
				import b from './b';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import b from '../b';
				import a from 'a';
			`,
			output: outdent`
				import a from 'a';
				import b from '../b';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import b from '../../b';
				import a from 'a';
			`,
			output: outdent`
				import a from 'a';
				import b from '../../b';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import a from './a';
				import b from '../b';
			`,
			output: outdent`
				import b from '../b';
				import a from './a';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import a from '../a';
				import b from '../../b';
			`,
			output: outdent`
				import b from '../../b';
				import a from '../a';
			`,
			errors: [errorDepth]
		},
		{
			code: outdent`
				import a from '../../a';
				import b from '../../../b';
			`,
			output: outdent`
				import b from '../../../b';
				import a from '../../a';
			`,
			errors: [errorDepth]
		},
		{
			code: outdent`
				import b from 'b';
				import fs from 'fs';
			`,
			output: outdent`
				import fs from 'fs';
				import b from 'b';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import b from 'b';
				import 'a';
			`,
			output: outdent`
				import 'a';
				import b from 'b';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from 'b';
				require('a');
			`,
			output: outdent`
				require('a');
				import b from 'b';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				const b = require('b');

				const a = require('a');
			`,
			output: outdent`
				const a = require('a');
				const b = require('b');
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				import a from 'a';

				import b from 'b';
			`,
			output: outdent`
				import a from 'a';
				import b from 'b';
			`,
			errors: [errorBlankLines]
		},
		{
			code: outdent`
				import a from 'a';

				import b from 'b';
			`,
			output: outdent`
				import a from 'a';
				import b from 'b';
			`,
			errors: [errorBlankLines]
		},
		{
			code: outdent`
				const b = require('b');

				// Comment
				const a = require('a');
			`,
			output: outdent`
				const b = require('b');
				// Comment
				const a = require('a');
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				const b = require('b');
				// Comment
				const a = require('a');
			`,
			output: outdent`
				const b = require('b');
				// Comment
				const a = require('a');
			`,
			errors: [
				errorOrder
			]
		},
		{
			code: outdent`
				const b = require('b');
				// Comment with blank line afterward

				const a = require('a');
			`,
			output: outdent`
				const b = require('b');
				// Comment with blank line afterward
				const a = require('a');
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				const b = require('b'); // Comment

				const a = require('a');
			`,
			output: outdent`
				const b = require('b'); // Comment
				const a = require('a');
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				const b = require('b');
				const a = require('a');
				// Comment
				const c = require('c');
			`,
			output: outdent`
				const b = require('b');
				const a = require('a');
				// Comment
				const c = require('c');
			`,
			errors: [
				errorOrder
			]
		},
		{
			code: outdent`
				// Comment
				const b = require('b');
				const a = require('a');
			`,
			output: outdent`
				// Comment
				const b = require('b');
				const a = require('a');
			`,
			errors: [
				errorOrder
			]
		},
		{
			code: outdent`
				const b = require('b');

				const a = require('a'); // Comment
			`,
			output: outdent`
				const b = require('b');
				const a = require('a'); // Comment
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				const b = require('b');
				const foo = 'foo';

				const a = require('a');
			`,
			output: outdent`
				const b = require('b');
				const foo = 'foo';
				const a = require('a');
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				const b = require('b');

				const foo = 'foo';
				const a = require('a');
			`,
			output: outdent`
				const b = require('b');
				const foo = 'foo';
				const a = require('a');
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				const b = require('b');
				{ const foo = 'foo'; }
				const a = require('a');
			`,
			output: outdent`
				const b = require('b');
				{ const foo = 'foo'; }
				const a = require('a');
			`,
			errors: [
				errorBlankLines,
				errorOrder
			]
		},
		{
			code: outdent`
				import { b } from 'b';
				import { a } from 'a';
			`,
			output: outdent`
				import { a } from 'a';
				import { b } from 'b';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import {
					b
				} from 'b';
				import {
					a
				} from 'a';
			`,
			output: outdent`
				import {
					a
				} from 'a';
				import {
					b
				} from 'b';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import { // one
					b // two
				} from 'b'; // three
				import { // four
					a // five
				} from 'a'; // six
			`,
			output: outdent`
				import { // one
					b // two
				} from 'b'; // three
				import { // four
					a // five
				} from 'a'; // six
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				// one
				import {
					// two
					b
				// three
				} from 'b';
				// four
				import {
					// five
					a
				// six
				} from 'a';
			`,
			output: outdent`
				// one
				import {
					// two
					b
				// three
				} from 'b';
				// four
				import {
					// five
					a
				// six
				} from 'a';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				const a = require('a');
				const B = require('B');
			`,
			output: outdent`
				const B = require('B');
				const a = require('a');
			`,
			options: [optionAlphaSensitive],
			errors: [errorOrder]
		},
		{
			code: outdent`
				const B = require('B');
				const a = require('a');
			`,
			output: outdent`
				const a = require('a');
				const B = require('B');
			`,
			options: [optionAlphaInsensitive],
			errors: [errorOrder]
		},
		{
			code: outdent`
				const one = require('a-one');
				const three = require('b-three');
				const two = require('a-two');
			`,
			output: outdent`
				const one = require('a-one');
				const two = require('a-two');
				const three = require('b-three');
			`,
			options: [optionAlphaParts],
			errors: [errorOrder]
		},
		{
			code: outdent`
				const three = require('b-three');
				const one = require('a-one');
				const four = require('b-four');
				const two = require('a-two');
				const five = require('b-five');
			`,
			output: outdent`
				const three = require('b-three');
				const four = require('b-four');
				const one = require('a-one');
				const five = require('b-five');
				const two = require('a-two');
			`,
			options: [optionAlphaParts],
			errors: [
				errorOrder,
				errorOrder
			]
		}
	]
});
