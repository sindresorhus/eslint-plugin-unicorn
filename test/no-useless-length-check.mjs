import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// `.length === 0 || .every()`
		'array.length === 0 ?? array.every(Boolean)',
		'array.length === 0 && array.every(Boolean)',
		'(array.length === 0) + (array.every(Boolean))',
		'array.every(Boolean) || array.length === 0',
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
		'array.some(Boolean) && array.length !== 0',
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
		'array.some(Boolean) && array.length > 0',
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
	],
	invalid: [
		'array.length === 0 || array.every(Boolean)',
		'array.length !== 0 && array.some(Boolean)',
		'array.length > 0 && array.some(Boolean)',
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
		`
	]
});
