import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'map(fn);',
		'array.notMap(fn);',
		'array[map](fn);',
		'const mapped = array.map(fn);',
		'async function run() { const mapped = await array.map(fn); }',
		'function foo() { return array.filter(fn); }',
		'foo(array.flat());',
		'const joined = array.map(fn).join(",");',
		'void array.map(fn);',
		'array.forEach(fn);',
		'array.pop();',
		'array.push(value);',
		'array.reduce(fn, initialValue);',
		'array.splice(0, 1);',
		'"text".slice(1);',
		'"text".at(0);',
		'const text = "text"; text.slice(1);',
		'let text = "text"; text.slice(1);',
		outdent`
			let text = 'text';

			function mutate() {
				text = [];
			}

			text.slice(1);
		`,
		outdent`
			let text = 'text';
			text.slice(1);
			text = [];
		`,
		outdent`
			let value = [];

			mutate();

			function mutate() {
				value = 'x';
			}

			value.map(fn);
		`,
		outdent`
			let value = 'x';

			mutate();

			function mutate() {
				value = [];
			}

			value.map(fn);
		`,
		'let text = []; text = \'text\'; text.slice(1);',
		'function check(array) { array = \'text\'; array.includes(value); }',
		'let text; text = \'text\'; text.slice(1);',
		'String(foo).slice(1);',
		'Symbol(foo).slice(1);',
		'(prefix + value).includes(expected);',
		'const text = String(foo); text.slice(1);',
		'const symbol = Symbol(foo); symbol.slice(1);',
		'const text = String(foo); const alias = text; alias.slice(1);',
		'const {value = String(foo)} = {}; value.slice(1);',
		'function run(text = String(foo)) { text.slice(1); }',
		'new Set(iterable).values();',
		'let set = new Set(iterable); set.values();',
		'const set = new Set(iterable); const alias = set; alias.values();',
		'const [set] = [new Set(iterable)]; set.values();',
		'array.values();',
		'await database.insert(xProspects).values({value1: \'hello\'});',
		'await database.insert(xProspects).values({value1: \'hello\'}).where(eq(xProspects.id, 1));',
		'expect([1, 2, 3]).to.be.an(\'array\').that.includes(2);',
		'expect(value).includes(expected);',
		'expect.soft(value).includes(expected);',
		'expect.poll(callback).includes(expected);',
		'expect.element(element).includes(expected);',
		'const assertion = expect(value); assertion.includes(expected);',
		'expect(value).keys(expected);',
		'const value = undefined; value.slice(1);',
		'function log(url) { url.toString(); }',
		'function log(url) { url.toLocaleString(); }',
		outdent`
			const collection = new Foo();
			collection.slice(1);
		`,
		'const collection = new namespace.Foo(); collection.slice(1);',
		outdent`
			class Array {
				map() {}
			}

			new Array().map(fn);
		`,
		outdent`
			const value = {
				map() {},
			};
			value.map(fn);
		`,
		'const wrapper = {value: String(foo)}; wrapper.value.slice(1);',
		'const wrapper = {value: {map() {}}}; wrapper.value.map(fn);',
		'const wrapper = {items: []}; wrapper.items.map(fn);',
		'({items: []}).items.map(fn);',
		outdent`
			class Example {
				items = [];

				run() {
					this.items.map(fn);
				}
			}
		`,
		'Collection.map(fn);',
		outdent`
			let values = [];

			if (condition) {
				values = 'x';
			}

			values.map(fn);
		`,
		outdent`
			let values = 'x';
			values = 'y', values = [];
			values.map(fn);
		`,
		outdent`
			let other = [];
			other = [], other = 'x';
			other.map(fn);
		`,
		outdent`
			let values;
			values = [];
			values.map(fn);
		`,
		'let values; values.map(fn);',
		'for (const value of array) value.map(fn);',
		'for (const key in object) key.map(fn);',
		outdent`
			let values = 'x';
			values = [];
			values.slice(1);
		`,
		outdent`
			let text = 'x';

			if (condition) {
				text = [];
			}

			text.slice(1);
		`,
		outdent`
			condition && array.map(fn);
		`,
		outdent`
			ready || array.find(fn);
		`,
		outdent`
			const values = [];
			condition ? values.find(value => value > 0) : other();
		`,
		outdent`
			const values = [];
			values.map(value => value * 2), sideEffect();
		`,
		outdent`
			function run(array, value) {
				return array.map(fn), value;
			}
		`,
		outdent`
			if ((array.map(fn), condition)) {
				foo();
			}
		`,
		outdent`
			for (; condition; sideEffect(), values.map(fn)) {
				foo();
			}
		`,
		'for (; array.some(fn); update()) {}',
	],
	invalid: [
		'array.map(fn);',
		'array?.map(fn);',
		'array.map?.(fn);',
		'array["map"](fn);',
		'Array(1).map(fn);',
		'new Array(1).map(fn);',
		'array.at(0);',
		'array.slice?.(1);',
		'array.filter(fn);',
		'array.find(fn);',
		'array.findIndex(fn);',
		'array.findLast(fn);',
		'array.findLastIndex(fn);',
		'array.flat();',
		'array.flatMap(fn);',
		'array.includes(value);',
		'array.indexOf(value);',
		'array.join(",");',
		'array.keys();',
		'array.lastIndexOf(value);',
		'array.slice(1);',
		'array.some(fn);',
		'array.every(fn);',
		'array.entries();',
		'array.concat(otherArray);',
		'array.toSorted(compare);',
		'array.toReversed();',
		'array.toSpliced(0, 1);',
		'array.map(fn).join(",");',
		'[].values();',
		'const array = []; array.values();',
		'let array = []; array.values();',
		'Array(1).values();',
		'new Array(1).values();',
		'Array.from(iterable).values();',
		'[].with(0, value);',
		outdent`
			const values = [];
			values.map(value => value * 2);
		`,
		outdent`
			let values = [];
			values.map(value => value * 2);
		`,
		outdent`
			for (array.map(fn); condition; update()) {
				foo();
			}
		`,
		outdent`
			for (; condition; values.map(fn)) {
				foo();
			}
		`,
		outdent`
			async function run() {
				const values = [];
				await values.map(fn);
			}
		`,
		outdent`
			async function run() {
				const values = [];
				await values.map(async value => value);
			}
		`,
		'const values = []; const alias = values; alias.map(fn);',
		outdent`
			let ArrayLike = [];
			ArrayLike.map(fn);
		`,
		outdent`
			const values = getValues();
			values.slice(1);
		`,
		outdent`
			const values = getValues();
			values.findIndex(value => value > 0);
		`,
		'function check(array) { array.includes(value); }',
		'getValues().includes(value);',
		'expectation(value).includes(expected);',
		'expectation.soft(value).includes(expected);',
		'const assertion = expectation(value); assertion.includes(expected);',
		'expect.custom(value).includes(expected);',
		'function Symbol(value) { return value; } Symbol([]).slice(1);',
		'const method = "map"; array[method](fn);',
	],
});

