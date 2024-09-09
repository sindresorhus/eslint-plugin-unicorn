import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Skip checking if indexOf() method is not a method call from a object
		outdent`
			const index = indexOf('bar');

			if (index > -1) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (index === -1) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (-1 === index) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (index !== -1) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (-1 !== index) {}
		`,
		// Variable index is not from indexOf
		outdent`
			const index = 0;

			if (index < 0) {}
		`,
		// If index is not declared via VariableDeclarator, it will not be check here.
		outdent`
			function foo (index) {
				if (index < 0) {}
			}
		`,
		// Since the variable is references from function parameter, it will not be checked here
		outdent`
			const index = foo.indexOf('bar');

			function foo (index) {
				if (index < 0) {}
			}
		`,
		// To prevent false positives, it will not check if the index is not declared via const
		outdent`
			let index = foo.indexOf("bar");

			index < 0
		`,
		// To prevent false positives, it will not check if the index is not declared via const
		outdent`
			var index = foo.indexOf("bar");

			index < 0
		`,
		// To prevent false positives, it will not check if the index is not declared via const
		outdent`
			let index;

			// do stuff

			index = arr.findLastIndex(element => element > 10);

			index < 0;
		`,
		'const indexOf = "indexOf"; const index = foo[indexOf](foo); index < 0;',
		'const index = foo.indexOf?.(foo); index < 0;',
		'const index = foo?.indexOf(foo); index < 0;',
	],
	invalid: [
		...[
			'index < 0',
			'index >= 0',
			'index > -1',
		].map(code => `const index = foo.indexOf(bar); ${code}`),
		...[
			'foo.indexOf(bar)',
			'foo.lastIndexOf(bar)',
			'foo.findIndex(bar)',
			'foo.findLastIndex(bar)',
		].map(code => `const index = ${code}; index < 0`),
		// It will search the scope chain for 'index' and find the 'index' variable declared above.
		outdent`
			const index = foo.indexOf(bar);

			function foo () {
				if (index < 0) {}
			}
		`,
		outdent`
			const index1 = foo.indexOf("1"),
				index2 = foo.indexOf("2");
			index1 < 0;
			index2 >= 0;
		`,
		outdent`
			const index = foo.indexOf('1');
			((
				/* comment 1 */
				((
					/* comment 2 */
					index
					/* comment 3 */
				))
				/* comment 4 */
				<
				/* comment 5 */
				((
					/* comment 6 */
					0
					/* comment 7 */
				))
				/* comment 8 */
			));
		`,
		outdent`
			const index = foo.indexOf('1');
			((
				/* comment 1 */
				((
					/* comment 2 */
					index
					/* comment 3 */
				))
				/* comment 4 */
				>
				((
					/* comment 5 */
					- /* comment 6 */ (( /* comment 7 */ 1 /* comment 8 */ ))
					/* comment 9 */
				))
			));
		`,
		'const index = _.indexOf([1, 2, 1, 2], 2); index < 0;',
	],
});
