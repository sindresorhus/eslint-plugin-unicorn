import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// `.length === 0 || .every()`
		'array.length === 0 ?? array.every(Boolean)',
		'array.length === 0 && array.every(Boolean)',
		'(array.length === 0) + (array.every(Boolean))',
		'array.length === 1 || array.every(Boolean)',
		'array.length === "0" || array.every(Boolean)',
		'array.length === 0. || array.every(Boolean)',
		'array.length === 0x0 || array.every(Boolean)',
		'array.length !== 0 || array.every(Boolean)',
		'array.length == 0 || array.every(Boolean)',
		'0 === array.length || array.every(Boolean)',
		'array?.length === 0 || array.every(Boolean)',
		'array.notLength === 0 || array.every(Boolean)',
		'array[length] === 0 || array.every(Boolean)',
		'array.length === 0 || array.every?.(Boolean)',
		'array.length === 0 || array?.every(Boolean)',
		'array.length === 0 || array.every',
		'array.length === 0 || array[every](Boolean)',
		'array1.length === 0 || array2.every(Boolean)',

		// `.length !== 0 && .some()`
		'array.length !== 0 ?? array.some(Boolean)',
		'array.length !== 0 || array.some(Boolean)',
		'(array.length !== 0) - (array.some(Boolean))',
		'array.length !== 1 && array.some(Boolean)',
		'array.length !== "0" && array.some(Boolean)',
		'array.length !== 0. && array.some(Boolean)',
		'array.length !== 0x0 && array.some(Boolean)',
		'array.length === 0 && array.some(Boolean)',
		'array.length <= 0 && array.some(Boolean)',
		'array.length != 0 && array.some(Boolean)',
		'0 !== array.length && array.some(Boolean)',
		'array?.length !== 0 && array.some(Boolean)',
		'array.notLength !== 0 && array.some(Boolean)',
		'array[length] !== 0 && array.some(Boolean)',
		'array.length !== 0 && array.some?.(Boolean)',
		'array.length !== 0 && array?.some(Boolean)',
		'array.length !== 0 && array.some',
		'array.length !== 0 && array.notSome(Boolean)',
		'array.length !== 0 && array[some](Boolean)',
		'array1.length !== 0 && array2.some(Boolean)',

		// `.length > 0 && .some()`
		'array.length > 0 ?? array.some(Boolean)',
		'array.length > 0 || array.some(Boolean)',
		'(array.length > 0) - (array.some(Boolean))',
		'array.length > 1 && array.some(Boolean)',
		'array.length > "0" && array.some(Boolean)',
		'array.length > 0. && array.some(Boolean)',
		'array.length > 0x0 && array.some(Boolean)',
		'array.length >= 0 && array.some(Boolean)',
		'0 > array.length && array.some(Boolean)',
		'0 < array.length && array.some(Boolean)',
		'array?.length > 0 && array.some(Boolean)',
		'array.notLength > 0 && array.some(Boolean)',
		'array.length > 0 && array.some?.(Boolean)',
		'array.length > 0 && array?.some(Boolean)',
		'array.length > 0 && array.some',
		'array.length > 0 && array.notSome(Boolean)',
		'array.length > 0 && array[some](Boolean)',
		'array1.length > 0 && array2.some(Boolean)',
		outdent`
			if (
				foo &&
				array.length !== 0 &&
				bar &&
				array.some(Boolean)
			) {
				// ...
			}
		`,

		// TODO: check these cases
		'(foo || array.length === 0) || array.every(Boolean)',
		'(foo && array.length === 0) || array.every(Boolean) && foo',
		'array.length === 0 || (array.every(Boolean) || foo)',
		'array.length === 0 || (array.every(Boolean) && foo)',
		'(foo || array.length > 0) && array.some(Boolean)',
		'(foo && array.length > 0) && array.some(Boolean)',
		'array.length > 0 && (array.some(Boolean) || foo)',
		'array.length > 0 && (array.some(Boolean) && foo)',

		// TODO: report these cases
		'array.every(Boolean) || array.length === 0',
		'array.some(Boolean) && array.length !== 0',
		'array.some(Boolean) && array.length > 0',
		'foo && array.length > 0 && array.some(Boolean)',
		'foo || array.length === 0 || array.every(Boolean)'
	],
	invalid: [
		'array.length === 0 || array.every(Boolean)',
		'array.length > 0 && array.some(Boolean)',
		'array.length !== 0 && array.some(Boolean)',
		outdent`
			((
				((
					(( array )).length
				)) === (( 0 ))
				||
				((
					(( array )).every(Boolean)
				))
			))
		`,
		'if ((( array.length > 0 )) && array.some(Boolean));',
		outdent`
			if (
				array.length !== 0 &&
				array.some(Boolean) &&
				foo
			) {
				// ...
			}
		`,
		'(array.length === 0 || array.every(Boolean)) || foo',
		'foo || (array.length === 0 || array.every(Boolean))',
		'(array.length > 0 && array.some(Boolean)) && foo',
		'foo && (array.length > 0 && array.some(Boolean))',
	]
});
