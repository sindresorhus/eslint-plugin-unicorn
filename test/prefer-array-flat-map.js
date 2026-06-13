import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const bar = [1,2,3].map()',
		'const bar = [1,2,3].map(i => i)',
		'const bar = [1,2,3].map((i) => i)',
		'const bar = [1,2,3].map((i) => { return i; })',
		'const bar = foo.map(i => i)',
		'const bar = foo.map?.(i => [i]).flat()',
		'const bar = foo.map(i => [i])?.flat()',
		'const bar = foo.map(i => [i]).flat?.()',
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
		'const observable = new Observable(); observable.map(value => [value]).flat();',

		// `filter().flatMap()` unsupported cases
		'array.filter(value => value.active).map(value => value.id);',
		'array.filter(function (value) { return value.active; }).flatMap(value => [value.id]);',
		'array.filter(value => { return value.active; }).flatMap(value => [value.id]);',
		'array.filter(async value => value.active).flatMap(value => [value.id]);',
		'array.filter(value => value.active).flatMap(async value => [value.id]);',
		'array?.filter(value => value.active).flatMap(value => [value.id]);',
		'array?.items.filter(value => value.active).flatMap(value => [value.id]);',
		'getArray?.().filter(value => value.active).flatMap(value => [value.id]);',
		'array.map?.(value => value.id).filter(value => value).flatMap(value => [value]);',
		'array.filter?.(value => value.active).flatMap(value => [value.id]);',
		'array.filter(value => value.active)?.flatMap(value => [value.id]);',
		'array[filter](value => value.active).flatMap(value => [value.id]);',
		'array.filter(value => value.active)[flatMap](value => [value.id]);',
		'array.filter(value => value.active, thisArgument).flatMap(value => [value.id]);',
		'array.filter(value => value.active).flatMap(value => [value.id], thisArgument);',
		'array.filter(...[value => value.active]).flatMap(value => [value.id]);',
		'array.filter(value => value.active).flatMap(...[value => [value.id]]);',
		'array.filter(value => value.active).flatMap(() => [1]);',
		'array.filter(value => value.active).flatMap((value, index) => [index]);',
		'array.filter(value => value.active).flatMap((value, index, array) => array);',
		'array.filter((value, index) => index > 0).flatMap(value => [value]);',
		'array.filter((value, index, array) => array.indexOf(value) === index).flatMap(value => [value]);',
		'const value = 1; array.filter(value => value.active).flatMap(() => [value]);',
		'const index = 0; array.filter((value, index) => value.active).flatMap(() => [index]);',
		'const index = 0; array.filter((value, index) => value.active).flatMap(value => [index]);',
		'array.filter(value => value.active).flatMap(item => [item.id]);',
		'({filter() {}}).filter(value => value.active).flatMap(value => [value.id]);',
		'const set = new Set(); set.filter(value => value.active).flatMap(value => [value.id]);',
		'array.filter(value => /* comment */ value.active).flatMap(value => [value.id]);',
		'array.filter(value => value.active).flatMap(value => /* comment */ [value.id]);',
		'array.filter(value => value.active) /* comment */ .flatMap(value => [value.id]);',
		{
			code: 'array.filter<string>(value => value.active).flatMap(value => [value.id]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter(value => value.active).flatMap<string>(value => [value.id]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter((value): value is string => typeof value === "string").flatMap(value => [value]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { return array.filter((value: string) => value.length > 1).flatMap(value => [value as string]); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter(value => value.length > 1).flatMap((value: string) => [value]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: any[]) { return array.filter((value: string) => Boolean(value)).flatMap(value => [value.toFixed()]); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array?: {items: string[]}) { return (array?.items as string[]).filter(value => value).flatMap(value => [value]); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'const bar = [[1],[2],[3]].map(i => [i]).flat()',
		'const bar = [[1],[2],[3]].map(i => [i]).flat(1,)',
		'const bar = [1,2,3].map(i => [i]).flat()',
		'const bar = [1,2,3].map((i) => [i]).flat()',
		'const bar = [1,2,3].map((i) => { return [i]; }).flat()',
		'const bar = [1,2,3].map(foo).flat()',
		'const bar = foo.map(i => [i]).flat()',
		'const bar = foo?.map(i => [i]).flat()',
		{
			code: 'function foo(collection: string[] | {map(callback: (value: string) => string[]): string[][]}) { collection.map(value => [value]).flat(); }',
			languageOptions: {parser: parsers.typescript},
		},
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

		'array.filter(value => value > 0.5).flatMap(value => [value, value * 2]);',
		'array.map(value => value?.id).filter(value => value).flatMap(value => [value]);',
		'(array.filter(value => value.active)).flatMap(value => [value.id]);',
		'(array).filter(value => (value.active)).flatMap(value => ([value.id]));',
		'array.filter(value => value.active && value.visible).flatMap(value => [value.id]);',
		'array.filter(value => value.active ? value.visible : value.enabled).flatMap(value => [value.id]);',
		'array.filter(value => value.active = true).flatMap(value => [value.id]);',
		'array.filter(value => value.active).flatMap(value => value.result = []);',
		'array.filter(value => value.active).flatMap(value => ({id: value.id}));',
		'array.filter(value => value.active).flatMap(value => (sideEffect(), [value.id]));',
		{
			code: 'function foo(array: unknown) { return (array as string[]).filter(value => value.length > 1).flatMap(value => [value]); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: unknown[]) { return array.filter(value => value as boolean).flatMap(value => [value]); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
