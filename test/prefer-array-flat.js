import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// `array.flatMap(x => x)`
test.snapshot({
	valid: [
		'array.flatMap',
		'new array.flatMap(x => x)',
		'flatMap(x => x)',
		'array.notFlatMap(x => x)',
		'array[flatMap](x => x)',
		'array.flatMap(x => x, thisArgument)',
		'array.flatMap(...[x => x])',
		'array.flatMap(function (x) { return x; })', // Can be detected
		'array.flatMap(async x => x)',
		'array.flatMap(function * (x) { return x;})',
		'array.flatMap(() => x)',
		'array.flatMap((x, y) => x)',
		'array.flatMap((x) => { return x; })', // Can be detected
		'array.flatMap(x => y)',
	],
	invalid: [
		'array.flatMap(x => x)',
		'array?.flatMap(x => x)',
		'function foo(){return[].flatMap(x => x)}',
		'foo.flatMap(x => x)instanceof Array',
	],
});

test({
	valid: [
		outdent`
			const randomObject = {
				flatMap(function_) {
					function_();
				},
			};
			randomObject.flatMap(x => x);
		`,
		'Effects.flatMap(x => x)',
		outdent`
			const effects = {
				flatMap(function_) {
					function_();
				},
			};
			effects.flatMap(x => x);
		`,
		'const effects = new Set(); effects.flatMap(x => x);',
		'const mapping = new Map(); mapping.flatMap(x => x);',
		'const text = ""; text.flatMap(x => x);',
		'const handler = () => {}; handler.flatMap(x => x);',
		'const collection = new Foo(); collection.flatMap(x => x);',
	],
	invalid: [
		{
			code: 'array.flatMap((x) => x)',
			output: 'array.flat()',
			errors: 1,
		},
		{
			code: 'Foo.bar.flatMap(x => x)',
			output: 'Foo.bar.flat()',
			errors: 1,
		},
		{
			code: 'const values = getValues(); values.flatMap(x => x);',
			output: 'const values = getValues(); values.flat();',
			errors: 1,
		},
		{
			code: 'const values = []; values.flatMap(x => x);',
			output: 'const values = []; values.flat();',
			errors: 1,
		},
		{
			code: 'const Items = []; Items.flatMap(x => x);',
			output: 'const Items = []; Items.flat();',
			errors: 1,
		},
	],
});

// `array.reduce((a, b) => a.concat(b), [])`
test.snapshot({
	valid: [
		'new array.reduce((a, b) => a.concat(b), [])',
		'array.reduce',
		'reduce((a, b) => a.concat(b), [])',
		'array[reduce]((a, b) => a.concat(b), [])',
		'array.notReduce((a, b) => a.concat(b), [])',
		'array.reduce((a, b) => a.concat(b), [], EXTRA_ARGUMENT)',
		'array.reduce((a, b) => a.concat(b), NOT_EMPTY_ARRAY)',
		'array.reduce((a, b, extraParameter) => a.concat(b), [])',
		'array.reduce((a,) => a.concat(b), [])',
		'array.reduce(() => a.concat(b), [])',
		'array.reduce((a, b) => {return a.concat(b); }, [])', // Can be detected
		'array.reduce(function (a, b) { return a.concat(b); }, [])', // Can be detected
		'array.reduce((a, b) => b.concat(b), [])',
		'array.reduce((a, b) => a.concat(a), [])',
		'array.reduce((a, b) => b.concat(a), [])',
		'array.reduce((a, b) => a.notConcat(b), [])',
		'array.reduce((a, b) => a.concat, [])',
	],
	invalid: [
		'array.reduce((a, b) => a.concat(b), [])',
		'array?.reduce((a, b) => a.concat(b), [])',
		'function foo(){return[].reduce((a, b) => a.concat(b), [])}',
		'function foo(){return[]?.reduce((a, b) => a.concat(b), [])}',
	],
});

