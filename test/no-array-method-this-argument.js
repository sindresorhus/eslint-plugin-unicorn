import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Arrow functions
test.snapshot({
	valid: [
		'array.unknownMethod(() => {}, thisArgument)',
		'new array.map(() => {}, thisArgument)',
		'array.map?.(() => {}, thisArgument)',
		'array?.map(() => {}, thisArgument)',
		'Array.unknownMethod(iterableOrArrayLike, () => {}, thisArgument)',
		'new Array.from(iterableOrArrayLike, () => {}, thisArgument)',
		'Array.from?.(iterableOrArrayLike, () => {}, thisArgument)',
		'Array?.from(iterableOrArrayLike, () => {}, thisArgument)',
		'NotArray.from(iterableOrArrayLike, () => {}, thisArgument)',
		'new Array.fromAsync(iterableOrArrayLike, () => {}, thisArgument)',
		'Array.fromAsync?.(iterableOrArrayLike, () => {}, thisArgument)',
		'Array?.fromAsync(iterableOrArrayLike, () => {}, thisArgument)',
		'NotArray.fromAsync(iterableOrArrayLike, () => {}, thisArgument)',

		// More or less arguments
		'array.map()',
		'array.map(() => {},)',
		'array.map(() => {}, ...thisArgument)',
		'array.map(...() => {}, thisArgument)',
		'array.map(() => {}, thisArgument, extraArgument)',
		'Array.from()',
		'Array.from(iterableOrArrayLike)',
		'Array.from(iterableOrArrayLike, () => {},)',
		'Array.from(iterableOrArrayLike, () => {}, ...thisArgument)',
		'Array.from(iterableOrArrayLike, ...() => {}, thisArgument)',
		'Array.from(...iterableOrArrayLike, () => {}, thisArgument)',
		'Array.from(iterableOrArrayLike, () => {}, thisArgument, extraArgument)',
		'Array.fromAsync()',
		'Array.fromAsync(iterableOrArrayLike)',
		'Array.fromAsync(iterableOrArrayLike, () => {},)',
		'Array.fromAsync(iterableOrArrayLike, () => {}, ...thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, ...() => {}, thisArgument)',
		'Array.fromAsync(...iterableOrArrayLike, () => {}, thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, () => {}, thisArgument, extraArgument)',

		// Ignored
		'lodash.every(array, () => {})',
		'lodash.find(array, () => {})',
		'jQuery.map(array, () => {})',
		'$.map(array, () => {})',
		'React.Children.map(children, () => {})',
		'Children.map(children, () => {})',
		'React.Children.forEach(children, () => {})',
		'Children.forEach(children, () => {})',
		'Vue.filter("capitalize", () => {})',
		'R.filter(() => {}, [])',
		'R.find(() => {}, [])',
		'R.findIndex(() => {}, [])',
		'R.forEach(() => {}, [])',
		'R.map(() => {}, [])',
		// `jQuery.find` and `jQuery.filter` don't accept second argument
		'$( "li" ).filter( ":nth-child(2n)" ).css( "background-color", "red" );',
		'$( "li.item-ii" ).find( "li" ).css( "background-color", "red" );',
		// Callback argument is not function
		'array.map(new Callback, thisArgument)',
		'array.map(1, thisArgument)',
		'async () => array.map(await callback, thisArgument)',
		'Array.from(iterableOrArrayLike, new Callback, thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, new Callback, thisArgument)',
		'Array.from(iterableOrArrayLike, 1, thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, 1, thisArgument)',
		'Array.from(iterableOrArrayLike, await callback, thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, await callback, thisArgument)',
	],
	invalid: [
		'array.every(() => {}, thisArgument)',
		'array.filter(() => {}, thisArgument)',
		'array.find(() => {}, thisArgument)',
		'array.findIndex(() => {}, thisArgument)',
		'array.findLast(() => {}, thisArgument)',
		'array.findLastIndex(() => {}, thisArgument)',
		'array.flatMap(() => {}, thisArgument)',
		'array.forEach(() => {}, thisArgument)',
		'array.map(() => {}, thisArgument)',
		'Array.from(iterableOrArrayLike, () => {}, thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, () => {}, thisArgument)',
		// Comma
		'array.map(() => {}, thisArgument,)',
		'array.map(() => {}, (0, thisArgument),)',
		'Array.from(iterableOrArrayLike, () => {}, thisArgument,)',
		'Array.fromAsync(iterableOrArrayLike, () => {}, thisArgument,)',
		// Side effect
		'array.map(() => {}, thisArgumentHasSideEffect())',
		'Array.from(iterableOrArrayLike, () => {}, thisArgumentHasSideEffect())',
		'Array.fromAsync(iterableOrArrayLike, () => {}, thisArgumentHasSideEffect())',
	],
});

// Non-arrow functions
test.snapshot({
	valid: [],
	invalid: [
		'array.map(callback, thisArgument)',
		'Array.from(iterableOrArrayLike, callback, thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, callback, thisArgument)',
		'array.map(callback, (0, thisArgument))',
		'Array.from(iterableOrArrayLike, callback, (0, thisArgument))',
		'Array.fromAsync(iterableOrArrayLike, callback, (0, thisArgument))',
		'array.map(function () {}, thisArgument)',
		'Array.from(iterableOrArrayLike, function () {}, thisArgument)',
		'array.map(function callback () {}, thisArgument)',
		'Array.from(iterableOrArrayLike, function callback () {}, thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, function callback () {}, thisArgument)',
		{
			code: 'array.map( foo as bar, (( thisArgument )),)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Array.from(iterableOrArrayLike, foo as bar, (( thisArgument )),)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Array.fromAsync(iterableOrArrayLike, foo as bar, (( thisArgument )),)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.map( (( foo as bar )), (( thisArgument )),)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Array.from(iterableOrArrayLike, (( foo as bar )), (( thisArgument )),)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Array.fromAsync(iterableOrArrayLike, (( foo as bar )), (( thisArgument )),)',
			languageOptions: {parser: parsers.typescript},
		},
		'array.map( (( 0, callback )), (( thisArgument )),)',
		'Array.from(iterableOrArrayLike, (( 0, callback )), (( thisArgument )),)',
		'Array.fromAsync(iterableOrArrayLike, (( 0, callback )), (( thisArgument )),)',
		// This callback is actually arrow function, but we don't know
		'array.map((0, () => {}), thisArgument)',
		'Array.from(iterableOrArrayLike, (0, () => {}), thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, (0, () => {}), thisArgument)',
		// This callback is a bound function, but we don't know
		'array.map(callback.bind(foo), thisArgument)',
		'Array.from(iterableOrArrayLike, callback.bind(foo), thisArgument)',
		'Array.fromAsync(iterableOrArrayLike, callback.bind(foo), thisArgument)',
	],
});
