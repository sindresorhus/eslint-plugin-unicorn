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
		],
	};
}

export {createFixtures};
