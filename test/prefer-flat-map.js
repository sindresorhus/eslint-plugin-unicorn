import test from 'ava';
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
		`
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
			code: `
				let bar = [1,2,3].map(i => {
					return [i];
				}).flat();
			`,
			output: `
				let bar = [1,2,3].flatMap(i => {
					return [i];
				});
			`,
			errors: [error]
		},
		{
			code: 'let bar = [1,2,3].map(i => {\nreturn [i];\n})\n.flat();',
			output: 'let bar = [1,2,3].flatMap(i => {\nreturn [i];\n});\n',
			errors: [error]
		},
		{
			code: 'let bar = [1,2,3].map(i => {\nreturn [i];\n}) // comment\n.flat();',
			output: 'let bar = [1,2,3].flatMap(i => {\nreturn [i];\n}); // comment\n',
			errors: [error]
		},
		{
			code: 'let bar = [1,2,3].map(i => {\nreturn [i];\n}) // comment\n.flat(); // other',
			output: 'let bar = [1,2,3].flatMap(i => {\nreturn [i];\n}); // comment\n // other',
			errors: [error]
		},
		{
			code: 'let bar = [1,2,3]\n  .map(i => { return [i]; })\n  .flat();',
			output: 'let bar = [1,2,3]\n  .flatMap(i => { return [i]; });\n  ',
			errors: [error]
		},
		{
			code: 'let bar = [1,2,3].map(i => { return [i]; })\n  .flat();',
			output: 'let bar = [1,2,3].flatMap(i => { return [i]; });\n  ',
			errors: [error]
		},
		{
			code: 'let bar = [1,2,3] . map( x => y ) . flat () // 🤪',
			output: 'let bar = [1,2,3] . flatMap( x => y )  // 🤪',
			errors: [error]
		}
	]
});
