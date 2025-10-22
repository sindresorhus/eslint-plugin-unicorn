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
		outdent`
			const {array} = [1, 2];
			array.push(3, 4);
		`,
		outdent`
			const [array] = [1, 2];
			array.push(3, 4);
		`,
		outdent`
			let [array] = [1, 2];
			array.push(3, 4);
		`,
		outdent`
			const foo = [1, 2];
			bar.push(3, 4);
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
			${' \t'.repeat(5)}array.push(3, 4);${' \t'.repeat(5)}
			foo()
		`,
		outdent`
			const array = [1, 2];
			${' \t'.repeat(5)}array.push(3, 4);${' \t'.repeat(5)}
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
		outdent`
			const array = [1, 2];
			array.push(
				3,
				4,
			);
		`,
	],
});

// Object
test.snapshot({
	valid: [
		outdent`
			const object = [];
			object.bar = 2;
		`,
		outdent`
			const [object] = {foo: 1};
			object.bar = 2;
		`,
		outdent`
			const {object} = {foo: 1};
			object.bar = 2;
		`,
		outdent`
			const object = {foo: 1};
			object.bar += 2;
		`,
		outdent`
			const object = {foo: 1};
			object.bar = object.baz = 2;
		`,
		outdent`
			const foo = {};
			bar.bar = 2;
		`,
	],
	invalid: [
		outdent`
			const object = {foo: 1};
			object.bar = 2;
		`,
		outdent`
			const object = {foo: 1};
			object[bar] = 2;
		`,
		outdent`
			const object = {foo: 1};
			object[(( 0, bar ))] = (( baz ));
		`,
		outdent`
			const object = {};
			object.bar = 2;
		`,
		outdent`
			const object = {foo: 1,};
			object.bar = 2;
		`,
		outdent`
			const otherVariable = 1,
				object = {foo: 1};
			object.bar = 2;
		`,
		outdent`
			const object = {foo: 1};
			${' \t'.repeat(5)}object.bar = 2;${' \t'.repeat(5)}
			foo()
		`,
		outdent`
			const object = {foo: 1};
			${' \t'.repeat(5)}object.bar = 2;${' \t'.repeat(5)}
		`,
		outdent`
			const object = {foo: 1};
			object.bar = 2; // comment
		`,
		outdent`
			const object = {foo: 1};
			object.bar = 2;
			object.baz = 2;
		`,
		outdent`
			const object = {foo: 1};
			object.bar = anotherObject.baz = 2;
		`,
	],
});
