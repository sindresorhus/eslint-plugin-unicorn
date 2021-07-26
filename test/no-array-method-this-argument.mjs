import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

// Arrow functions
test.snapshot({
	valid: [
		'array.unknownMethod(() => {}, thisArgument)',
		'new array.map(() => {}, thisArgument)',
		'array.map?.(() => {}, thisArgument)',
		'array?.map(() => {}, thisArgument)',
		// More or less arguments
		'array.map()',
		'array.map(() => {},)',
		'array.map(() => {}, ...thisArgument)',
		'array.map(...() => {}, thisArgument)',
		'array.map(() => {}, thisArgument, extraArgument)',
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
		// `jQuery.find` and `jQuery.filter` don't accept second argument
		'$( "li" ).filter( ":nth-child(2n)" ).css( "background-color", "red" );',
		'$( "li.item-ii" ).find( "li" ).css( "background-color", "red" );',
		// First argument is not function
		'array.map(new Callback, thisArgument)',
		'array.map(1, thisArgument)',
		'async () => array.map(await callback, thisArgument)',
	],
	invalid: [
		'array.every(() => {}, thisArgument)',
		'array.filter(() => {}, thisArgument)',
		'array.find(() => {}, thisArgument)',
		'array.findIndex(() => {}, thisArgument)',
		'array.flatMap(() => {}, thisArgument)',
		'array.forEach(() => {}, thisArgument)',
		'array.map(() => {}, thisArgument)',
		// Comma
		'array.map(() => {}, thisArgument,)',
		'array.map(() => {}, (0, thisArgument),)',
		// Side effect
		'array.map(() => {}, thisArgumentHasSideEffect())',
	],
});

// Non-arrow functions
test.snapshot({
	valid: [],
	invalid: [
		'array.map(callback, thisArgument)',
		'array.map(callback, (0, thisArgument))',
		'array.map(function () {}, thisArgument)',
		'array.map(function callback () {}, thisArgument)',
		{
			code: 'array.map( foo as bar, (( thisArgument )),)',
			parser: parsers.typescript,
		},
		{
			code: 'array.map( (( foo as bar )), (( thisArgument )),)',
			parser: parsers.typescript,
		},
		'array.map( (( 0, callback )), (( thisArgument )),)',
		// This callback is actually arrow function, but we don't know
		'array.map((0, () => {}), thisArgument)',
		// This callback is a bound function, but we don't know
		'array.map(callback.bind(foo), thisArgument)',
	],
});
