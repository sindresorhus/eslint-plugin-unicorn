import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = await promise',
		'const {foo: bar} = await promise',
		'const foo = !await promise',
		'const foo = typeof await promise',
		'const foo = await notPromise.method()',
		'const foo = foo[await promise]',

		// These await expression need parenthesized, but rarely used
		'new (await promiseReturnsAClass)',
		'(await promiseReturnsAFunction)()',
	],
	invalid: [
		'(await promise)[0]',
		'(await promise).property',
		'const foo = (await promise).bar()',
		'const foo = (await promise).bar?.()',
		'const foo = (await promise)?.bar()',

		'const firstElement = (await getArray())[0]',
		'const secondElement = (await getArray())[1]',
		'const thirdElement = (await getArray())[2]',
		'const optionalFirstElement = (await getArray())?.[0]',
		'const {propertyOfFirstElement} = (await getArray())[0]',
		'const [firstElementOfFirstElement] = (await getArray())[0]',
		'let foo, firstElement = (await getArray())[0]',
		'var firstElement = (await getArray())[0], bar',

		'const property = (await getObject()).property',
		'const renamed = (await getObject()).property',
		'const property = (await getObject())[property]',
		'const property = (await getObject())?.property',
		'const {propertyOfProperty} = (await getObject()).property',
		'const {propertyOfProperty} = (await getObject()).propertyOfProperty',
		'const [firstElementOfProperty] = (await getObject()).property',
		'const [firstElementOfProperty] = (await getObject()).firstElementOfProperty',

		'firstElement = (await getArray())[0]',
		'property = (await getArray()).property',
	],
});

test.typescript({
	valid: [
		'function foo () {return (await promise) as string;}',
	],
	invalid: [
		{
			code: 'const foo: Type = (await promise)[0]',
			errors: 1,
		},
		{
			code: 'const foo: Type | A = (await promise).foo',
			errors: 1,
		},
	],
});
