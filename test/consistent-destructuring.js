import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/consistent-destructuring';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const invalidTestCase = (code, correctCode) => {
	return {
		code,
		output: correctCode || code,
		errors: [{message: 'Use destructured variables over properties.'}]
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
		`const {a} = foo;
		console.log(a);`
		`const {a} = foo;
		console.log(a, foo.b());`,
		`const {a} = foo;
		console.log(foo);`,
		`const {a, b} = foo;
		console.log(a, b);`,
		`const {a} = foo.bar;
		console.log(foo.bar);`,
		`const [a] = foo;
		console.log(foo);`,
		`const {a} = this;
		console.log(this);`,
		`const {a} = null;
		console.log(null);`,
		`const {
			a: {
				b
			}
		} = foo;
		console.log(b);`,
		`const {
			a: {
				b
			}
		} = foo;
		console.log(foo.a().b);`,
		`const {
			a: {
				b
			}
		} = foo;
		console.log(b.a);`
	],
	invalid: [
		invalidTestCase(
			`const {a} = foo;
			console.log(foo.a);`,
			`const {a} = foo;
			console.log(a);`
		),
		invalidTestCase(
			`const {a} = foo;
			console.log(a, foo.b);`,
			`const {a, b} = foo;
			console.log(a, b);`
		),
		invalidTestCase(
			`const {a} = foo.bar;
			console.log(foo.bar.a);`,
			`const {a} = foo.bar;
			console.log(a);`
		),
		invalidTestCase(
			`const {bar} = foo;
			const {a} = foo.bar;`,
			`const {bar} = foo;
			const {a} = bar;`
		),
		invalidTestCase(
			`const {a} = foo;
			const bar = foo.b;`,
			`const {a, b} = foo;
			const bar = b;`
		),
		invalidTestCase(
			`const {
			    a: {
				    b
			    }
			} = foo;
			console.log(foo.a.c);`
		),
		invalidTestCase(
			`const {
				a: {
					b
				}
			} = foo;
			console.log(foo.a);`,
			`const {
				a: {
					b
				}, a
			} = foo;
			console.log(a);`
		),
		invalidTestCase(
			`const {
				a: {
					b
				}
			} = foo;
			console.log(foo.c);`,
			`const {
				a: {
					b
				}, c
			} = foo;
			console.log(c);`
		),
		invalidTestCase(
			`const {} = foo;
			console.log(foo.a);`,
			`const {a} = foo;
			console.log(a);`
		),
		invalidTestCase(
			`const {a} = this;
			console.log(this.a);`,
			`const {a} = this;
			console.log(a);`
		),
		invalidTestCase(
			`const {a: b} = foo;
			console.log(foo.b);`,
			`const {a: b, b} = foo;
			console.log(b);`
		),
		invalidTestCase(
			`const {a: b} = foo;
			console.log(foo.a);`,
			`const {a: b, a} = foo;
			console.log(a);`
		),
		invalidTestCase(
			`const {a: b, c} = foo;
			console.log(foo.d);`,
			`const {a: b, c, d} = foo;
			console.log(d);`
		)
	]
});
