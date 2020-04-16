import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/consistent-destructuring';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const invalidTestCase = ({code, correctCode}) => {
	return {
		code,
		output: code,
		errors: [{
			ruleId: 'consistent-destructuring',
			messageId: 'consistentDestructuring',
			suggestions: correctCode ? [{
				messageId: 'consistentDestructuringSuggest',
				output: correctCode
			}] : []
		}]
	};
};

ruleTester.run('consistent-destructuring', rule, {
	valid: [
		'console.log(foo.a, foo.b);',
		'const foo = 10;',
		'const foo = bar;',
		'const {foo} = 10;',
		'const {foo} = null;',
		'const {foo} = this;',
		'const foo = {a: 1, b: 2};',
		`const {a} = foo;
		console.log(a);`,
		outdent`
			const {a} = foo;
			console.log(a, foo.b());
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
			const {a} = foo;
			delete foo.a;
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
		`
	],
	invalid: [
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(foo.a);
			`,
			correctCode: outdent`
				const {a} = foo;
				console.log(a);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(a, foo.b);
			`,
			correctCode: outdent`
				const {a, b} = foo;
				console.log(a, b);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo.bar;
				console.log(foo.bar.a);
			`,
			correctCode: outdent`
				const {a} = foo.bar;
				console.log(a);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {bar} = foo;
				const {a} = foo.bar;
			`,
			correctCode: outdent`
				const {bar} = foo;
				const {a} = bar;
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				const bar = foo.b;
			`,
			correctCode: outdent`
				const {a, b} = foo;
				const bar = b;
			`
		}),
		invalidTestCase({
			code: outdent`
				const {
					a: {
						b
					}
				} = foo;
				console.log(foo.a.c);
			`
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
			correctCode: outdent`
				const {
					a: {
						b
					}, a
				} = foo;
				console.log(a);
			`
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
			correctCode: outdent`
				const {
					a: {
						b
					}, c
				} = foo;
				console.log(c);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {} = foo;
				console.log(foo.a);
			`,
			correctCode: outdent`
				const {a} = foo;
				console.log(a);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = this;
				console.log(this.a);
			`,
			correctCode: outdent`
				const {a} = this;
				console.log(a);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a: b} = foo;
				console.log(foo.a);
			`,
			correctCode: outdent`
				const {a: b} = foo;
				console.log(b);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a: b} = foo;
				console.log(foo.b);
			`,
			correctCode: outdent`
				const {a: b, b: b_} = foo;
				console.log(b_);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a: b, c} = foo;
				console.log(foo.d);
			`,
			correctCode: outdent`
				const {a: b, c, d} = foo;
				console.log(d);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log('foo', foo.b);
			`,
			correctCode: outdent`
				const {a, b} = foo;
				console.log('foo', b);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(
					'foo', // comment
					foo.b // comment
				);
			`,
			correctCode: outdent`
				const {a, b} = foo;
				console.log(
					'foo', // comment
					b // comment
				);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				function bar() {
					console.log(foo.a);
				}
			`,
			correctCode: outdent`
				const {a} = foo;
				function bar() {
					console.log(a);
				}
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				const b = 'bar';
				console.log(foo.b);
			`,
			correctCode: outdent`
				const {a, b: b_} = foo;
				const b = 'bar';
				console.log(b_);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				const {b} = foo;
				console.log(foo.c);
			`,
			correctCode: outdent`
				const {a} = foo;
				const {b, c} = foo;
				console.log(c);
			`
		}),
		invalidTestCase({
			code: outdent`
				const c = 123;
				const {a} = foo;
				const {b} = foo;
				console.log(foo.c);
			`,
			correctCode: outdent`
				const c = 123;
				const {a} = foo;
				const {b, c: c_} = foo;
				console.log(c_);
			`
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(!foo.a);
			`,
			correctCode: outdent`
				const {a} = foo;
				console.log(!a);
			`
		})
	]
});