test({
	valid: [
		{
			code: 'globalArray.values();',
			languageOptions: {globals: {globalArray: 'readonly'}},
		},
	],
	invalid: [
		{
			code: 'globalArray.map(fn);',
			languageOptions: {globals: {globalArray: 'readonly'}},
			errors: 1,
		},
	],
});

test.typescript({
	valid: [
		{
			code: outdent`
				declare const bar: Foo;
				bar.filter();
			`,
			filename: 'example.ts',
		},
		{code: '(bar as Foo).filter();', filename: 'example.ts'},
		{code: '(bar as Foo).values();', filename: 'example.ts'},
		{code: '(<Foo>bar).filter();', filename: 'example.ts'},
		{code: '(bar as any).filter();', filename: 'example.ts'},
		{code: '(bar as unknown).filter();', filename: 'example.ts'},
		{code: 'function check(collection: Collection) { collection.includes(value); }', filename: 'example.ts'},
		{code: 'const collection: Collection = getCollection(); collection.includes(value);', filename: 'example.ts'},
		{code: 'const collection: Collection = []; collection.values();', filename: 'example.ts'},
		{code: 'declare const collection: Collection; collection.values();', filename: 'example.ts'},
		{code: 'const mapped = values.map(fn) as number[];', filename: 'example.ts'},
		{code: 'type Array<T> = {filter(): void}; (bar as Array<string>).filter();', filename: 'example.ts'},
		// Non-array type shapes stay unresolved.
		{code: '(bar as Foo | Bar).filter();', filename: 'example.ts'},
		{code: '(bar as Foo & Bar).filter();', filename: 'example.ts'},
		{code: '(bar as {filter(): void}).filter();', filename: 'example.ts'},
		// A non-null assertion does not hide the underlying type assertion.
		{code: '(bar as Foo)!.filter();', filename: 'example.ts'},
		{code: 'const bar = \'x\'; (bar satisfies Foo).filter();', filename: 'example.ts'},
	],
	invalid: [
		{code: 'const array: string[] = getArray(); array.includes(value);', filename: 'example.ts', errors: 1},
		{code: 'const array: string[] = getArray(); array.values();', filename: 'example.ts', errors: 1},
		{code: 'declare const array: string[]; array.includes(value);', filename: 'example.ts', errors: 1},
		{code: 'declare const array: string[]; array.values();', filename: 'example.ts', errors: 1},
		{code: 'const array: string[] = getArray(); let alias = array; alias.values();', filename: 'example.ts', errors: 1},
		{code: 'function check(array: string[]) { array.includes(value); }', filename: 'example.ts', errors: 1},
		{code: 'function check(ArrayLike: string[]) { ArrayLike.includes(value); }', filename: 'example.ts', errors: 1},
		{code: 'function check(array: string[]) { array.values(); }', filename: 'example.ts', errors: 1},
		{code: 'type Items = string[]; (bar as Items).filter();', filename: 'example.ts', errors: 1},
		{code: '(bar as [number, string]).filter();', filename: 'example.ts', errors: 1},
		{code: '(bar as readonly [number, string]).filter();', filename: 'example.ts', errors: 1},
		{code: '([1, 2] as const).map(fn);', filename: 'example.ts', errors: 1},
		{code: 'values.map(fn) as number[];', filename: 'example.ts', errors: 1},
		{code: '<number[]>values.map(fn);', filename: 'example.ts', errors: 1},
		{code: 'values.map(fn)!;', filename: 'example.ts', errors: 1},
		{code: 'values.map(fn) satisfies Foo;', filename: 'example.ts', errors: 1},
		{code: '(bar as Foo[]).filter();', filename: 'example.ts', errors: 1},
		{code: '(bar as Foo[]).values();', filename: 'example.ts', errors: 1},
		{code: '(<Foo[]>bar).filter();', filename: 'example.ts', errors: 1},
		{code: '(bar as Array<Foo>).filter();', filename: 'example.ts', errors: 1},
		{code: '(<Array<Foo>>bar).filter();', filename: 'example.ts', errors: 1},
		{code: '(bar as string[]).filter();', filename: 'example.ts', errors: 1},
		{code: '(bar as ReadonlyArray<Foo>).filter();', filename: 'example.ts', errors: 1},
		{code: '(bar as readonly Foo[]).filter();', filename: 'example.ts', errors: 1},
		// Double assertion ending in an array type.
		{code: '(bar as unknown as Foo[]).filter();', filename: 'example.ts', errors: 1},
		// A non-null assertion does not hide the underlying array type assertion.
		{code: '(bar as Foo[])!.filter();', filename: 'example.ts', errors: 1},
		{code: '(values satisfies Foo[]).filter();', filename: 'example.ts', errors: 1},
	],
});

