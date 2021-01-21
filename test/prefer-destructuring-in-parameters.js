import {outdent} from 'outdent';
import {test} from './utils/test.js';

test.snapshot({
	valid: [
		'const foo = bar => bar',
		'const foo = () => {}',
		'const foo = () => foo.x',
		'const foo = (bar, baz) => foo.x',
		'const foo = function bar(baz) {return bar.name}',
		'const foo = ({bar}) => bar',
		'const foo = bar => bar[2]',
		'const foo = bar => bar[1.5]',
		'const foo = bar => bar[-1]',
		'const foo = bar => bar[0xFF]',
		'const foo = bar => bar[null]',
		'const foo = bar => bar[1n]',
		'const foo = bar => bar["x"]',
		'const foo = bar => bar.length && bar[0]',
		'const foo = bar => bar?.x',
		'const foo = bar => x[bar]',
		'const foo = bar => bar.default',
		'const foo = bar => bar.function',
		'const foo = bar => bar.x()',
		'const foo = bar => bar[0]()',
		'const foo = bar => new bar.X()',
		'const foo = bar => new bar[0]()',
		'const foo = bar => bar.x = 1',
		'const foo = bar => bar[0] = 1',
		'const foo = bar => bar.x += 1',
		'const foo = bar => bar.x *= 1',
		'const foo = bar => bar.x **= 1',
		'const foo = bar => bar.x ||= true',
		'const foo = bar => ++bar.x',
		'const foo = bar => bar.x++',
		'const foo = bar => bar[0]++',
		// Not sure if we should only allow `0`/`1` or just not against `no-unreadable-array-destructuring` rule
		// Following case can write as `const foo = ([, second, third] => second + third)`
		'const foo = bar => bar[1] + bar[3]'
	],
	invalid: [
		'const foo = bar => bar[0]',
		'const foo = (bar) => bar[0]',
		'const foo = bar => bar[(1)]',
		'const foo = bar => bar[0] === firstElementOfBar',
		'const foo = (bar, baz) => bar[0] === baz.firstElementOfBar',
		'const foo = (bar, {x}) => bar[0] === x',
		'const foo = bar => bar[0b01]',
		'const foo = bar => bar.length',
		'const foo = bar => bar.x',
		'const foo = bar => bar.$ === bar._',
		'const foo = bar => a = bar.x',
		'const foo = bar => {const a = a = bar.x;}',
		'const foo = bar => bar.baz.x = 1',
		'const foo = bar => x = bar[0]',
		'const foo = bar => a(bar.x)',
		'const foo = bar => a(bar[0])',
		'const foo = bar => new A(bar.x)',
		'const foo = bar => new A(bar[0])',
		'const foo = bar => a += bar.x',
		'function foo (bar) {return bar.x}',
		'const foo = function (bar) {return bar.x}',
		outdent`
			class A {
				foo(bar) {
					this.x = bar.x;
				}
			}
		`,
		outdent`
			const A = class {
				foo(bar) {
					this.x = bar.x;
				}
			}
		`,
		outdent`
			const a = {
				foo(bar) {
					a.x = bar.x;
				}
			}
		`,
		// Not sure if we should have a limitation on property numbers
		outdent`
			function foo(bar, baz) {
				return [
					bar.$,
					bar.a, bar.b, bar.c, bar.d, bar.e, bar.f, bar.g, bar.h,
					bar.i, bar.j, bar.k, bar.l, bar.m, bar.n, bar.o, bar.p,
					bar.q, bar.r, bar.s, bar.t, bar.u, bar.v, bar.w, bar.x,
					bar.y, bar.z,

					baz._,
					baz.A, baz.B, baz.C, baz.D, baz.E, baz.F, baz.G, baz.H,
					baz.I, baz.J, baz.K, baz.L, baz.M, baz.N, baz.O, baz.P,
					baz.Q, baz.R, baz.S, baz.T, baz.U, baz.V, baz.W, baz.X,
					baz.Y, baz.Z
				]
			}
		`
	]
});
