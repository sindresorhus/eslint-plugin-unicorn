import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const invalidTestCase = ({code, suggestions}) => {
	if (!suggestions) {
		return {
			code,
			errors: [{
				messageId: 'consistentDestructuring',
			}],
		};
	}

	return {
		code,
		errors: suggestions.map(suggestion => ({
			messageId: 'consistentDestructuring',
			suggestions: [{
				messageId: 'consistentDestructuringSuggest',
				output: suggestion,
			}],
		})),
	};
};

test({
	valid: [
		'console.log(foo.a, foo.b);',
		'const foo = 10;',
		'const foo = bar;',
		'const {foo} = 10;',
		'const {foo} = null;',
		'const {foo} = this;',
		'const foo = {a: 1, b: 2};',
		'for (const {a} of foo) {}',
		`const {a} = foo;
		console.log(a);`,
		outdent`
			const {a} = foo;
			console.log(a, foo.b());
		`,
		outdent`
			const {a} = foo();
			console.log(a, foo().b);
		`,
		outdent`
			const {a} = foo().bar;
			console.log(a, foo().bar.b);
		`,
		outdent`
			const {a} = foo;
			console.log(foo);
		`,
		outdent`
			const {a, b} = foo;
			console.log(a, b);
		`,
		outdent`
			const {a} = foo.bar;
			console.log(foo.bar);
		`,
		outdent`
			const {a} = foo;
			console.log(foo[a]);
		`,
		outdent`
			const [a] = foo;
			console.log(foo);
		`,
		outdent`
			const {a} = this;
			console.log(this);
		`,
		outdent`
			const {a} = null;
			console.log(null);
		`,
		outdent`
			const {a} = foo[bar];
			console.log(foo[bar].a);
		`,
		outdent`
			const {a} = foo[bar].baz;
			console.log(foo[bar].baz.a);
		`,
		outdent`
			const {a} = (foo, bar);
			console.log(foo.a);
		`,
		outdent`
			const {a} = [foo, bar];
			console.log([foo, bar].a);
		`,
		outdent`
			const {a} = {foo: bar};
			console.log({foo: bar}.a);
		`,
		outdent`
			const {a} = function foo() {};
			console.log((function foo() {}).a);
		`,
		outdent`
			const {a} = foo => {};
			console.log((foo => {}).a);
		`,
		outdent`
			const {a} = !foo;
			console.log((!foo).a);
		`,
		outdent`
			const {a} = foo++;
			console.log((foo++).a);
		`,
		outdent`
			const {a} = foo == bar;
			console.log((foo == bar).a);
		`,
		outdent`
			const {a} = foo && bar;
			console.log((foo && bar).a);
		`,
		outdent`
			const {a} = foo = bar;
			console.log((foo = bar).a);
		`,
		outdent`
			const {a} = foo ? bar : baz;
			console.log((foo ? bar : baz).a);
		`,
		outdent`
			const {a} = new foo;
			console.log((new foo).a);
		`,
		outdent`
			const {a} = foo;
			delete foo.a;
		`,
		outdent`
			const {a, ...b} = foo;
			console.log(foo.c);
		`,
		outdent`
			const {
				a: {
					b
				}
			} = foo;
			console.log(b);
		`,
		outdent`
			const {
				a: {
					b
				}
			} = foo;
			console.log(foo.a().b);
		`,
		outdent`
			const {
				a: {
					b
				}
			} = foo;
			console.log(b.a);
		`,
		outdent`
			function bar() {
				const {a} = foo;
			}
			function baz() {
				console.log(foo.b);
			}
		`,
		outdent`
			for (const foo of bar) {
				const {a} = foo;
			}
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			foo.a++;
		`,
		outdent`
			const {a} = foo;
			++foo.a;
		`,
		outdent`
			const {a} = foo;
			foo.a += 1;
		`,
		outdent`
			const {a: {b}} = foo;
			(new foo.a).b;
		`,
		outdent`
			const c = 123;
			const {a} = foo;
			const {b} = foo;
			console.log(foo.c);
		`,
		outdent`
			const {a} = foo;
			const b = 'bar';
			console.log(foo.b);
		`,
		outdent`
			const {a: b} = foo;
			console.log(foo.b);
		`,
		{
			options: [{
				exceptions: ['this.state'],
			}],
			code: 
				outdent`
					const {someMethod} = this;
					console.log(this.state);
				`,
		},
	],
	invalid: [
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(a, foo.b);
			`,
			suggestions: [outdent`
				const {a, b} = foo;
				console.log(a, b);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo.bar;
				console.log(foo.bar.a);
			`,
			suggestions: [outdent`
				const {a} = foo.bar;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {bar} = foo;
				const {a} = foo.bar;
			`,
			suggestions: [outdent`
				const {bar} = foo;
				const {a} = bar;
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				const bar = foo.b;
			`,
			suggestions: [outdent`
				const {a, b} = foo;
				const bar = b;
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(foo.b);
				console.log(foo.b);
			`,
			suggestions: [outdent`
				const {a, b} = foo;
				console.log(b);
				console.log(foo.b);
			`, outdent`
				const {a, b} = foo;
				console.log(foo.b);
				console.log(b);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {
					a: {
						b
					}
				} = foo;
				console.log(foo.a.c);
			`,
		}),
		invalidTestCase({
			code: outdent`
				const {
					a: {
						b
					}
				} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {
					a: {
						b
					}, a
				} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {
					a: {
						b
					}
				} = foo;
				console.log(foo.c);
			`,
			suggestions: [outdent`
				const {
					a: {
						b
					}, c
				} = foo;
				console.log(c);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = this;
				console.log(this.a);
			`,
			suggestions: [outdent`
				const {a} = this;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a: b} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {a: b} = foo;
				console.log(b);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a: b, c} = foo;
				console.log(foo.d);
			`,
			suggestions: [outdent`
				const {a: b, c, d} = foo;
				console.log(d);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log('foo', foo.b);
			`,
			suggestions: [outdent`
				const {a, b} = foo;
				console.log('foo', b);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(
					'foo', // comment
					foo.b // comment
				);
			`,
			suggestions: [outdent`
				const {a, b} = foo;
				console.log(
					'foo', // comment
					b // comment
				);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				function bar() {
					console.log(foo.a);
				}
			`,
			suggestions: [outdent`
				const {a} = foo;
				function bar() {
					console.log(a);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				const {b} = foo;
				console.log(foo.c);
			`,
			suggestions: [outdent`
				const {a} = foo;
				const {b, c} = foo;
				console.log(c);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(!foo.a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				console.log(!a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a, ...b} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {a, ...b} = foo;
				console.log(a);
			`],
		}),
		// Actual message
		{
			code: outdent`
				const {
					a: {
						b
					}
				} = foo;
				console.log(foo.a.c);
			`,
			errors: [{
				message: 'Use destructured variables over properties.',
			}],
		},
		{
			code: outdent`
				const {a} = foo;
				console.log(foo.a);
			`,
			errors: [{
				message: 'Use destructured variables over properties.',
				suggestions: [{
					desc: 'Replace `foo.a` with destructured property `a`.',
					output: outdent`
						const {a} = foo;
						console.log(a);
					`,
				}],
			}],
		},
	],
});

test.babel({
	valid: [
		outdent`
			const {a, ...b} = bar;
			console.log(bar.c);
		`,
	],
	invalid: [
		invalidTestCase({
			code: outdent`
				const {a, ...b} = bar;
				console.log(bar.a);
			`,
			suggestions: [outdent`
				const {a, ...b} = bar;
				console.log(a);
			`],
		}),
	],
});
