import parsers from '../utils/parsers.js';

// The first argument can reassign the receiver before `.length` is read, so the length is only removed when the first argument has no assignment or update. Calls cannot be followed, so they keep the fix.
function createArgumentEvaluationFixtures(method) {
	return {
		valid: [],
		invalid: [
			...[
				`array.${method}((array = other, 0), array.length)`,
				`arrays[index].${method}(index++, arrays[index].length)`,
			].map(code => ({code, errors: 1})),
			{
				code: `array.${method}(start(), array.length)`,
				output: `array.${method}(start())`,
				errors: 1,
			},
			{
				code: `array.${method}(array.indexOf(item) + 1, array.length)`,
				output: `array.${method}(array.indexOf(item) + 1)`,
				errors: 1,
			},
			{
				code: `array?.${method}(start(), array?.length)`,
				output: `array?.${method}(start())`,
				errors: 1,
			},
			{
				code: `array.${method}((start() as number), array.length)`,
				output: `array.${method}((start() as number))`,
				languageOptions: {parser: parsers.typescript},
				errors: 1,
			},
			{
				code: `array.${method}(start(), Infinity)`,
				output: `array.${method}(start())`,
				errors: 1,
			},
			{
				code: `array.${method}((array = other, 0), Number.POSITIVE_INFINITY)`,
				output: `array.${method}((array = other, 0))`,
				errors: 1,
			},
		],
	};
}

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

export {createFixtures, createArgumentEvaluationFixtures};
