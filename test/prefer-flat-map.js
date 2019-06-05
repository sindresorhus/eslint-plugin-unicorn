import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-flat-map';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'prefer-flat-map',
	messageId: 'preferFlatMap'
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
		`
	],
	invalid: [
		{
			code: 'const bar = [1,2,3].map(i => [i]).flat()',
			output: 'const bar = [1,2,3].flatMap(i => [i])',
			errors: [error]
		},
		{
			code: 'const bar = [1,2,3].map((i) => [i]).flat()',
			output: 'const bar = [1,2,3].flatMap((i) => [i])',
			errors: [error]
		},
		{
			code: 'const bar = [1,2,3].map((i) => { return [i]; }).flat()',
			output: 'const bar = [1,2,3].flatMap((i) => { return [i]; })',
			errors: [error]
		},
		{
			code: 'const bar = [1,2,3].map(foo).flat()',
			output: 'const bar = [1,2,3].flatMap(foo)',
			errors: [error]
		},
		{
			code: 'const bar = foo.map(i => [i]).flat()',
			output: 'const bar = foo.flatMap(i => [i])',
			errors: [error]
		},
		{
			code: 'const bar = { map: () => {} }.map(i => [i]).flat()',
			output: 'const bar = { map: () => {} }.flatMap(i => [i])',
			errors: [error]
		},
		{
			code: 'const bar = [1,2,3].map(i => i).map(i => [i]).flat()',
			output: 'const bar = [1,2,3].map(i => i).flatMap(i => [i])',
			errors: [error]
		},
		{
			code: 'const bar = [1,2,3].sort().map(i => [i]).flat()',
			output: 'const bar = [1,2,3].sort().flatMap(i => [i])',
			errors: [error]
		},
		{
			code: 'const bar = (([1,2,3].map(i => [i]))).flat()',
			output: 'const bar = (([1,2,3].flatMap(i => [i])))',
			errors: [error]
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
			errors: [error]
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
			errors: [error]
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
			errors: [error]
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
			errors: [error]
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
			errors: [error]
		},
		{
			code: outdent`
				let bar = [1,2,3].map(i => { return [i]; })
					.flat();
			`,
			output: outdent`
				let bar = [1,2,3].flatMap(i => { return [i]; });
			` + '\n\t',
			errors: [error]
		},
		{
			code: 'let bar = [1,2,3] . map( x => y ) . flat () // 🤪',
			output: 'let bar = [1,2,3] . flatMap( x => y )  // 🤪',
			errors: [error]
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
			errors: [error]
		}
	]
});
