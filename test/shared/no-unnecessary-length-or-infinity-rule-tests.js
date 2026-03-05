import parsers from '../utils/parsers.js';

function createFixtures(method) {
	return {
		valid: [
			`foo.${method}?.(1, foo.length)`,
			`foo.${method}(foo.length, 1)`,
			`foo.${method}()`,
			`foo.${method}(1)`,
			`foo.${method}(1, foo.length - 1)`,
			`foo.${method}(1, foo.length, extraArgument)`,
			`foo.${method}(...[1], foo.length)`,
			`foo.not_${method}(1, foo.length)`,
			`new foo.${method}(1, foo.length)`,
			`${method}(1, foo.length)`,
			`foo.${method}(1, foo.notLength)`,
			`foo.${method}(1, length)`,
			`foo[${method}](1, foo.length)`,
			`foo.${method}(1, foo[length])`,
			`foo.${method}(1, bar.length)`,
			`foo?.${method}(1, NotInfinity)`,
			`foo?.${method}(1, Number.NOT_POSITIVE_INFINITY)`,
			`foo?.${method}(1, Not_Number.POSITIVE_INFINITY)`,
			`foo?.${method}(1, Number?.POSITIVE_INFINITY)`,
			// `isSameReference` consider they are not the same reference
			`foo().${method}(1, foo().length)`,
			{
				code: `(foo as any[]).${method}(1, bar.length)`,
				languageOptions: {parser: parsers.typescript},
			},
			{
				code: `foo!.${method}(1, bar!.length)`,
				languageOptions: {parser: parsers.typescript},
			},
		],
		invalid: [
			`foo.${method}(1, foo.length)`,
			`foo?.${method}(1, foo.length)`,
			`foo.${method}(1, foo.length,)`,
			`foo.${method}(1, (( foo.length )))`,
			`foo.${method}(1, foo?.length)`,
			`foo?.${method}(1, foo?.length)`,
			`foo?.${method}(1, Infinity)`,
			`foo?.${method}(1, Number.POSITIVE_INFINITY)`,
			`foo.bar.${method}(1, foo.bar.length)`,
			{
				code: `(foo as any[]).${method}(1, (foo as any[]).length)`,
				languageOptions: {parser: parsers.typescript},
			},
			{
				code: `(array as string[])?.${method}(1, (array as string[])?.length)`,
				languageOptions: {parser: parsers.typescript},
			},
			{
				code: `(foo as number[]).${method}(1, Infinity)`,
				languageOptions: {parser: parsers.typescript},
			},
			{
				code: `(bar as any[]).${method}(1, Number.POSITIVE_INFINITY)`,
				languageOptions: {parser: parsers.typescript},
			},
			{
				code: `foo!.${method}(1, foo!.length)`,
				languageOptions: {parser: parsers.typescript},
			},
			{
				code: `foo!.${method}(1, Infinity)`,
				languageOptions: {parser: parsers.typescript},
			},
			{
				code: `bar!.${method}(1, Number.POSITIVE_INFINITY)`,
				languageOptions: {parser: parsers.typescript},
			},
		],
	};
}

export {createFixtures};