// `array.reduce((a, b) => [...a, ...b], [])`
test.snapshot({
	valid: [
		'new array.reduce((a, b) => [...a, ...b], [])',
		'array[reduce]((a, b) => [...a, ...b], [])',
		'reduce((a, b) => [...a, ...b], [])',
		'array.notReduce((a, b) => [...a, ...b], [])',
		'array.reduce((a, b) => [...a, ...b], [], EXTRA_ARGUMENT)',
		'array.reduce((a, b) => [...a, ...b], NOT_EMPTY_ARRAY)',
		'array.reduce((a, b, extraParameter) => [...a, ...b], [])',
		'array.reduce((a,) => [...a, ...b], [])',
		'array.reduce(() => [...a, ...b], [])',
		'array.reduce((a, b) => {return [...a, ...b]; }, [])', // Can be detected
		'array.reduce(function (a, b) { return [...a, ...b]; }, [])', // Can be detected
		'array.reduce((a, b) => [...b, ...b], [])',
		'array.reduce((a, b) => [...a, ...a], [])',
		'array.reduce((a, b) => [...b, ...a], [])',
		'array.reduce((a, b) => [a, ...b], [])',
		'array.reduce((a, b) => [...a, b], [])',
		'array.reduce((a, b) => [a, b], [])',
		'array.reduce((a, b) => [...a, ...b, c], [])',
		'array.reduce((a, b) => [...a, ...b,,], [])',
		'array.reduce((a, b) => [,...a, ...b], [])',
		'array.reduce((a, b) => [, ], [])',
		'array.reduce((a, b) => [, ,], [])',
	],
	invalid: [
		'array.reduce((a, b) => [...a, ...b], [])',
		'array.reduce((a, b) => [...a, ...b,], [])',
		'function foo(){return[].reduce((a, b) => [...a, ...b,], [])}',
	],
});

// `[].concat(array)`
test.snapshot({
	valid: [
		'[].concat',
		'new [].concat(array)',
		'[][concat](array)',
		'[].notConcat(array)',
		'[,].concat(array)',
		'({}).concat(array)',
		'[].concat()',
		'[].concat(array, EXTRA_ARGUMENT)',
		'[]?.concat(array)',
		'[].concat?.(array)',
	],
	invalid: [
		'[].concat(maybeArray)',
		'[].concat( ((0, maybeArray)) )',
		'[].concat( ((maybeArray)) )',
		'[].concat( [foo] )',
		'[].concat( [[foo]] )',
		'function foo(){return[].concat(maybeArray)}',
	],
});

// `[].concat(...array)`
test.snapshot({
	valid: [
		'new [].concat(...array)',
		'[][concat](...array)',
		'[].notConcat(...array)',
		'[,].concat(...array)',
		'({}).concat(...array)',
		'[].concat()',
		'[].concat(...array, EXTRA_ARGUMENT)',
		'[]?.concat(...array)',
		'[].concat?.(...array)',
	],
	invalid: [
		'[].concat(...array)',
		'[].concat(...(( array )))',
		'[].concat(...(( [foo] )))',
		'[].concat(...(( [[foo]] )))',
		'function foo(){return[].concat(...array)}',
		'class A extends[].concat(...array){}',
		'const A = class extends[].concat(...array){}',
	],
});

