import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

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
		outdent`
			let array;
			array.push(3, 4);
		`,
		outdent`
			const array = foo;
			array.push(3, 4);
		`,
		outdent`
			const array = [1, 2];
			array.push?.(3, 4);
		`,
		outdent`
			const array = [1, 2];
			array?.push(3, 4);
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
		outdent`
			const array = [1, 2];
			array.push(((array) => foo(array.length))());
		`,
		outdent`
			let array= [1, 2];
			array.push(3, 4);
		`,
		outdent`
			var array = [1, 2];
			array.push(3, 4);
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
			const array = [1]
			array.push(2);
			array.push(3);
			[0].map()
		`,
		outdent`
			const array = [1]
			array.push(2);
			array.push(3);
			notNeeded.map()
		`,
		outdent`
			if(1) {
				const array = [1]
				array.push(2);
				[0].map()
			}
		`,
	],
});

// `Object` + `AssignmentExpression`
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
		outdent`
			var object;
			object.bar = 2;
		`,
		outdent`
			const object = foo;
			object.bar = 2;
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
			const object = {foo: 1}
			object.bar = 2
			;notNeeded.map()
		`,
	],
});

// `Object` + `Object.assign()`
test.snapshot({
	valid: [
		outdent`
			const object = [];
			Object.assign(object, bar);
		`,
		outdent`
			const [object] = {foo: 1};
			Object.assign(object, bar);
		`,
		outdent`
			const {object} = {foo: 1};
			Object.assign(object, bar);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign?.(object, bar);
		`,
		outdent`
			const object = {foo: 1};
			Object?.assign(object, bar);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign();
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(...object);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, ...spread);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, ...spread, bar);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, ...bar);
		`,
		outdent`
			const object = {foo: 1};
			NotObject.notAssign(object, bar);
		`,
		outdent`
			const foo = {foo: 1};
			Object.assign(bar, bar);
		`,
		outdent`
			let object;
			Object.assign(object, bar);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, object.foo);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, {baz(){return object}});
		`,
	],
	invalid: [
		outdent`
			const object = {foo: 1};
			Object.assign(object, bar);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, {bar: 2});
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, {bar, baz,});
		`,
		outdent`
			const object = {foo: 1,};
			Object.assign(object, {bar, baz,});
		`,
		outdent`
			const object = {};
			Object.assign(object, {bar, baz,});
		`,
		outdent`
			const object = {};
			Object.assign(object, {});
		`,
		outdent`
			const object = {};
			Object.assign((( object )), (( 0, bar)));
		`,
		outdent`
			const object = {};
			Object.assign((( object )), (( {bar: 2} )));
		`,
		outdent`
			const otherVariable = 1,
				object = {foo: 1};
			Object.assign(object, bar);
		`,
		outdent`
			const object = {foo: 1};
			${' \t'.repeat(5)}Object.assign(object, bar)${' \t'.repeat(5)}
			foo()
		`,
		outdent`
			const object = {foo: 1};
			${' \t'.repeat(5)}Object.assign(object, bar)${' \t'.repeat(5)}
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, bar) // comment
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, bar)
			Object.assign(object, {baz})
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, {baz(object){return object}})
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, bar());
		`,
		outdent`
			let object = {foo: 1};
			Object.assign(object, bar);
		`,
		outdent`
			var object = {foo: 1};
			Object.assign(object, bar);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, bar, baz);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, {}, baz);
		`,
		outdent`
			const object = {foo: 1};
			Object.assign(object, bar, ...baz, {bar: 2});
		`,
		// ASI
		outdent`
			const object = {foo: 1}
			Object.assign(object, bar)
			;[0].map()
		`,
		outdent`
			const object = {foo: 1}
			Object.assign(object, bar)
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
		outdent`
			let set;
			set.add(3);
		`,
		outdent`
			const set = foo;
			set.add(3);
		`,
		outdent`
			const set = new Set([1, 2]);
			set.add?.(3);
		`,
		outdent`
			const set = new Set([1, 2]);
			set?.add(3);
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
		outdent`
			let set = new Set([1, 2]);
			set.add(3);
		`,
		outdent`
			var set = new Set([1, 2]);
			set.add(3);
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

