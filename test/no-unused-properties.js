import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-unused-properties';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const babelEslintRuleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parser: 'babel-eslint',
	parserOptions: {
		sourceType: 'module'
	}
});

const error = {
	ruleId: 'no-unused-properties',
	message: 'Property `u` is defined but never used.'
};

ruleTester.run('no-unused-properties', rule, {
	valid: [
		`
const foo = {a: 1, b: 2};
console.log(foo.a, foo.b);
`,
		`
const foo = {'a': 1, "b": 2};
function main() {
	console.log(foo.a, foo.b);
}
`,
		`
const foo = {a: 1, b: 2};
console.log(foo['a'], foo["b"]);
`,
		`
const foo = {["a"]: 1, ['b']: 2};
console.log(foo['a'], foo["b"]);
`,
		`
const foo = {['a']: 1, ["b"]: 2};
console.log(foo['a'], foo["b"]);
`,
		`
const a = Symbol('a');
const b = 'b';
const c = {};
const foo = {
	[a]: 1,
	[b]: 2,
	[c]: 3
};
console.log(foo[a]);
`,
		`
const a = 'a';
const foo = {
	[a]: 1,
};
const a_ = a;
console.log(foo[a_]);
`,
		`
const a = 'a';
const foo = {
	[a]: 1,
};
console.log(foo[x]);
`,
		`
const a = Symbol('a');
const foo = {[a]: 1};
console.log(foo);
`,
		`
const b = 'b';
const foo = {[b]: 2};
console.log(foo);
`,
		`
const c = {};
const foo = {[c]: 3};
console.log(foo);
`,

		`
const foo = {a: 1, b: 2};
const {a, b} = foo;
`,
		`
const foo = {a: 1, b: 2};
({a, b} = foo);
`,

		`
const foo = {a: 1, b: 2};
console.log(foo[x]);
`,
		`
const foo = {a: 1, b: 2};
function main() {
	console.log(foo[x]);
}
`,

		`
const foo = {a: { b: 2 }};
console.log(foo.a[x]);
`,

		`
const foo = {a: { b: 2 }};
console.log(foo.a);
`,

		`
const foo = {a: 1, b: 2};
console.log(foo);
`,
		`
const foo = {a: 1, b: 2};
function main() {
	console.log(foo);
}
`,

		`
const foo = {
	a: 1,
	f() {
		return this.a;
	}
};
`,
		`
const foo = {
	a: 1,
	f() {
		return this;
	}
};
`,

		`
const foo = {
	a: 1
};
foo.f = function () { return this.a };
`,
		`
const foo = {
	a: 1
};
foo.f = function () { return this };
`,

		`
const foo = {
	a: {
		b: 1
	}
};
foo.a.f = function () { return this };
`,

		`
const foo = {
	a: {
		b: 1
	}
};
Object.assign(foo.a, {
	f() {
		return this;
	}
});
`,

		`
const foo = {
	a: 1,
	__proto__: {
		c: 3
	}
};
console.log(foo.a);
`,
		`
const bar = {
	b: 2
};
const foo = {
	a: 1,
	['__proto__']: bar
};
console.log(foo.a);
`,

		`
const foo = {
	a: 1
};
foo.hasOwnProperty(x);
`,

		`
const foo = {
	a: {
		b: {
			c: 1
		}
	}
};
console.log(foo.a.b.c);
`,

		`
const foo = {a: 1, b: 2};
`,

		`
const foo = {};
foo.a = 1;
foo.b = 2;
console.log(foo.a);
`,

		`
var foo = {};
foo.a = 1;
foo.b = 2;
console.log(foo.a);
`,

		`
var foo = {a: 1, b: 2};
foo = { a: 3, b: 4 };
console.log(foo.a);
`,

		`
const foo = function () {};
`,
		`
const foo = [];
`,
		`
let foo;
`,
		`
var foo;
`,
		`
function foo() {}
foo();
`,

		`
const foo = {};
export default foo;
`,
		`
var foo = {
	a: {
		b: {
			c: {
				d: 1
			}
		}
	}
};
export {foo};
`,
		`
var foo = {
	a: 1
};
module.exports = foo;
`,
		`
var foo = {
	a: 1
};
exports.foo = foo;
`
	],

	invalid: [
		{
			code: `
const foo = {a: 1, u: 2};
console.log(foo.a);
`,
			errors: [error]
		},
		{
			code: `
const foo = {"a": 1, "u": 2};
console.log(foo.a);
`,
			errors: [error]
		},
		{
			code: `
const foo = {a: 1, u: 2};
console.log(foo['a']);
`,
			errors: [error]
		},
		{
			code: `
const foo = {a: 1, u: 2};
function main() {
	console.log(foo.a);
}
`,
			errors: [error]
		},

		{
			code: `
const foo = {a: 1, u: 2};
const {a} = foo;
`,
			errors: [error]
		},

		{
			code: `
const foo = {a: 1, u: 2};
({a} = foo);
`,
			errors: [error]
		},

		{
			code: `
const foo = {
	a: 1,
	u: {
		b: 2,
		c: 3
	}
};
console.log(foo.a);
`,
			errors: [error]
		},

		{
			code: `
const foo = {
	a: 1,
	b: {
		c: 2,
		u: 3
	}
};
console.log(foo.a, foo.b.c);
`,
			errors: [error]
		},
		{
			code: `
const foo = {
	a: 1,
	b: {
		c: 2,
		u: 3
	}
};
function main() {
	console.log(foo.a, foo.b.c);
}
`,
			errors: [error]
		},
		{
			code: `
const foo = {
	a: {
		b: 1
	},
	u: 2
};
foo.a.f = function () { return this };
`,
			errors: [error]
		},

		{
			code: `
const foo = {
	a: 1,
	[u]: 2
};
console.log(foo.a);
`,
			errors: [error]
		},

		{
			code: `
const foo = {
	__proto__: {a: 1},
	b: 2,
	u: 3
};
console.log(foo.b);
`,
			errors: [error]
		}
	]
});

babelEslintRuleTester.run('no-unused-properties', rule, {
	valid: [
		`
const foo = {a: 1, b: 2};
const {a, ...rest} = foo;
`,

		`
const foo = {
	...bar,
};
console.log(foo.a);
`
	],
	invalid: []
});