// Built-in receiver coverage is deliberately limited to direct values and simple bindings.
test.snapshot({
	valid: [
		'array.with(0, value);',
		'set.union(other);',
		'date.add({days: 1});',
		'new Set().add(value);',
		'new Date().setDate(1);',
		'const custom = {add() {}, with() {}}; custom.add(value); custom.with(value);',
		'const set = new Set(); const result = set.union(other);',
		'const set = new Set(); void set.union(other);',
		'const set = new Set(); false === set.isSubsetOf(other);',
		'const set = new Set(); set.isSubsetOf(other) === false;',
		'let set = new Set(); set = custom; set.union(other);',
		'const {set} = wrapper; set.union(other);',
		'const wrapper = {set: new Set()}; wrapper.set.union(other);',
		'function run(set = new Set()) { set.union(other); }',
		'const Constructor = Set; new Constructor().union(other);',
		'new Set().union(other).union(another);',
		'Temporal.PlainDate.from(value).add({days: 1}).add({days: 1});',
		'Temporal.Instant.from(value).with({seconds: 1});',
		'Temporal.PlainMonthDay.from(value).add({days: 1});',
		'Temporal.PlainMonthDay.from(value).subtract({days: 1});',
		'const date = Temporal.PlainDate.from(value); void date.add({days: 1});',
		'const date = Temporal.PlainDate.from(value); const next = date.with({day: 1});',
		'let date = Temporal.PlainDate.from(value); date = custom; date.add({days: 1});',
		'const date = Temporal.PlainDate.from(value); date[method]({days: 1});',
		'const date = Temporal.PlainDate.from(value); condition && date.add({days: 1});',
	],
	invalid: [
		...['union', 'intersection', 'difference', 'symmetricDifference', 'isSubsetOf', 'isSupersetOf', 'isDisjointFrom'].map(method => `new Set().${method}(other);`),
		'const set = new Set(); set.union(other);',
		'let set = new Set(); set.union(other);',
		'const set = new Set(); const alias = set; alias.union(other);',
		'const set = new Set(); (set)?.union?.(other);',
		'const set = new Set(); set["union"](other);',
		'const set = new Set(); const method = "union"; set[method](other);',
		'const set = new Set(); set.union(/* keep */ other);',
		'const set = new Set(); for (set.union(other); ; set.intersection(other)) {}',
		'const set = new Set(); await set.union(other);',
		'const date = Temporal.PlainDate.from(value); date.add({days: 1});',
		'let date = Temporal.PlainDate.from(value); const alias = date; alias.subtract({days: 1});',
		'const date = Temporal.PlainDate.from(value); date?.with?.({day: 1});',
		'const date = Temporal.PlainDate.from(value); date["add"]({days: 1});',
		'const date = Temporal.PlainDate.from(value); for (date.add({days: 1}); ; ) {}',
		'const array = []; array.with(0, value);',
	],
});

