import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// `Array`
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
		outdent`
			const array = [1, 2];
			array.push(array[0]);
		`,
		outdent`
			const array = [1, 2];
			array.push(((foo) => foo(array.length))());
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
		// ASI
		outdent`
			const array = [1]
			array.push(2);
			[0].map()
		`,
		outdent`
			const array = [1]
			array.push(2);
			notNeeded.map()
		`,
		outdent`
			const array = [1, 2];
			array.push(((array) => foo(array.length))());
		`,
	],
});

// `Object`
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
		outdent`
			const object = {foo: 1};
			anotherObject.baz = object.bar = 2;
		`,
		outdent`
			const object = {foo: 1};
			object[object.foo] = 2;
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
		outdent`
			const object = {foo: 1};
			object.bar = (object) => object.foo;
		`,
		outdent`
			const object = {foo: 1};
			object.object = 2;
		`,
		// ASI
		outdent`
			const object = {foo: 1}
			object.bar = 2
			;[0].map()
		`,
		outdent`
			const array = [1]
			array.push(2)
			;notNeeded.map()
		`,
	],
});

// `Set` and `WeakSet`
test.snapshot({
	valid: [
		outdent`
			const set = new Set([1, 2]);
			set.notAdd(3);
		`,
		outdent`
			const set = new NotSet([1, 2]);
			set.notAdd(3);
		`,
		outdent`
			const set = new Set([1, 2]);
			; // Not next to each other
			set.add(3);
		`,
		outdent`
			const set = new Set([1, 2]),
				otherVariable = 1;
			set.add(3);
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add();
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add(3, 4);
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add(...bar);
		`,
		outdent`
			const {set} = new Set([1, 2]);
			set.add(3);
		`,
		outdent`
			const [set] = new Set([1, 2]);
			set.add(3);
		`,
		outdent`
			let set = new Set([1, 2]);
			set.add(3);
		`,
		outdent`
			const foo = new Set([1, 2]);
			bar.add(3);
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add(set.size);
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add(((foo) => foo(set.size))());
		`,
	],
	invalid: [
		outdent`
			const set = new Set([1, 2]);
			set.add(3);
		`,
		outdent`
			const weakSet = new WeakSet([a, b]);
			weakSet.add(c);
		`,
		outdent`
			const set = new Set([]);
			set.add(3);
		`,
		outdent`
			const set = new Set();
			set.add(3);
		`,
		outdent`
			const set = new Set;
			set.add(3);
		`,
		outdent`
			const set = (( new Set ));
			set.add(3);
		`,
		outdent`
			const set = new (( Set ));
			set.add(3);
		`,
		outdent`
			const otherVariable = 1,
				set = new Set;
			set.add(3);
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add( ((0, 3)), );
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add?.(3);
		`,
		outdent`
			const set = new Set([1, 2]);
			set?.add(3);
		`,
		outdent`
			const set = new Set([1, 2]);
			${' \t'.repeat(5)}set.add(3);${' \t'.repeat(5)}
			foo()
		`,
		outdent`
			const set = new Set([1, 2]);
			${' \t'.repeat(5)}set.add(3);${' \t'.repeat(5)}
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add(3); // comment
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add(foo());
		`,
		outdent`
			const set = new Set([1, 2]);
			set
				.add(
					3,
			);
		`,
		// ASI
		outdent`
			const set = new Set([1, 2])
			set.add(3);
			[0].map()
		`,
		outdent`
			const set = new Set([1, 2])
			set.add(3);
			notNeeded.map()
		`,
		outdent`
			const set = new Set
			set.add(3);
			[0].map()
		`,
		outdent`
			const set = new Set
			set.add(3);
			notNeeded.map()
		`,
	],
});
