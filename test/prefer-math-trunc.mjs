import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = 1 | 1;',
		'const foo = 0 | 1;',
		'const foo = 1.4 | +0;',
		'const foo = 1.4 | -0;',
		'const foo = 1.4 | (.5 - 0.5);',
		'const foo = 1.4 & 0xFFFFFFFF',
		'const foo = 1.4 & 0xFF',
		'const foo = 1.4 & 0x0',
		'const foo = 1.4 & 0',
		'const foo = ~3.9;',
		'const foo = 1.1 >> 1',
		'const foo = 0 << 1',
		outdent`
			let foo = 0;
			foo |= 1;
		`,
		outdent`
			let foo = 1.2; // comment 1
			foo |= 1; // comment 2 and 1.2 | 0
		`,
	],
	invalid: [
		// Basic "bitwise OR with 0" case
		'const foo = 1.1 | 0;',
		'const foo = 111 | 0;',
		'const foo = (1 + 2 / 3.4) | 0;',
		'const foo = bar((1.4 | 0) + 2);',
		'const foo = (0, 1.4) | 0;',

		// Different "types" of 0
		'const foo = 1.4 | 0.;',
		'const foo = 1.4 | .0;',
		'const foo = 1.4 | 0.0000_0000_0000;',
		'const foo = 1.4 | 0b0;',
		'const foo = 1.4 | 0x0000_0000_0000;',
		'const foo = 1.4 | 0o0;',

		// Multiple bitwise OR
		'const foo = 1.23 | 0 | 4;',

		// Basic "bitwise NOT" case
		'const foo = ~~3.9;',
		'const foo = ~~111;',
		'const foo = ~~(1 + 2 / 3.4);',
		'const foo = ~~1 + 2 / 3.4;',
		'const foo = ~~(0, 1.4);',
		'const foo = ~~~10.01;',
		'const foo = ~~(~10.01);',
		'const foo = ~(~~10.01);',
		'const foo = ~~-10.01;',
		'const foo = ~~~~10.01;',

		// Other operators
		'const foo = bar >> 0;',
		'const foo = bar << 0;',
		'const foo = bar ^ 0;',

		// Case with objects (MemberExpression and ChainExpression)
		outdent`
			const foo = {a: {b: {c: 3}}};
			const bar = a.b.c | 0;
		`,
		outdent`
			const foo = {a: {b: {c: 3}}};
			const bar = a.b?.c | 0;
		`,
		outdent`
			const foo = {a: {b: {c: 3}}};
			const bar = ~~a.b?.c;
		`,
		// With a variable
		outdent`
			const foo = 3;
			const bar = foo | 0;
		`,
		outdent`
			const foo = 3;
			const bar = ~~foo;
		`,

		// With an AssignmentExpression
		outdent`
			let foo = 2;
			foo |= 0;
		`,
		outdent`
			const foo = {a: {b: 3.4}};
			foo.a.b |= 0;
		`,
		outdent`
			const foo = 10.01;
			const bar = ~~foo;
		`,
		outdent`
			let foo = 10.01;
			foo >>= 0;
		`,
		outdent`
			let foo = 10.01;
			foo <<= 0;
		`,
		outdent`
			let foo = 10.01;
			foo ^= 0;
		`,

		// With comments
		'const foo = /* first comment */ 3.4 | 0; // A B C',
		'const foo = /* first comment */ ~~3.4; // A B C',
		outdent`
			const foo = {a: {b: 3.4}};
			foo /* Comment 1 */ .a /* Comment 2 */ . /* Comment 3 */ b |= /* Comment 4 */ 0 /* Comment 5 */;
		`,
		outdent`
			const foo = {a: {b: 3.4}};
			const bar = /* Comment 1 */ ~~ a /* Comment 3 */ . /* Comment 4 */ b /* Comment 5 */;
		`,
		'const foo = /* will keep */ 3.4 /* will remove 1 */ | /* will remove 2 */ 0;',
		'const foo = /* will keep */ ~ /* will remove 1 */ ~ /* will remove 2 */ 3.4;',
		outdent`
			const foo = 3.4; // comment 1
			foo |= 0; // comment 2
		`,
		outdent`
			const foo = 3.4; // comment 1
			const bar = ~~foo; // comment 2
		`,

		// Multiple errors
		'const foo = ~~bar | 0;',
		'const foo = ~~(bar| 0);',
		'const foo = bar | 0 | 0;',
		'const foo = ~~~~((bar | 0 | 0) >> 0 >> 0 << 0 << 0 ^ 0 ^0);',

		// Left-hand side has side effect
		outdent`
			const foo = Array.from({length: 10}, (_, index) => (index + 1) + (index + 1) /100);
			let i = 0;
			while (i < foo.length) {
				foo[i++] |= 0;
			}
			console.log(foo);
		`,
	],
});
