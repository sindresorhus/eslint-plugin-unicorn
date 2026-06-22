import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const object = {...(foo && {bar: true})}',
		'const object = {...(!foo && {bar: true})}',
		'const object = {...(foo && bar)}',
		'const object = {...(foo || {})}',
		'const object = {...(foo ?? {})}',
		'const object = {...(foo && {})}',
		'const object = {...(foo ? {bar: true} : {baz: true})}',
		'const object = {...(foo ? {} : {})}',
		'const object = {...(foo ? foo : {})}',
		'const object = {...(!foo ? {} : foo)}',
		'const object = {...(foo.bar ? foo.bar : {})}',
		'const object = {...(foo() ? foo() : {})}',
		'async () => ({...(await foo ? await foo : {})})',
		'const object = {...(foo == null ? {} : foo)}',
		'const object = {...(foo != null ? foo : {})}',
		'const object = {...(foo === null || foo === undefined ? {} : foo)}',
		'const object = {...(foo !== null && foo !== undefined ? foo : {})}',
		'const object = {...(foo == null ? undefined : foo)}',
		'const object = {...(foo == null ? null : foo)}',
		'const object = {...(foo != null ? foo : null)}',
		'const object = {...(foo ? undefined : undefined)}',
		'const object = {...(foo ? null : null)}',
		// `void 0` is not the `undefined` identifier, so it is not treated as an empty branch.
		'const object = {...(foo ? {bar: true} : void 0)}',
		'const array = [...(foo ? {bar: true} : {})]',
		'const object = {...(foo ? {bar: true} : {}).bar}',
		{
			code: 'const object = {...(foo && {bar: true})}',
			options: ['logical'],
		},
		{
			code: 'const object = {...(foo ? {bar: true} : {})}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && undefined)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && null)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && foo)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo.bar && foo.bar)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo() && foo())}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo != null && foo)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...((foo !== null && foo !== undefined) && foo)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo !== null && foo !== undefined && foo)}',
			options: ['ternary'],
		},
		{
			code: 'async () => ({...(await foo && await foo)})',
			options: ['ternary'],
		},
	],
	invalid: [
		'const object = {...(foo ? {bar: true} : {})}',
		'const object = {...(foo ? {} : {bar: true})}',
		'const object = {...(!foo ? {} : {bar: true})}',
		'const object = {...(foo ? bar : {})}',
		'const object = {...(foo ? {} : bar)}',
		'const object = {...(a || b ? {x: 1} : {})}',
		'const object = {...(a && b ? {} : {x: 1})}',
		'const object = {...(a ?? b ? {x: 1} : {})}',
		'async () => ({...(await foo ? {a: 1} : {})})',
		'const object = {...((a, b) ? {x: 1} : {})}',
		'const object = {...((a, b) ? {} : {x: 1})}',
		'const object = {...(foo ? (() => x) : {})}',
		'const object = {...(foo ? a || b : {})}',
		'const object = {...(foo ? a ?? b : {})}',
		'const object = {...(foo ? {} : a ?? b)}',
		'const object = {...(foo?.bar ? {a: 1} : {})}',
		'const object = {...((( foo )) ? (( {a: 1} )) : (( {} )))}',
		'const object = ({...foo ? {a: 1} : {}})',
		'const object = {...(!!foo ? {} : {bar: true})}',
		{
			code: 'const object = {...(foo ? bar! : {})}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(foo as string ? {} : bar)}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(foo satisfies string ? {} : bar)}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(<string>foo ? {} : bar)}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(foo! ? {} : bar)}',
			languageOptions: {parser: parsers.typescript},
		},
		'const object = {...(foo ? {bar: true} : undefined)}',
		'const object = {...(foo ? {bar: true} : null)}',
		'const object = {...(foo ? undefined : {bar: true})}',
		'const object = {...(!foo ? undefined : {bar: true})}',
		'const object = {...(foo ? null : {bar: true})}',
		'const object = {...(foo ? bar : undefined)}',
		'const object = {...(foo ? null : bar)}',
		// The nullish guard does not apply when its reference differs from the kept branch.
		'const object = {...(foo == null ? undefined : bar)}',
		'const object = {...(foo != null ? bar : undefined)}',
		'const object = {...(foo == null ? /* keep */ {} : foo)}',
		'const object = {...(foo ? {a: 1} : /* keep */ {})}',
		'const object = {...(foo ? {a: 1} : /* keep */ undefined)}',
		'const object = {...(foo ? {a: 1} : /* keep */ null)}',
		'const object = {...(/* keep */ foo ? {a: 1} : {})}',
		{
			code: 'const object = {...(foo && {bar: true})}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(!foo && {bar: true})}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && bar)}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...((a || b) && {x: 1})}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...((a, b) && {x: 1})}',
			options: ['ternary'],
		},
		{
			code: 'async () => ({...(await foo && {a: 1})})',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && (() => x))}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && (a = b))}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && (a, b))}',
			options: ['ternary'],
		},
		{
			code: 'const object = {...(foo && bar!)}',
			options: ['ternary'],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {...(foo /* keep */ && {bar: true})}',
			options: ['ternary'],
		},
	],
});