// `Map` and `WeakMap`
test.snapshot({
	valid: [
		outdent`
			const map = new Map([["foo", 1]]);
			map.notSet("bar", 2);
		`,
		outdent`
			const map = new NotMap([["foo", 1]]);
			map.set("bar", 2);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			; // Not next to each other
			map.set("bar", 2);
		`,
		outdent`
			const map = new Map([["foo", 1]]),
				otherVariable = 1;
			map.set("bar", 2);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set();
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set("bar");
		`,

		outdent`
			const map = new Map([["foo", 1]]);
			map.set("bar", 2, extraArgument);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set(..."bar", ..."2");
		`,
		outdent`
			const {map} = new Map([["foo", 1]]);
			map.set("bar", 2);
		`,
		outdent`
			const [map] = new Map([["foo", 1]]);
			map.set("bar", 2);
		`,
		outdent`
			const foo = new Map([["foo", 1]]);
			bar.set("bar", 2);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set(map.size, 2);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set("bar", map.size);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set("bar", ((foo) => foo(map.size))());
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set(((foo) => foo(map.size))(), 2);
		`,
		outdent`
			let map;
			map.set("bar", 2);
		`,
		outdent`
			const map = foo;
			map.set("bar", 2);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set?.("bar", 2);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map?.set("bar", 2);
		`,
	],
	invalid: [
		outdent`
			const map = new Map([["foo", 1]]);
			map.set("bar", 2);
		`,
		outdent`
			const weakMap = new WeakMap([[foo, 1]]);
			weakMap.set(bar, 2);
		`,
		outdent`
			const map = new Map([]);
			map.set("bar", 2);
		`,
		outdent`
			const map = new Map();
			map.set("bar", 2);
		`,
		outdent`
			const map = new Map;
			map.set("bar", 2);
		`,
		outdent`
			const map = (( new Map ));
			map.set("bar", 2);
		`,
		outdent`
			const map = new (( Map ));
			map.set("bar", 2);
		`,
		outdent`
			const otherVariable = 1,
				map = new Map;
			map.set("bar", 2);
		`,
		outdent`
			const map = new Map([["foo",1]]);
			map.set( ((0, "bar")), ((0, 2)), );
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			${' \t'.repeat(5)}map.set("bar", 2);${' \t'.repeat(5)}
			foo()
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			${' \t'.repeat(5)}map.set("bar", 2);${' \t'.repeat(5)}
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set("bar", 2); // comment
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set("bar", foo());
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map.set(bar(), 2);
		`,
		outdent`
			const map = new Map([["foo", 1]]);
			map
				.set(
					"bar",
					2,
			);
		`,
		outdent`
			let map = new Map([["foo", 1]]);
			map.set("bar", 2);
		`,
		outdent`
			var map = new Map([["foo", 1]]);
			map.set("bar", 2);
		`,
		// ASI
		outdent`
			const map = new Map([["foo", 1]])
			map.set("bar", 2);
			[0].map()
		`,
		outdent`
			const map = new Map([["foo", 1]])
			map.set("bar", 2);
			notNeeded.map()
		`,
		outdent`
			const map = new Map
			map.set("bar", 2);
			[0].map()
		`,
		outdent`
			const map = new Map
			map.set("bar", 2);
			notNeeded.map()
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [],
	invalid: [
		// https://github.com/microsoft/vscode/blob/edf4ea5879f5e15302ac4923cebd1d444ee35f7e/extensions/ipynb/src/deserializers.ts#L258C1-L259C67
		outdent`
			const cellOutputMappers = new Map<nbformat.OutputType, (output: any) => NotebookCellOutput>();
			cellOutputMappers.set('display_data', translateDisplayDataOutput);
		`,
		outdent`
			const cellOutputMappers = new Map<nbformat.OutputType, (output: any) => NotebookCellOutput>([]);
			cellOutputMappers.set('display_data', translateDisplayDataOutput);
		`,
		outdent`
			const cellOutputMappers = new Map<nbformat.OutputType, (output: any) => NotebookCellOutput>;
			cellOutputMappers.set('display_data', translateDisplayDataOutput);
		`,
	],
});
