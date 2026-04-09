import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'new array.map(fn);',
		'map(fn);',
		'array.notMap(fn);',
		'array[map](fn);',
		'const mapped = array.map(fn);',
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
		'let text; text = \'text\'; text.slice(1);',
		'String(foo).slice(1);',
		'const text = String(foo); text.slice(1);',
		'const text = String(foo); const alias = text; alias.slice(1);',
		'const {value = String(foo)} = {}; value.slice(1);',
		'function run(text = String(foo)) { text.slice(1); }',
		'new Set(iterable).values();',
		'let set = new Set(iterable); set.values();',
		'const set = new Set(iterable); const alias = set; alias.values();',
		'const [set] = [new Set(iterable)]; set.values();',
		'const value = undefined; value.slice(1);',
		'function log(url) { url.toString(); }',
		'function log(url) { url.toLocaleString(); }',
		outdent`
			const collection = new Foo();
			collection.slice(1);
		`,
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
		outdent`
			let values = 'x';
			values = [];
			values.slice(1);
		`,
		'let values = []; if (condition) values = \'x\'; values.map(fn);',
		outdent`
			let text = 'x';

			if (condition) {
				text = [];
			}

			text.slice(1);
		`,
		'let text = \'x\'; if (condition) text = []; text.slice(1);',
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
	],
	invalid: [
		'array.map(fn);',
		'array?.map(fn);',
		'array.map?.(fn);',
		'array["map"](fn);',
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
		'array.values();',
		'array.with(0, value);',
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
	],
});

test.typescript({
	valid: [],
	invalid: [
		{code: 'values.map(fn) as number[];', filename: 'example.ts', errors: 1},
		{code: '<number[]>values.map(fn);', filename: 'example.ts', errors: 1},
		{code: 'values.map(fn)!;', filename: 'example.ts', errors: 1},
		{code: 'values.map(fn) satisfies Foo;', filename: 'example.ts', errors: 1},
	],
});
