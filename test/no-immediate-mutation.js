import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Conditional mutations
test.snapshot({
	valid: [
		'const array = []; if (enabled) { array.push(1); other(); }',
		'const array = []; if (enabled) { if (other) { array.push(1); } }',
		'const array = []; if (enabled) { array.push(1); } else if (other) { array.push(2); }',
		'const array = []; if (enabled) { array.push(1); } else { array.unshift(2); }',
		'const array = []; if (enabled) { array.push(1); } else { other.push(2); }',
		'const array = []; if (array.length) { array.push(1); }',
		'const array = []; if (enabled) { array.push(array.length); }',
		'const array = []; enabled || array.push(1);',
		'const array = []; enabled ?? array.push(1);',
		'const array = []; consume(enabled && array.push(1));',
		'const object = {}; if (enabled) { Object.assign(object, first, second); }',
		'const object = {}; if (enabled) { object.foo = 1; } else { Object.assign(object, source); }',
		'const array = []; if (enabled) {} else { array.push(1); }',
		'const array = []; if (enabled) { array.push(1); } else {}',
		'const array = []; if (enabled) { array.push(1); } else { other(); }',
		'const array = []; enabled && (other && array.push(1));',
		'const array = []; enabled ? array.push(1) : other && array.push(2);',
		'const array = []; array.length ? array.push(1) : array.push(2);',
		'const array = []; enabled ? array.push(1) : array.push(array.length);',
		'const array = []; if (enabled) { array.push(); }',
		'const array = []; enabled && array?.push(1);',
		'const array = []; enabled && array.push?.(1);',
		'const array = []; enabled && array[method](1);',
		'const array = []; other(); if (enabled) { array.push(1); }',
		'const array = [], other = 1; if (enabled) { array.push(1); }',
		'const object = {}; if (enabled) { object[object.key] = 1; }',
		'const object = {}; if (enabled) { object.foo += 1; }',
		'class Foo { #field; method() { const object = {}; if (enabled) { object.#field = value; } } }',
		'const object = {}; enabled && Object.assign(object, object.foo);',
		'const set = new Set(source); enabled && set.add(value);',
		'const set = new Set(); enabled && set.add(set);',
		'const map = new Map(); enabled && map.set(key, map);',
		'const map = new Map(); enabled && map.set(map, value);',
	],
	invalid: [
		'const array = [1, 2]; if (Math.random()) { array.push(3, 4); }',
		'const object = {foo: 1}; if (Math.random()) { object.bar = 2; } else { object.baz = 3; }',
		'const array = [1]; enabled && array.push(2);',
		'const array = [1]; enabled ? array.push(2) : array.push(3);',
		'const array = [1]; if (enabled) { array.unshift(2); } else { array.unshift(3); }',
		'const object = {}; if (enabled) { Object.assign(object, source); } else { Object.assign(object, {foo: 1}); }',
		'const set = new Set(); if (enabled) { set.add(value); }',
		'const set = new WeakSet; enabled && set.add(value);',
		'const map = new Map([]); enabled ? map.set(key, first) : map.set(key, second);',
		'const map = new WeakMap([[first, value]]); if (enabled) { map.set(second, value); }',
		'const array = []; if (enabled) array.push(1);',
		'const array = []; if (enabled) array.push(1); else array.push(2);',
		'let array; array = [1]; if (enabled) { array.push(2); }',
		'const other = 1, array = []; enabled && array.push(2);',
		'const array = [1,]; if (enabled) { array.push(...values, last,); }',
		'const array = []; if (enabled) { array.unshift(...values); }',
		'const array = [initial()]; if (enabled) { array.unshift(value); }',
		'const array = [initial()]; if (enabled) { array.push(value); }',
		'const array = []; if (enabled) { array.push(first()); } else { array.push(second()); }',
		'const array = []; enabled ? array.push(value) : array.push(getValue());',
		'const array = []; ((enabled && ((array).push((first, second)))));',
		'const array = []; if ((first, second)) { array.push(value); }',
		'const array = []; if (first ? second : third) { array.push(value); }',
		'const array = []; if (enabled = getEnabled()) { array.push(value); }',
		'const object = {foo: 1,}; if (enabled) { object[key] = value; }',
		'const object = {}; if (enabled) { object[getKey()] = value; }',
		'const object = {}; enabled ? object.foo = value : object.bar = getValue();',
		'const object = {}; enabled && (object[key] = (first, second));',
		'const object = {}; enabled ? object.foo = value : object.__proto__ = prototype;',
		'const object = {}; if (enabled) { object["__proto__"] = prototype; }',
		'const object = {}; if (enabled) { Object.assign(object, {foo: 1,}); }',
		'const object = {}; if (enabled) { Object.assign(object, {["__proto__"]: prototype}); }',
		'const key = "__proto__", object = {}; if (enabled) { Object.assign(object, {[key]: prototype}); }',
		'const object = {}; enabled && Object.assign(object, getSource());',
		'const object = {}; enabled && Object.assign(object, (first, second));',
		'const set = new Set([initial]); enabled ? set.add(first) : set.add(second);',
		'const set = ((new ((Set)))); enabled && set.add(value);',
		'const set = new Set(); enabled && set.add(getValue());',
		'const map = new Map; enabled && map.set((first, second), value);',
		'const map = new Map(); if (enabled) { map.set(getKey(), value); }',
		'async function run() { const array = []; if (await enabled) { array.push(await value); } }',
		'function * generate() { const array = []; if (enabled) { array.push(yield value); } }',
		'const array = []; if (enabled) { /* Keep this comment. */ array.push(value); }',
		'const array = []; if (/* Keep this comment. */ enabled) { array.push(value); }',
		'const array = []; enabled && array.push(/* Keep this comment. */ value);',
		'const array = []; if (enabled) { array.push(value); } // Keep this comment.',
		'const array = []; /* Keep this comment. */ if (enabled) { array.push(value); }',
		'const array = []; enabled && array.push(value); // Keep this comment.',
		outdent`
			const array = [];
			if (enabled) {
				array.push(value);
			}
			// Keep this comment with the following statement.
			consume(array);
		`,
		outdent`
			const array = []
			if (enabled) { array.push(value); }
			[1].map(callback)
		`,
		outdent`
			let array
			array = []
			if (enabled) { array.push(value); } else { array.push(other); }
			(functionCall)()
		`,
		outdent`
			const array = []
			if (enabled) array.push(value)
			;[1].map(callback)
		`,
		outdent`
			const array = []
			enabled && array.push(value);
			[1].map(callback)
		`,
		outdent`
			const map = new Map
			if (enabled) { map.set(key, value); }
			[1].map(callback)
		`,
		'const array = [[...iterable]]; if (enabled) { array.unshift(value); }',
		'const array = [enabled]; if (true) { array.unshift(...iterable); }',
		{
			code: outdent`
				const array = []
				if (enabled) { array.push(value); }
				<Component />
			`,
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'const key = "__proto__", object = {}; if (enabled) { object[key] = prototype; }',
		{
			code: 'const map = new Map<string, number>(); enabled && map.set(key, value);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const set = new Set<number>; if (enabled) { set.add(value as number); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const array: number[] = []; if (enabled!) { array.push(value satisfies number); }',
			languageOptions: {parser: parsers.typescript},
		},
		// Conditional spreads lose contextual typing in TypeScript, so only report.
		{
			code: 'const array: ("foo" | "bar")[] = []; if (enabled) { array.push("foo"); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const callbacks: ((value: number) => number)[] = []; enabled && callbacks.push(value => value);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const set = new Set<"foo" | "bar">(); enabled ? set.add("foo") : set.add("bar");',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object: Record<string, (value: number) => number> = {}; if (enabled) { object.foo = value => value; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const map = new Map(); enabled && map.set("key", 1);',
			filename: 'example.ts',
		},
		{
			code: 'const array = []; if (getEnabled()) { array.push(value); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

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
		outdent`
			let array;
			array ??= [1, 2];
			array.push(3, 4);
		`,
		outdent`
			let foo;
			foo = [1, 2];
			bar.push(3, 4);
		`,
		// Not supported yet
		outdent`
			let foo, bar;
			foo = bar = [1, 2];
			bar.push(3, 4);
		`,
		outdent`
			const foo = new Foo();
			foo.bar = [1, 2];
			foo.bar.push(3, 4);
		`,
	],
	invalid: [
		outdent`
			const array = [1, 2];
			array.push(3, 4);
		`,
		outdent`
			let array;
			array = [1, 2];
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
			;(( array.push(2) ))
			;[0].map()
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
		outdent`
			let array
			array = [1, 2]
			array.push(3, 4)
			;[0].map()
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
		outdent`
			let object;
			object ??= {foo: 1};
			object.bar = 2;
		`,
		outdent`
			let foo;
			foo = {foo: 1};
			bar.bar = 2;
		`,
		// Not supported yet
		outdent`
			let foo, bar;
			foo = bar = {foo: 1};
			bar.bar = 2;
		`,
		outdent`
			const foo = new Foo();
			foo.bar = {foo: 1};
			foo.bar.bar = 2;
		`,
	],
	invalid: [
		outdent`
			const object = {foo: 1};
			object.bar = 2;
		`,
		outdent`
			let object;
			object = {foo: 1};
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
		// Computed key with a side effect: suggestion only (no autofix)
		outdent`
			const object = {};
			object[getKey()] = 'value';
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
		outdent`
			let object
			object = {foo: 1}
			object.bar = 2
			;[0].map()
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
		outdent`
			let object;
			object ??= {foo: 1};
			Object.assign(object, bar);
		`,
		outdent`
			let foo;
			foo = {foo: 1};
			bar.assign(object, baz);
		`,
		// Not supported yet
		outdent`
			let foo, bar;
			foo = bar = {foo: 1};
			Object.assign(bar, baz);
		`,
		outdent`
			const foo = new Foo();
			foo.bar = {foo: 1};
			Object.assign(foo.bar, baz);
		`,
	],
	invalid: [
		outdent`
			const object = {foo: 1};
			Object.assign(object, bar);
		`,
		outdent`
			let object;
			object = {foo: 1};
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
		outdent`
			let object
			object = {foo: 1}
			Object.assign(object, bar)
			;[0].map()
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
		outdent`
			let set;
			set ??= new Set([1, 2]);
			set.add(3);
		`,
		outdent`
			let foo;
			foo ??= new Set([1, 2]);
			bar.add(3);
		`,
		// Not supported yet
		outdent`
			let foo, bar;
			foo = bar = new Set([1, 2]);
			bar.add(3);
		`,
		outdent`
			const foo = new Foo();
			foo.bar = new Set([1, 2]);
			foo.bar.add(3);
		`,
	],
	invalid: [
		outdent`
			const set = new Set([1, 2]);
			set.add(3);
		`,
		outdent`
			let set;
			set = new Set([1, 2]);
			set.add(3);
		`,
		outdent`
			const weakSet = new WeakSet([a, b]);
			weakSet.add(c);
		`,
		// `WeakSet` without parentheses
		outdent`
			const weakSet = new WeakSet;
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
		outdent`
			let set
			set = new Set([1, 2])
			set.add(3)
			;[0].map()
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
		outdent`
			let map;
			map ??= new Map([["foo", 1]]);
			map.set("bar", 2);
		`,
		outdent`
			let foo;
			foo = new Map([["foo", 1]]);
			bar.set("bar", 2);
		`,
		// Not supported yet
		outdent`
			let foo, bar;
			foo = bar = new Map([["foo", 1]]);
			bar.set("bar", 2);
		`,
		outdent`
			const foo = new Foo();
			foo.bar = new Map([["foo", 1]]);
			foo.bar.set("bar", 2);
		`,
	],
	invalid: [
		outdent`
			const map = new Map([["foo", 1]]);
			map.set("bar", 2);
		`,
		outdent`
			let map;
			map = new Map([["foo", 1]]);
			map.set("bar", 2);
		`,
		outdent`
			const weakMap = new WeakMap([[foo, 1]]);
			weakMap.set(bar, 2);
		`,
		// `WeakMap` without parentheses
		outdent`
			const weakMap = new WeakMap;
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
		outdent`
			let map
			map = new Map([["foo", 1]])
			map.set("bar", 2)
			;[0].map()
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
			const cellOutputMappers = new Map<OutputType, (output: any) => NotebookCellOutput>();
			cellOutputMappers.set('display_data', translateDisplayDataOutput);
		`,
		outdent`
			const cellOutputMappers = new Map<OutputType, (output: any) => NotebookCellOutput>([]);
			cellOutputMappers.set('display_data', translateDisplayDataOutput);
		`,
		outdent`
			const cellOutputMappers = new Map<OutputType, (output: any) => NotebookCellOutput>;
			cellOutputMappers.set('display_data', translateDisplayDataOutput);
		`,
	],
});
