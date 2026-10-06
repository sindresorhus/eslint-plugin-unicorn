import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Array.from(iterable, mapFunction);',
		'Array.from(iterable, mapFunction).map(nextMapFunction);',
		'Array.from(iterable).filter(filterFunction);',
		'const Array = {from() {}}; Array.from(iterable).map(element => element);',
		'NotArray.from(iterable).map(mapFunction);',
		'Array[from](iterable).map(mapFunction);',
		'Array.from?.(iterable).map(mapFunction);',
		'Array?.from(iterable).map(mapFunction);',
		'Array.from(iterable)?.map(mapFunction);',
		'Array.from(iterable).map?.(mapFunction);',
		'Array.from(iterable).map(...argumentsArray);',
		'Array.from(iterable).map(mapFunction, thisArgument, extraArgument);',
		'Array.from(...iterable).map(mapFunction);',
		'Array.from(iterable, existingMapFunction).map(nextMapFunction);',
		'Array.from(iterable).map(mapFunction);',
		'Array.from(iterable).map(mapFunction, thisArgument);',
		'const mapFunction = (element, index, array) => array.includes(element); Array.from(iterable).map(mapFunction);',
		'Array.from(iterable).map(function (element) { return element.id; });',
		'Array.from(iterable).map(function (element, index) { return this.format(element, index); }, formatter);',
		'Array.from(iterable).map(function () { return arguments[2]; });',
		'Array.from(iterable).map((element, index, array) => element);',
		'Array.from(iterable).map((element, ...rest) => element);',
		'Array.from(iterable).map(function (element, index, array) { return element; });',
		'Array.from(iterable).map(function (element, ...rest) { return element; });',
		'Array.from(iterable).map(element => [element]).flat();',
		'Array.from(iterable).map(element => [element]).flat(1);',
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [existing];
			for (const element of iterable) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			foo();
			for (const element of iterable) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(transform(element));
				foo();
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(transform(element), other);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(transform(result, element));
			}
		`,
		outdent`
			const result = [];
			for (const element of getIterable(result)) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			for (const result of iterable) {
				result.push(transform(result));
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				if (element) {
					result.push(transform(element));
				}
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of iterable.entries()) {
				result[index] = transform(element);
			}
		`,
		outdent`
			function foo(Array) {
				const result = [];
				for (const element of iterable) {
					result.push(transform(element));
				}
			}
		`,
		outdent`
			async function foo() {
				const result = [];
				for (const element of iterable) {
					result.push(await transform(element));
				}
			}
		`,
		outdent`
			function * foo() {
				const result = [];
				for (const element of iterable) {
					result.push(yield transform(element));
				}
			}
		`,
		{
			code: 'Array.from(iterable).map<Result>(element => element);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'Array.from<string>(iterable).map(element => element.length);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		'var result = []; for (const element of iterable) { result.push(transform(element)); }',
		'const result = []; for (var element of iterable) { result.push(transform(element)); }',
		'const result = []; for (const {value} of iterable) { result.push(transform(value)); }',
		'const result = []; for (const [key, value] of map) { result.push(transform(key, value)); }',
		'async function foo() { const result = []; for (const element of iterable) { result.push(transform(await element)); } }',
		'async function foo() { const result = []; for (const element of iterable) { result.push((await element).value); } }',
	],
	invalid: [
		'Array.from(iterable).map(element => element.id);',
		'Array.from(iterable).map((element, index) => element + index);',
		'Array.from(iterable).map(element => element).filter(Boolean);',
		'Array.from(iterable,).map(element => element);',
		'(Array.from(iterable)).map(element => element);',
		'Array.from(iterable).map((element => element));',
		'Array.from(iterable).map((element => element), thisArgument);',
		'Array.from(/* source */ iterable).map(element => element);',
		'Array.from(iterable).map(/* callback */ element => element);',
		'Array.from(iterable) /* comment */ .map(element => element);',
		'Array.from(iterable).map(element => element /* comment */);',
		'Array.from(iterable).map(element => element, /* this */ thisArgument);',
		'Array.from(iterable).map(element => element /* comment */,);',
		'Array.from(iterable).map(element => element).flat(2);',
		outdent`
			const result = Array.from(iterable)
				.map(element => {
					return element.id;
				});
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable)
				result.push(transform(element));
		`,
		outdent`
			let result = [];
			for (const element of iterable) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			for (const element of (iterable)) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of iterable.entries()) {
				result.push(transform(element, index));
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of [foo, bar].entries()) {
				result.push(transform(element, index));
			}
		`,
		outdent`
			const result = [];
			for (const [index, element] of [foo, bar].entries()) {
				result[index] = transform(element);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(element.result);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push({value: element});
			}
		`,
		{
			code: outdent`
				const result: string[] = [];
				for (const element of iterable) {
					result.push(transform(element));
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				const result: Item[] = [];
				for (const element of iterable) {
					result.push({value: element} satisfies Item);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'Array.from(iterable).map((element: string) => element);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'Array.from(iterable).map((element: string, index: number): string => element + index);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		'const result = []; for (let element of iterable) { result.push(transform(element)); }',
		outdent`
			const result = [];
			// Keep this comment.
			for (const element of iterable) {
				result.push(transform(element));
			}
		`,
	],
});

// An exported declaration is not a statement of its own, the loop is still its next sibling
test.snapshot({
	valid: [],
	invalid: [
		'export const result = []; for (const element of iterable) { result.push(element * 2); }',
	],
});

// The rewrite edits the argument list of the `.map()` call, which its own parentheses wrap
test.snapshot({
	valid: [],
	invalid: [
		'const foo = (Array.from(bar).map)(element => element.id);',
		'const foo = ((Array.from(bar)).map)(element => element.id);',
	],
});

// A declaration in a `for` head is held by the `for` statement rather than listed beside one, so the `for…of` that follows belongs to that statement. Pairing the two made the fix replace the whole `for` head, producing `for (const r = Array.from(…);` which does not parse.
test.snapshot({
	valid: [
		'for (const r = []; 0;) {}\nfor (const x of [1, 2]) { r.push(x * 2) }\nconsole.log(r)',
		'if (0) { for (const r = []; 0;) {} }\nfor (const x of [1]) { r.push(x * 2) }\nconsole.log(r)',
	],
	invalid: [],
});

// A mapper body that starts with `{` or is a sequence needs parentheses, otherwise the arrow function body is parsed as a block
test.snapshot({
	valid: [],
	invalid: [
		outdent`
			const result = [];
			for (const item of items) {
				result.push({a: item}.a);
			}
		`,
		'const result = []; for (const item of items) { result.push({} + item); }',
		'const result = []; for (const item of items) { result.push((foo(), item)); }',
	],
});

// `await` and `yield` inside a nested function do not suspend the loop
test.snapshot({
	valid: [],
	invalid: [
		'const result = []; for (const item of items) { result.push(async () => await item); }',
	],
});

// A type-only `Array` binding does not shadow the global `Array` value
test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'import type {Array} from \'./types.js\';\nconst result = [];\nfor (const item of items) {\n\tresult.push(transform(item));\n}',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