for (const [type, methods] of [
	['Instant', ['add', 'subtract']],
	['ZonedDateTime', ['add', 'subtract', 'with']],
	['PlainDate', ['add', 'subtract', 'with']],
	['PlainTime', ['add', 'subtract', 'with']],
	['PlainDateTime', ['add', 'subtract', 'with']],
	['PlainYearMonth', ['add', 'subtract', 'with']],
	['PlainMonthDay', ['with']],
	['Duration', ['add', 'subtract', 'with']],
]) {
	for (const method of methods) {
		test.snapshot({
			valid: [],
			invalid: [
				`new Temporal.${type}(...args).${method}(value);`,
				`Temporal.${type}.from(value).${method}(value);`,
			],
		});
		test.typescript({
			valid: [],
			invalid: [
				{code: `declare const value: Temporal.${type}; value.${method}(argument);`, errors: 1},
			],
		});
	}
}

test.typescript({
	valid: [
		'function run(value: Custom) { value.add(argument); value.with(argument); }',
		'let value: Temporal.PlainDate = date; value = other; value.add({days: 1});',
		'const value: Custom = Temporal.PlainDate.from(input); value.add(argument);',
		'(value as Custom).with(argument);',
		'function run(wrapper: {date: Temporal.PlainDate}) { wrapper.date.add({days: 1}); }',
	],
	invalid: [
		{code: 'function run(set: Set<number>) { set.union(other); }', errors: 1},
		{code: 'declare const set: ReadonlySet<number>; set.union(other);', errors: 1},
		{code: 'function run(date: Temporal.PlainDate) { date.add({days: 1}); }', errors: 1},
		{code: 'const date: Temporal.PlainDate = input; const alias = date; alias.with({day: 1});', errors: 1},
		{code: '(date as Temporal.PlainDate).add({days: 1});', errors: 1},
		{code: '(<Temporal.PlainDate>date).subtract({days: 1});', errors: 1},
		{code: '(date as Temporal.PlainDate)!.with({day: 1});', errors: 1},
		{code: 'const date = Temporal.PlainDate.from(input); (date satisfies Temporal.PlainDate).add({days: 1});', errors: 1},
		{code: 'const date = Temporal.PlainDate.from(input); date.add({days: 1}) as Temporal.PlainDate;', errors: 1},
		{code: 'function run(array: number[]) { array.with(0, 1); }', errors: 1},
		{code: '(value as number[]).with(0, 1);', errors: 1},
	],
});
