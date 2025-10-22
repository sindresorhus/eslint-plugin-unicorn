import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// Array
test.snapshot({
	valid: [
		outdent`
			const array = [1, 2];
			array.notPush(3, 4);
		`,
		outdent`
			const array = [1, 2];
			; // Not next to each other
			array.push(3, 4);
		`,
		outdent`
			const array = [1, 2],
				otherVariable = 1;
			array.push(3, 4);
		`,
		outdent`
			const array = [1, 2];
			array.push();
		`,
	],
	invalid: [
		outdent`
			const array = [1, 2];
			array.push(3, 4);
		`,
		outdent`
			const array = [3, 4];
			array.unshift(1, 2);
		`,
		outdent`
			const array = [];
			array.push(3, 4,);
		`,
		outdent`
			const array = [];
			array.unshift(1, 2,);
		`,
		outdent`
			const array = [1, 2,];
			array.push(3, 4);
		`,
		outdent`
			const array = [3, 4,];
			array.unshift(1, 2);
		`,
		outdent`
			const otherVariable = 1,
				array = [1, 2,];
			array.push(3, 4);
		`,
		outdent`
			const array = [1, 2];
			array.push( (( 0, 3 )), (( 0, 4 )) );
		`,
		outdent`
			const array = [1, 2];
			array.push?.(3, 4);
		`,
		outdent`
			const array = [1, 2];
			array?.push(3, 4);
		`,
		outdent`
			const array = [1, 2];
			array.push(3, 4); // comment
		`,
		outdent`
			const array = [1, 2];
			array.push(3, 4);
			array.unshift(1, 2);
		`,
		outdent`
			const array = [1, 2];
			array.push(...bar);
		`,
		outdent`
			const array = [1, 2];
			array.unshift(...bar);
		`,
		outdent`
			const array = [1, 2];
			array.unshift(foo());
		`,
		outdent`
			const array = [1, 2];
			array.unshift(...foo());
		`,
		outdent`
			const array = [1, 2];
			array.unshift([foo()]);
		`,
	],
});
