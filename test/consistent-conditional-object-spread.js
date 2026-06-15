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
	],
	invalid: [
		'const object = {...(foo ? {bar: true} : {})}',
		'const object = {...(foo ? foo : {})}',
		'const object = {...(!foo ? {} : foo)}',
		'const object = {...(foo.bar ? foo.bar : {})}',
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
		'const object = {...(foo ? {a: 1} : /* keep */ {})}',
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
			code: 'const object = {...(foo && foo)}',
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
