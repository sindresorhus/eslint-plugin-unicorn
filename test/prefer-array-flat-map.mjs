import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
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
		'const bar = [[1],[2],[3]].map(i => [i]).flat(1.00)',

		// Allowed
		'Children.map(children, fn).flat()', // `import {Children} from 'react';`
		'React.Children.map(children, fn).flat()',
	],
	invalid: [
		'const bar = [[1],[2],[3]].map(i => [i]).flat()',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(1,)',
		'const bar = [1,2,3].map(i => [i]).flat()',
		'const bar = [1,2,3].map((i) => [i]).flat()',
		'const bar = [1,2,3].map((i) => { return [i]; }).flat()',
		'const bar = [1,2,3].map(foo).flat()',
		'const bar = foo.map(i => [i]).flat()',
		'const bar = { map: () => {} }.map(i => [i]).flat()',
		'const bar = [1,2,3].map(i => i).map(i => [i]).flat()',
		'const bar = [1,2,3].sort().map(i => [i]).flat()',
		'const bar = (([1,2,3].map(i => [i]))).flat()',
		outdent`
			let bar = [1,2,3].map(i => {
				return [i];
			}).flat();
		`,
		outdent`
			let bar = [1,2,3].map(i => {
				return [i];
			})
			.flat();
		`,
		outdent`
			let bar = [1,2,3].map(i => {
				return [i];
			}) // comment
			.flat();
		`,
		outdent`
			let bar = [1,2,3].map(i => {
				return [i];
			}) // comment
			.flat(); // other
		`,
		outdent`
			let bar = [1,2,3]
				.map(i => { return [i]; })
				.flat();
		`,
		outdent`
			let bar = [1,2,3].map(i => { return [i]; })
				.flat();
		`,
		'let bar = [1,2,3] . map( x => y ) . flat () // 🤪',
		'const bar = [1,2,3].map(i => [i]).flat(1);',
		outdent`
			const foo = bars
				.filter(foo => !!foo.zaz)
				.map(foo => doFoo(foo))
				.flat();
		`,
	],
});
