import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const array = [[]]',
		'const array = [{}]',
		'foo([])',
		'foo({})',
		'new Foo([])',
		'new Foo({})',
		'const array = [...a]',
		'const object = {...a}',
		'const [first, ...rest] = []',
		'const {foo, ...rest} = {}'
	],
	invalid: [
		'const array = [...[a]]',
		'const object = {...{a}}',
		'foo(...[a])',
		'new Foo(...[a])',

		// Trailing comma
		'const array = [...[a,]]',
		'const object = {...{a,}}',
		'foo(...[a,])',
		'new Foo(...[a,])',

		// Trailing comma in parent
		'const array = [...[a,],]',
		'const object = {...{a,},}',
		'foo(...[a,],)',
		'new Foo(...[a,],)',

		// Parentheses
		'const array = [...(( [a] ))]',
		'const object = {...(( {a} ))}',
		'foo(...(( [a] )))',
		'new Foo(...(( [a] )))',

		// Empty
		'const array = [...[]]',
		'const object = {...{}}',
		'foo(...[])',
		'new Foo(...[])',

		// Hole(s)
		'const array = [...[,]]',
		'foo(...[,])',
		'new Foo(...[,])',
		'const array = [...[,,]]',
		'foo(...[,,])',
		'new Foo(...[,,])',
		'const array = [...[a, , b,]]',
		'foo(...[a, , b,])',
		'new Foo(...[a, , b,])',
		'const array = [...[a, , b,],]',
		'foo(...[a, , b,],)',
		'new Foo(...[a, , b,],)',

		// Extra elements/properties
		'const array = [a, ...[a, b]]',
		'const object = {a, ...{a, b}}',
		'foo(a, ...[a, b])',
		'new Foo(a, ...[a, b])',
		'const array = [...[a, b], b,]',
		'const object = {...{a, b}, b,}',
		'foo(...[a, b], b,)',
		'new Foo(...[a, b], b,)',
		'const array = [a, ...[a, b], b,]',
		'const object = {a, ...{a, b}, b,}',
		'foo(a, ...[a, b], b,)',
		'new Foo(a, ...[a, b], b,)',

		outdent`
			new Foo(
				foo(
					a,
					...[a, b],
					b,
				),
				...[
					a,
					...[
						a,
						b,
					],
					b,
				],
				{
					a: [...[a, b]],
					...{
						a,
						b,
					},
				}
			)
		`
	]
});
