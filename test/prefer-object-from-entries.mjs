import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// Fixable `Array#reduce()`
test.snapshot({
	valid: [
		'pairs.reduce(object => ({...object, key}));',
		'pairs.reduce(object => ({...object, key}), {}, extraArgument);',
		'pairs.reduce({}, object => ({...object, key}));',
		'reduce(object => ({...object, key}), {});',
		'new reduce(object => ({...object, key}), {});',
		'pairs.reduce?.(object => ({...object, key}), {});',
		'pairs?.reduce(object => ({...object, key}), {});',
		'pairs.notReduce(object => ({...object, key}), {});',
		'pairs.reduce(object => ({...object, key}), {notEmpty});',
		'pairs.reduce(object => ({...object, key}), []);',
		'pairs.reduce(object => ({...object, key}), {}, extraArgument);',
		'pairs.reduce(...[(object => ({...object, key}))], {});',
		'pairs.reduce(object => ({...object, key}), ...[{}]);',
		// `Object.create(null)`
		'pairs.reduce(object => ({...object, key}), Object.create());',
		'pairs.reduce(object => ({...object, key}), Object.create(null, extraArgument));',
		'pairs.reduce(object => ({...object, key}), Object.create?.(null));',
		'pairs.reduce(object => ({...object, key}), Object?.create(null));',
		'pairs.reduce(object => ({...object, key}), window.Object.create(null));',
		'pairs.reduce(object => ({...object, key}), Object.notCreate(null));',
		'pairs.reduce(object => ({...object, key}), NotObject.create(null));',
		'pairs.reduce(object => ({...object, key}), object.create(null));',
		'pairs.reduce(object => ({...object, key}), object.CREATE(null));',
		'pairs.reduce(object => ({...object, key}), Object.create("null"));',
		// Unknown callback
		'pairs.reduce(callback, {})',
		'pairs.reduce(callback, Object.create(null))',
		'pairs.reduce(async function * () {}, {})',
		'pairs.reduce()',
		'pairs.reduce(callback, {}, extraArgument)',
		'pairs.reduce?.(callback, {})',
		'pairs?.reduce(callback, {})',
		'pairs.notReduce(callback, {})',
		'pairs[reduce](callback, {})',
		'pairs.reduce(...callback, {})',
		'pairs.reduce(function(object) {Object.assign(object, {key})}, {});',
		'pairs.reduce(object => ({...object, key} + 1), {});',
		'pairs.reduce((object = {}) => ({...object, key}), {});',
		'pairs.reduce((object) => ({...NotSameObject, key}), {});',
		'pairs.reduce(object => ({...object, key, anotherKey}), {});',
		'pairs.reduce(object => ({}), {});',
		'pairs.reduce(object => ({keyFirst, ...object}), {});',
		'pairs.reduce(async object => ({...object, key}), {});',
		'pairs.reduce(async object => await {...object, key}, {});',
		'pairs.reduce((...object) => ({...object, key}), {});',
		'pairs.reduce(({object}) => ({...object, key}), {});',
		'pairs.reduce(object => ({...object, ...key}), {});',
		'pairs.reduce(object => Object.assign(NotSameObject, {key}), {});',
		'pairs.reduce(object => Object.assign(object, {}), {});',
		'pairs.reduce(object => Object.assign(object, {...key}), {});',
		'pairs.reduce(object => Object.assign?.(object, {key}), {});',
		'pairs.reduce(object => Object?.assign(object, {key}), {});',
		'pairs.reduce(object => Object.notAssign(object, {key}), {});',
		'pairs.reduce(object => NotObject.assign(object, {key}), {});',
		// `object` is used somewhere else
		'pairs.reduce(object => ({...object, object}), {});',
		'pairs.reduce(object => ({...object, key: Object.keys(object)}), {});',
		'pairs.reduce((object, [key, value = object]) => ({...object, [key]: value}), {});',
		'pairs.reduce((object) => Object.assign(object, {object}), {});',
		'pairs.reduce(object => ({...object, key: function () { return object; }}), {});',
		// Complicated key value
		'pairs.reduce(object => ({...object, method() {}}), {});',
		'pairs.reduce(object => Object.assign(object, {async * method() {}}), {});',
		'pairs.reduce(object => ({...object, async method() {}}), {});',
		'pairs.reduce(object => ({...object, * method() {}}), {});',
		'pairs.reduce(object => ({...object, async * method() {}}), {});',
		'pairs.reduce(object => ({...object, get key() {}}), {});',
		'pairs.reduce(object => ({...object, set key(v) {}}), {});',
		// #1631
		'const flattened = arrayOfObjects.reduce((flattened, next) => Object.assign(flattened, next), {});',
	],
	invalid: [
		'pairs.reduce(object => ({...object, key}), {});',
		// Trailing comma
		'pairs.reduce(object => ({...object, key}), {},);',
		// Object has trailing comma
		'pairs.reduce(object => ({...object, key,}), {});',
		// `Object.create(null)`
		'pairs.reduce(object => ({...object, key}), Object.create(null));',
		'pairs.reduce(object => ({...object, key}), Object.create(null),);',
		// Parenthesized initial value
		'pairs.reduce(object => ({...object, key}), (( {} )));',
		'pairs.reduce(object => ({...object, key}), (( Object.create(null) )),);',
		// Parenthesized callback
		'pairs.reduce( (( object => ({...object, key}) )) , {});',
		'pairs.reduce( (( (object) => ({...object, key}) )) , {});',
		// Parameter trailing comma
		'pairs.reduce( (( (object,) => ({...object, key}) )) , {});',
		// Parenthesized `key`/`value`
		'pairs.reduce(object => ({...object, [((key))] : ((value))}), {});',
		// Parentheses and trailing comma every where
		outdent`
			((
				(( pairs ))
				.reduce(
					((
						(object,) => ((
							((
								Object
							)).assign(
								((
									object
								)),
								(({
									[ ((key)) ] : ((value)),
								}))
							)
						))
					)),
					Object.create(((null)),)
				)
			));
		`,
		// Different keys
		'pairs.reduce(object => ({...object, 0: value}), {});',
		'pairs.reduce(object => ({...object, true: value}), {});',
		'pairs.reduce(object => ({...object, 0n: value}), {});',
		'pairs.reduce(object => ({...object, undefined: value}), {});',
		'pairs.reduce(object => ({...object, null: value}), {});',
		'pairs.reduce(object => ({...object, var: value}), {});',
		'pairs.reduce(object => ({...object, for: value}), {});',
		'pairs.reduce(object => ({...object, default: value}), {});',
		'pairs.reduce(object => ({...object, string: value}), {});',
		'pairs.reduce(object => ({...object, "string": value}), {});',
		// Computed
		'pairs.reduce(object => ({...object, [0]: value}), {});',
		'pairs.reduce(object => ({...object, [true]: value}), {});',
		'pairs.reduce(object => ({...object, [0n]: value}), {});',
		'pairs.reduce(object => ({...object, [undefined]: value}), {});',
		'pairs.reduce(object => ({...object, [null]: value}), {});',
		'pairs.reduce(object => ({...object, ["for"]: value}), {});',
		'pairs.reduce(object => ({...object, [string]: value}), {});',
		'pairs.reduce(object => ({...object, ["string"]: value}), {});',
		// `Object.assign`
		'pairs.reduce(object => Object.assign(object, {key}), {});',
		'pairs.reduce(object => Object.assign(object, {key,}), {});',
		'pairs.reduce(object => Object.assign(object, {[key]: value,}), {});',
		// `.reduce` has multiple parameters
		'pairs.reduce((object, element, index, array) => ({...object, key}), {});',
		'pairs.reduce((object, [key, value], index, array,) => ({...object, [key]: value + index + array.length}), {});',
		'pairs.reduce(object => ({...object, key: function (object) { return object; }}), {});',
		'pairs.reduce(object => ({...object, method: async () => {}}), {});',
		'pairs.reduce(object => ({...object, method: async function * (){}}), {});',
	],
});

// Functions
test.snapshot({
	valid: [
		// `underscore` don't have `fromPairs` method
		'underscore.fromPairs(pairs)',
		'_.fromPairs',
		'_.fromPairs()',
		'new _.fromPairs(pairs)',
		'_.fromPairs(...[pairs])',
		'_?.fromPairs(pairs)',
		{
			code: '_.foo(pairs)',
			options: [{functions: ['foo']}],
		},
		{
			code: 'foo(pairs)',
			options: [{functions: ['utils.object.foo']}],
		},
		{
			code: 'object.foo(pairs)',
			options: [{functions: ['utils.object.foo']}],
		},
	],
	invalid: [
		'_.fromPairs(pairs)',
		'lodash.fromPairs(pairs)',
		{
			code: 'myFromPairsFunction(pairs)',
			options: [{functions: ['myFromPairsFunction']}],
		},
		{
			code: 'utils.object.foo(pairs)',
			options: [{functions: ['utils.object.foo']}],
		},
	],
});
