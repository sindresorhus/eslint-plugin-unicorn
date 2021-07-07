import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const array = [[]]',
		'const array = [{}]',
		'const object = ({...[]})',
		'const array = [...[].map(x => x)]',
		'foo([])',
		'foo({})',
		'new Foo([])',
		'new Foo({})',
		'const array = [...a]',
		'const object = {...a}',
		'const [first, ...rest] = []',
		'const {foo, ...rest} = {}',
		'function a(foo, ...rest) {}'
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
		'foo(...[,, ,(( a )), ,,(0, b), ,,])',

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

		// Duplicated keys
		'({a:1, ...{a: 2}})',
		'({...{a:1}, ...{a: 2}})',
		outdent`
			({
				get a() {},
				set a(v) {},
				...{
					get a() {}
				}
			})
		`,
		// Computed
		'({[a]:1, ...{[a]: 2}})',

		outdent`
			const object = {
				a: 1,

				...{
					testKeys() {
						console.assert(Object.keys(this).length === 2)
					}
				}
			}
			object.testKeys();
		`,

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
		`,

		// Code from example in `prefer-spread` rule docs
		outdent`
			const baz = [2];
			call(foo, ...[bar, ...baz]);
		`
	]
});
