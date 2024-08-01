import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'array[1] = "change";',
		'array.reverse("extra parameters");',
		outdent`
			const object = {};
			object[1] = 'changed';
		`,
		outdent`
			function foo(array) {
				array[1] = 'changed';
			}
		`,
	],
	invalid: [
		'array.reverse();',
		'array.sort((a, b) => b - a);',
		'array.splice();',
		'array.splice(0, 1);',

		'[].reverse();',
		'new Array().reverse() ',
		'new Uint8Array().reverse() ',

		outdent`
			const array = [];
			array[1] = 'changed';
		`,
		outdent`
			const array = [1, 2, 3];
			const index = 0;
			array[index] = 'changed';
		`,
		outdent`
			const array = [1, 2, 3];
			array[foo.bar] = 'changed';
		`,
	],
});
