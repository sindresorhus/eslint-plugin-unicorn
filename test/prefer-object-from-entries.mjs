import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// `Array#reduce()`
test.snapshot({
	valid: [
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
	]
});

// Functions
test.snapshot({
	valid: [
		'_.pairs',
		'_.pairs()',
		'new _.pairs(pairs)',
		'_.pairs(...[pairs])',
		'_?.pairs(pairs)',
		{
			code: '_.foo(pairs)',
			options: [{functions: ['foo']}]
		},
		{
			code: 'foo(pairs)',
			options: [{functions: ['utils.object.foo']}]
		},
		{
			code: 'object.foo(pairs)',
			options: [{functions: ['utils.object.foo']}]
		}
	],
	invalid: [
		'_.pairs(pairs)',
		'lodash.pairs(pairs)',
		'underscore.pairs(pairs)',
		{
			code: 'myFromPairsFunction(pairs)',
			options: [{functions: ['myFromPairsFunction']}]
		},
		{
			code: 'utils.object.foo(pairs)',
			options: [{functions: ['utils.object.foo']}]
		}
	]
})