// - `[].concat.apply([], array)`
// - `[].concat.call([], maybeArray)`
// - `[].concat.call([], ...array)`
test.snapshot({
	valid: [
		'new [].concat.apply([], array)',
		'[].concat.apply',
		'[].concat.apply([], ...array)',
		'[].concat.apply([], array, EXTRA_ARGUMENT)',
		'[].concat.apply([])',
		'[].concat.apply(NOT_EMPTY_ARRAY, array)',
		'[].concat.apply([,], array)',
		'[,].concat.apply([], array)',
		'[].concat[apply]([], array)',
		'[][concat].apply([], array)',
		'[].concat.notApply([], array)',
		'[].notConcat.apply([], array)',
		'[].concat.apply?.([], array)',
		'[].concat?.apply([], array)',
		'[]?.concat.apply([], array)',
	],
	invalid: [
		'[].concat.apply([], array)',
		'[].concat.apply([], ((0, array)))',
		'[].concat.apply([], ((array)))',
		'[].concat.apply([], [foo])',
		'[].concat.apply([], [[foo]])',

		'[].concat.call([], maybeArray)',
		'[].concat.call([], ((0, maybeArray)))',
		'[].concat.call([], ((maybeArray)))',
		'[].concat.call([], [foo])',
		'[].concat.call([], [[foo]])',

		'[].concat.call([], ...array)',
		'[].concat.call([], ...((0, array)))',
		'[].concat.call([], ...((array)))',
		'[].concat.call([], ...[foo])',
		'[].concat.call([], ...[[foo]])',

		'function foo(){return[].concat.call([], ...array)}',
	],
});

// - `Array.prototype.concat.apply([], array)`
// - `Array.prototype.concat.call([], maybeArray)`
// - `Array.prototype.concat.call([], ...array)`
test.snapshot({
	valid: [
		'new Array.prototype.concat.apply([], array)',
		'Array.prototype.concat.apply',
		'Array.prototype.concat.apply([], ...array)',
		'Array.prototype.concat.apply([], array, EXTRA_ARGUMENT)',
		'Array.prototype.concat.apply([])',
		'Array.prototype.concat.apply(NOT_EMPTY_ARRAY, array)',
		'Array.prototype.concat.apply([,], array)',
		'Array.prototype.concat[apply]([], array)',
		'Array.prototype[concat].apply([], array)',
		'Array[prototype].concat.apply([], array)',
		'Array.prototype.concat.notApply([], array)',
		'Array.prototype.notConcat.apply([], array)',
		'Array.notPrototype.concat.apply([], array)',
		'NotArray.prototype.concat.apply([], array)',
		'Array.prototype.concat.apply?.([], array)',
		'Array.prototype.concat?.apply([], array)',
		'Array.prototype?.concat.apply([], array)',
		'Array?.prototype.concat.apply([], array)',
		'object.Array.prototype.concat.apply([], array)',
	],
	invalid: [
		'Array.prototype.concat.apply([], array)',
		'Array.prototype.concat.apply([], ((0, array)))',
		'Array.prototype.concat.apply([], ((array)))',
		'Array.prototype.concat.apply([], [foo])',
		'Array.prototype.concat.apply([], [[foo]])',

		'Array.prototype.concat.call([], maybeArray)',
		'Array.prototype.concat.call([], ((0, maybeArray)))',
		'Array.prototype.concat.call([], ((maybeArray)))',
		'Array.prototype.concat.call([], [foo])',
		'Array.prototype.concat.call([], [[foo]])',

		'Array.prototype.concat.call([], ...array)',
		'Array.prototype.concat.call([], ...((0, array)))',
		'Array.prototype.concat.call([], ...((array)))',
		'Array.prototype.concat.call([], ...[foo])',
		'Array.prototype.concat.call([], ...[[foo]])',
	],
});

// #1146
test({
	testerOptions: {
		languageOptions: {
			ecmaVersion: 2019,
		},
	},
	valid: [],
	invalid: [
		{
			code: '/**/[].concat.apply([], array)',
			output: '/**/array.flat()',
			errors: 1,
		},
		{
			code: 'Array.prototype.concat.apply([], array)',
			output: 'array.flat()',
			errors: 1,
		},
	],
});

// `_.flatten(array)`
test.snapshot({
	valid: [
		'new _.flatten(array)',
		'_.flatten',
		'_.flatten(array, EXTRA_ARGUMENT)',
		'_.flatten(...array)',
		'_[flatten](array)',
		'_.notFlatten(array)',
		'NOT_LODASH.flatten(array)',
		'_.flatten?.(array)',
		'_?.flatten(array)',
		'object._.flatten(array)',
	],
	invalid: [
		'_.flatten(array)',
		'lodash.flatten(array)',
		'underscore.flatten(array)',
	],
});

