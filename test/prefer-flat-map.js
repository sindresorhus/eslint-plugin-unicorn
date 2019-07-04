import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-flat-map';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errorFlatMap = {
	ruleId: 'prefer-flat-map',
	messageId: 'flat-map'
};

const errorSpread = {
	ruleId: 'prefer-flat-map',
	messageId: 'spread'
};

ruleTester.run('prefer-flat-map', rule, {
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
		'const foo = [1,2,3].concat(...[4,5,6].map((i) => i));',
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
