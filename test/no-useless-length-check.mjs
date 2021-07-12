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

		'(foo && array.length === 0) || array.every(Boolean) && foo',
		'array.length === 0 || (array.every(Boolean) && foo)',
		'(foo || array.length > 0) && array.some(Boolean)',
		'array.length > 0 && (array.some(Boolean) || foo)',
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
		outdent`
			((
				((
					(( array )).every(Boolean)
				))
				||
				((
					(( array )).length
				)) === (( 0 ))
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
		'array.every(Boolean) || array.length === 0',
		'array.some(Boolean) && array.length !== 0',
		'array.some(Boolean) && array.length > 0',
		'foo && array.length > 0 && array.some(Boolean)',
		'foo || array.length === 0 || array.every(Boolean)',
		'(foo || array.length === 0) || array.every(Boolean)',
		'array.length === 0 || (array.every(Boolean) || foo)',
		'(foo && array.length > 0) && array.some(Boolean)',
		'array.length > 0 && (array.some(Boolean) && foo)',
		'array.every(Boolean) || array.length === 0 || array.every(Boolean)',
		'array.length === 0 || array.every(Boolean) || array.length === 0',
		outdent`
			array1.every(Boolean)
			|| (( array1.length === 0 || array2.length === 0 )) // Both useless
			|| array2.every(Boolean)
		`,
		// Real world case from this rule initial implementation, but added useless length check
		outdent`
			function isUselessLengthCheckNode({node, operator, siblings}) {
				return (
					(
						operator === '||' &&
						zeroLengthChecks.has(node) &&
						siblings.length > 0 &&
						siblings.some(condition =>
							arrayEveryCalls.has(condition) &&
							isSameReference(node.left.object, condition.callee.object)
						)
					) ||
					(
						operator === '&&' &&
						nonZeroLengthChecks.has(node) &&
						siblings.length > 0 &&
						siblings.some(condition =>
							arraySomeCalls.has(condition) &&
							isSameReference(node.left.object, condition.callee.object)
						)
					)
				);
			}
		`,
	],
});