// `options`
const options = [{functions: ['flat', 'utils.flat', 'globalThis.lodash.flatten']}];
test.snapshot({
	valid: [
		'flat',
		'new flat(array)',
		'flat?.(array)',
		'object.flat?.(array)',
		'utils.flat',
		'new utils.flat(array)',
		'utils.flat?.(array)',
		'utils?.flat(array)',
		'utils.flat2(array)',
		'utils2.flat(array)',
		'object.utils.flat(array)',
		'globalThis.lodash.flatten',
		'new globalThis.lodash.flatten(array)',
		'globalThis.lodash.flatten?.(array)',
		'globalThis.lodash?.flatten(array)',
		'globalThis?.lodash.flatten(array)',
		'object.globalThis.lodash.flatten(array)',
		'GLOBALTHIS.lodash.flatten(array)',
		'globalthis.lodash.flatten(array)',
		'GLOBALTHIS.LODASH.FLATTEN(array)',
		'flat(array, EXTRA_ARGUMENT)',
		'flat(...array)',
	].map(code => ({
		code,
		options,
	})),
	invalid: [
		'flat(array)',
		'flat(array,)',
		'utils.flat(array)',
		'globalThis.lodash.flatten(array)',
		'flat(array).map(array => utils.flat(array))',
		outdent`
			import {flatten as flat} from 'lodash-es';
			const foo = flat(bar);
		`,
		// Should not effect other cases
		'_.flatten(array).length',
		'Array.prototype.concat.apply([], array)',
	].map(code => ({
		code,
		options,
	})),
});

const spacesInFunctions = [{functions: ['', ' ', ' flat1 ', 'utils..flat2', 'utils . flat3', 'utils.fl at4', 'utils.flat5  ', '  utils.flat6']}];
test.snapshot({
	valid: [
		'utils.flat2(x)',
		'utils.flat3(x)',
		'utils.flat4(x)',
	].map(code => ({
		code,
		options: spacesInFunctions,
	})),
	invalid: [
		'flat1(x)',
		'utils.flat5(x)',
		'utils.flat6(x)',
	].map(code => ({
		code,
		options: spacesInFunctions,
	})),
});

test.snapshot({
	valid: [
		'array.flat()',
		'array.flat(1)',
	],
	invalid: [
		// ASI
		outdent`
			before()
			Array.prototype.concat.apply([], [array].concat(array))
		`,
		outdent`
			before()
			Array.prototype.concat.apply([], +1)
		`,
		outdent`
			before()
			Array.prototype.concat.call([], +1)
		`,
		// Parentheses
		'Array.prototype.concat.apply([], (0, array))',
		'Array.prototype.concat.call([], (0, array))',
		'async function a() { return [].concat(await getArray()); }',
		'_.flatten((0, array))',
		'async function a() { return _.flatten(await getArray()); }',
		'async function a() { return _.flatten((await getArray())); }',
		outdent`
			before()
			Array.prototype.concat.apply([], 1)
		`,
		outdent`
			before()
			Array.prototype.concat.call([], 1)
		`,
		outdent`
			before()
			Array.prototype.concat.apply([], 1.)
		`,
		outdent`
			before()
			Array.prototype.concat.call([], 1.)
		`,
		outdent`
			before()
			Array.prototype.concat.apply([], .1)
		`,
		outdent`
			before()
			Array.prototype.concat.call([], .1)
		`,
		outdent`
			before()
			Array.prototype.concat.apply([], 1.0)
		`,
		outdent`
			before()
			Array.prototype.concat.call([], 1.0)
		`,
		// Comment
		'[].concat(some./**/array)',
		'[/**/].concat(some./**/array)',
		'[/**/].concat(some.array)',
	],
});
