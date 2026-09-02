import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const multilineTemplate = [
	'if (array.length > 0) {',
	'\tfor (const element of array) {',
	'\t\tconst value = `',
	'\t\t\tKeep this indentation.',
	'\t\t`;',
	'\t}',
	'}',
].join('\n');

const misindentedMultilineBlockComment = [
	'if (array.length > 0) {',
	'\tfor (const element of array) {',
	'\t\t/*',
	'Keep this column.',
	'\t\t*/',
	'\t}',
	'}',
].join('\n');

const spaceIndentedLoop = [
	'function iterate(array) {',
	'  if (array.length > 0) {',
	'    for (const element of array) {',
	'      use(element);',
	'    }',
	'  }',
	'}',
].join('\n');

const misindentedLoop = [
	'if (array.length > 0) {',
	'\tfor (const element of array) {',
	'use(element);',
	'\t}',
	'}',
].join('\n');

const crlfLoop = [
	'if (array.length > 0) {',
	'\tfor (const element of array) {',
	'',
	'\t\tuse(element);',
	'\t}',
	'}',
].join('\r\n');

const unwrappedCrlfLoop = [
	'for (const element of array) {',
	'',
	'\tuse(element);',
	'}',
].join('\r\n');

const mixedLineEndingLoop = 'if (array.length > 0) {\r\n\tfor (const element of array) {\r\n\r\n\t\tuse(element);\n\t\tuseAgain(element);\r\n\t}\r\n}';
const unwrappedMixedLineEndingLoop = 'for (const element of array) {\r\n\r\n\tuse(element);\n\tuseAgain(element);\r\n}';

test.snapshot({
	valid: [
		// Length check before loop
		'if (array.length === 0) { for (const element of array) {} }',
		'if (array.length >= 0) { for (const element of array) {} }',
		'if (array.length > 1) { for (const element of array) {} }',
		'if (array.length != 0) { for (const element of array) {} }',
		'if (array.length > 0 && condition) { for (const element of array) {} }',
		'if (array.length > 0) { for (const element of otherArray) {} }',
		'if (array.length > 0) { before(); for (const element of array) {} }',
		'if (array.length > 0) { for (const element of array) {} after(); }',
		'if (array.length > 0) { for (const element of array) {} } else { fallback(); }',
		'if (array.length > 0) { for (const index in array) {} }',
		'if (array.length > 0) { for (let index = 0; index < array.length; index++) {} }',
		'if (array.length > 0) { while (condition) {} }',
		'if (array.length > 0) { for await (const element of array) {} }',
		'if (array?.length > 0) { for (const element of array) {} }',
		'if (array[length] > 0) { for (const element of array) {} }',
		'if (array["length"] > 0) { for (const element of array) {} }',
		'const array = []; if (array.length > 0) { for (const array of array) {} }',
		'const array = []; if (array.length > 0) { for (const {value: array} of array) {} }',
		'const object = {array: []}; if (object.array.length > 0) { for (const object of object.array) {} }',
		// Known non-array loop receiver
		{
			code: 'function iterate(array: Set<number> & {length: number}) { if (array.length > 0) { for (const element of array) {} } }',
			languageOptions: {parser: parsers.typescript},
		},

		// Known non-array method receiver
		{
			code: 'function f(foo: Set<number>) { return foo.length === 0 || foo.every(Boolean); }',
			languageOptions: {parser: parsers.typescript},
		},
		// A private method named `every` is not `Array#every()`
		'class A { #every() {} foo() { return this.length === 0 || this.#every(Boolean); } }',
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
		{
			code: '(array as any[]).length === 0 || (array as any[]).every(Boolean)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(array as any[]).length > 0 && (array as any[]).some(Boolean)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array!.length === 0 || array!.every(Boolean)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array!.length > 0 && array!.some(Boolean)',
			languageOptions: {parser: parsers.typescript},
		},
		// A typed array shares `Array#length` and `Array#every()`
		{
			code: 'function f(array: Int8Array) { return array.length === 0 || array.every(Boolean); }',
			languageOptions: {parser: parsers.typescript},
		},

		outdent`
			if (array.length > 0) {
				for (const element of array) {
					use(element);
				}
			}
		`,
		outdent`
			if (array.length !== 0) {
				for (const element of array) {
					// Do work.
				}
			}
		`,
		outdent`
			function iterate(array) {
				if (array.length > 0) {
					for (const element of array) {
						use(element);
					}
				}
			}
		`,
		'if (array.length > 0) for (const element of array) { use(element); }',
		'if (array.length > 0) { for (const element of array) use(element); }',
		'if (((array.length > 0))) { for (const element of array) { use(element); } }',
		'if (object.array.length > 0) { for (const element of object.array) { use(element); } }',
		'if (array.length > 0) { for (const [key, value] of array) { use(key, value); } }',
		'if (array.length > 0) { for (const element of array) { /* Keep this comment. */ use(element); } }',
		outdent`
			if (array.length > 0) {
				for (const element of array) {
					/*
					Keep this indentation.
					*/
					use(element);
				}
			}
		`,
		outdent`
			if (array.length > 0)
				for (const element of array) {
					use(element);
				}
		`,
		'function iterate(array) { if (array.length > 0) { for (var array of array) {} } }',
		spaceIndentedLoop,
		{
			code: 'if ((array as any[]).length > 0) { for (const element of (array as any[])) { use(element); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((<any[]>array).length > 0) { for (const element of (<any[]>array)) { use(element); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if (array!.length !== 0) { for (const element of array!) { use(element); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((array satisfies any[]).length > 0) { for (const element of (array satisfies any[])) { use(element); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function iterate(array: Int8Array) { if (array.length > 0) { for (const element of array) { use(element); } } }',
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			if (arrays.length > 0) {
				for (const array of arrays) {
					if (array.length > 0) {
						for (const element of array) {
							use(element);
						}
					}
				}
			}
		`,
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'if (array.length > 0) { /* Keep this comment. */ for (const element of array) { use(element); } }',
			errors: [{messageId: 'for-of'}],
		},
		{
			code: 'if (array.length /* Keep this comment. */ > 0) { for (const element of array) { use(element); } }',
			errors: [{messageId: 'for-of'}],
		},
		{
			code: multilineTemplate,
			errors: [{messageId: 'for-of'}],
		},
		{
			code: misindentedMultilineBlockComment,
			errors: [{messageId: 'for-of'}],
		},
		{
			code: misindentedLoop,
			errors: [{messageId: 'for-of'}],
		},
		{
			code: outdent`
				if (array.length > 0) { for (const element of array) {
					use(element);
				} }
			`,
			errors: [{messageId: 'for-of'}],
		},
		{
			code: outdent`
				before(); if (array.length > 0) {
					for (const element of array) {
						use(element);
					}
				}
			`,
			errors: [{messageId: 'for-of'}],
		},
		{
			code: crlfLoop,
			output: unwrappedCrlfLoop,
			errors: [{messageId: 'for-of'}],
		},
		{
			code: mixedLineEndingLoop,
			output: unwrappedMixedLineEndingLoop,
			errors: [{messageId: 'for-of'}],
		},
	],
});
