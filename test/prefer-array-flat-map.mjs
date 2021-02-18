import {outdent} from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const errorFlatMap = {
	messageId: 'flat-map'
};

const errorSpread = {
	messageId: 'spread'
};

test({
	valid: [
		'const bar = [1,2,3].map()',
		'const bar = [1,2,3].map(i => i)',
		'const bar = [1,2,3].map((i) => i)',
		'const bar = [1,2,3].map((i) => { return i; })',
		'const bar = foo.map(i => i)',
		'const bar = [[1],[2],[3]].flat()',
		'const bar = [1,2,3].map(i => [i]).sort().flat()',
		outdent`
			let bar = [1,2,3].map(i => [i]);
			bar = bar.flat();
		`,
		'const bar = [[1],[2],[3]].map(i => [i]).flat(2)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(1, null)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(Infinity)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(Number.POSITIVE_INFINITY)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(Number.MAX_VALUE)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(Number.MAX_SAFE_INTEGER)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(...[1])',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(0.4 +.6)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(+1)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(foo)',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(foo.bar)',

		// Spread: test `[].concat()` part
		// Not `CallExpression`
		'const foo = new [].concat(...bar.map((i) => i));',
		// Not empty array
		'const foo = [1,2,3].concat(...[4,5,6].map((i) => i));',
		'const foo = bar.concat(...[4,5,6].map((i) => i));',
		// Not `concat`
		'const foo = [].notConcat(...bar.map((i) => i));',
		// Computed
		'const foo = [][concat](...bar.map((i) => i));',
		// Not `Identifier`
		'const foo = []["concat"](...bar.map((i) => i));',
		// Not `MemberExpression`
		'const foo = concat(...bar.map((i) => i));',

		// Spread: test `[].map()` part
		// Not `SpreadElement`
		'const foo = [].concat(bar.map((i) => i));',
		// Not `CallExpression`
		'const foo = [].concat(...new bar.map((i) => i));',
		// Not `MemberExpression`
		'const foo = [].concat(...map((i) => i));',
		// Computed
		'const foo = [].concat(...bar[map]((i) => i));',
		// Not `Identifier`
		'const foo = [].concat(...bar["map"]((i) => i));',
		// Not `map`
		'const foo = [].concat(...bar.notMap((i) => i));',
		'const foo = [].concat(...[[4,5],6].flat());'
	],
	invalid: [
		{
			code: 'const bar = [1,2,3].map(i => [i]).flat()',
			output: 'const bar = [1,2,3].flatMap(i => [i])',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = [1,2,3].map((i) => [i]).flat()',
			output: 'const bar = [1,2,3].flatMap((i) => [i])',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = [1,2,3].map((i) => { return [i]; }).flat()',
			output: 'const bar = [1,2,3].flatMap((i) => { return [i]; })',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = [1,2,3].map(foo).flat()',
			output: 'const bar = [1,2,3].flatMap(foo)',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = foo.map(i => [i]).flat()',
			output: 'const bar = foo.flatMap(i => [i])',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = { map: () => {} }.map(i => [i]).flat()',
			output: 'const bar = { map: () => {} }.flatMap(i => [i])',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = [1,2,3].map(i => i).map(i => [i]).flat()',
			output: 'const bar = [1,2,3].map(i => i).flatMap(i => [i])',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = [1,2,3].sort().map(i => [i]).flat()',
			output: 'const bar = [1,2,3].sort().flatMap(i => [i])',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = (([1,2,3].map(i => [i]))).flat()',
			output: 'const bar = (([1,2,3].flatMap(i => [i])))',
			errors: [errorFlatMap]
		},
		{
			code: outdent`
				let bar = [1,2,3].map(i => {
					return [i];
				}).flat();
			`,
			output: outdent`
				let bar = [1,2,3].flatMap(i => {
					return [i];
				});
			`,
			errors: [errorFlatMap]
		},
		{
			code: outdent`
				let bar = [1,2,3].map(i => {
					return [i];
				})
				.flat();
			`,
			output: outdent`
				let bar = [1,2,3].flatMap(i => {
					return [i];
				});
			` + '\n',
			errors: [errorFlatMap]
		},
		{
			code: outdent`
				let bar = [1,2,3].map(i => {
					return [i];
				}) // comment
				.flat();
			`,
			output: outdent`
				let bar = [1,2,3].flatMap(i => {
					return [i];
				}); // comment
			` + '\n',
			errors: [errorFlatMap]
		},
		{
			code: outdent`
				let bar = [1,2,3].map(i => {
					return [i];
				}) // comment
				.flat(); // other
			`,
			output: outdent`
				let bar = [1,2,3].flatMap(i => {
					return [i];
				}); // comment
				 // other
			 `,
			errors: [errorFlatMap]
		},
		{
			code: outdent`
				let bar = [1,2,3]
					.map(i => { return [i]; })
					.flat();
			`,
			output: outdent`
				let bar = [1,2,3]
					.flatMap(i => { return [i]; });
			` + '\n\t',
			errors: [errorFlatMap]
		},
		{
			code: outdent`
				let bar = [1,2,3].map(i => { return [i]; })
					.flat();
			`,
			output: outdent`
				let bar = [1,2,3].flatMap(i => { return [i]; });
			` + '\n\t',
			errors: [errorFlatMap]
		},
		{
			code: 'let bar = [1,2,3] . map( x => y ) . flat () // 🤪',
			output: 'let bar = [1,2,3] . flatMap( x => y )  // 🤪',
			errors: [errorFlatMap]
		},
		{
			code: 'const bar = [1,2,3].map(i => [i]).flat(1);',
			output: 'const bar = [1,2,3].flatMap(i => [i]);',
			errors: [errorFlatMap]
		},
		{
			code: outdent`
				const foo = bars
					.filter(foo => !!foo.zaz)
					.map(foo => doFoo(foo))
					.flat();
			`,
			output: outdent`
				const foo = bars
					.filter(foo => !!foo.zaz)
					.flatMap(foo => doFoo(foo));
			` + '\n\t',
			errors: [errorFlatMap]
		},
		{
			code: 'const foo = [].concat(...bar.map((i) => i));',
			output: 'const foo = [].concat(...bar.map((i) => i));',
			errors: [errorSpread]
		},
		{
			code: 'const foo = [].concat(...[1,2,3].map((i) => i));',
			output: 'const foo = [].concat(...[1,2,3].map((i) => i));',
			errors: [errorSpread]
		}
	]
});

test.snapshot([
	'const bar = [[1],[2],[3]].map(i => [i]).flat()',
	'const bar = [[1],[2],[3]].map(i => [i]).flat(1.00)',
	'const bar = [[1],[2],[3]].map(i => [i]).flat(1,)',
	'const foo = [].concat(...bar.map((i) => i));'
]);
