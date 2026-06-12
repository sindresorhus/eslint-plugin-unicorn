import outdent from 'outdent';
import {getTester} from './utils/test.js';

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
			const {a} = foo;
			console.log(a, foo.b);
		`,
		outdent`
			const {chrome, ie, safari} = module;
			if (!module.edge && ie) {
				module.edge = '12';
			}
			console.log(chrome, safari, module.edge);
		`,
		outdent`
			const {getPrototypeOf} = Object;
			if (getPrototypeOf(object) === Object.prototype) {
				console.log(object);
			}
		`,
		outdent`
			const {request: {cache, mode, url}} = event;
			doSomething(cache, mode, url);
			doAnother(event.request);
		`,
		outdent`
			const {a} = this;
			if (a) {
				console.log(this.expensive);
			}
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
			const {a} = foo.bar;
			console.log(foo.bar.a);
		`,
		outdent`
			const {a} = foo.bar;
			foo.bar = other;
			console.log(foo.bar.a);
		`,
		outdent`
			const {a} = foo.bar;
			foo.bar++;
			console.log(foo.bar.a);
		`,
		outdent`
			const {a} = foo.bar;
			delete foo.bar;
			console.log(foo.bar.a);
		`,
		outdent`
			const {a} = this.foo;
			this.foo = other;
			console.log(this.foo.a);
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
			const {a} = this;
			function foo() {
				console.log(this.a);
			}
		`,
		outdent`
			const {a} = this.foo;
			function foo() {
				console.log(this.foo.a);
			}
		`,
		outdent`
			const {a} = this;
			class Foo {
				static {
					console.log(this.a);
				}
			}
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
			const t = {a: {b: {c: 0, d: 1, e: 2}}};
			const {
				a: {
					b: {c, ...other}
				}
			} = t;
			const tt = {...t, a: {...t.a, b: other}};
		`,
		outdent`
			const t = {
				get a() {
					return {b: {c: 0, d: 1, e: 2}};
				}
			};
			const {
				a: {
					b: {c, ...other}
				}
			} = t;
			console.log(t.a, other);
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
			const {a} = foo;
			foo.a = 1;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			foo.a = 1;
			console.log((foo).a);
		`,
		outdent`
			const {a} = foo;
			foo.a++;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			delete foo.a;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			({a: foo.a} = bar);
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			[foo.a] = bar;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			[...foo.a] = bar;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			for (foo.a of bar) {}
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			for ([foo.a] of bar) {}
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			for ([...foo.a] of bar) {}
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			for (foo.a in bar) {}
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			mutate();
			console.log(foo.a);
			function mutate() {
				foo.a = 1;
			}
		`,
		outdent`
			let {a} = foo;
			a = 1;
			console.log(foo.a);
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
		outdent`
			const {'a': b} = foo;
			console.log(foo.a);
		`,
		outdent`
			const {[a]: b} = foo;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			const bar = foo.b;
		`,
		outdent`
			const {a} = foo;
			console.log(foo.b);
			console.log(foo.b);
		`,
		outdent`
			const {
				a: {
					b
				}
			} = foo;
			console.log(foo.a.c);
		`,
		outdent`
			const {
				a: {
					b
				}
			} = foo;
			console.log(foo.a);
		`,
		outdent`
			const {
				a: {
					b,
					...other
				} = fallback
			} = foo;
			console.log(foo.a, b, other);
		`,
		outdent`
			const {
				a: [
					b,
					...other
				]
			} = foo;
			console.log(foo.a, b, other);
		`,
		outdent`
			const {
				a: {
					b
				}
			} = foo;
			console.log(foo.c);
		`,
		outdent`
			const {} = foo;
			console.log(foo.a);
		`,
		outdent`
			const {a: b, c} = foo;
			console.log(foo.d);
		`,
		outdent`
			const {a} = foo;
			console.log('foo', foo.b);
		`,
		outdent`
			const {a} = foo;
			console.log(
				'foo', // comment
				foo.b // comment
			);
		`,
		outdent`
			const {a} = foo;
			const {b} = foo;
			console.log(foo.c);
		`,
		outdent`
			console.log(foo.a);
			const {a} = foo;
		`,
		outdent`
			console.log(foo.a);
			const {a: value} = foo;
		`,
		outdent`
			const value = foo.a, {a} = foo;
		`,
		outdent`
			let foo = bar;
			const {a} = foo;
			reassign();
			console.log(foo.a);
			function reassign() {
				foo = baz;
			}
		`,
		outdent`
			let foo = bar;
			const {a} = foo;
			function reassign() {
				foo = baz;
			}
			console.log(foo.a);
		`,
		outdent`
			let foo = bar;
			const {a} = foo;
			foo = baz;
			console.log(foo.a);
		`,
		outdent`
			let foo = bar;
			const {a} = foo;
			{
				foo = baz;
			}
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			{
				const foo = bar;
				console.log(foo.a);
			}
		`,
		outdent`
			const {a} = foo;
			{
				const a = 1;
				console.log(foo.a);
			}
		`,
		outdent`
			const {a: value} = foo;
			{
				const value = 1;
				console.log(foo.a);
			}
		`,
		outdent`
			function getContainerStatus(status, container) {
				const {containerStatuses = [], initContainerStatuses = []} = status;
				const statuses = containerStatuses.concat(...initContainerStatuses);

				return statuses.find(status => status.name === container.name);
			}
		`,
		outdent`
			function switchClassToObject(node, sourceCode) {
				const {type, id, body, parent} = node;

				for (const node of body.body) {
					if (
						node.type === 'ClassProperty'
						&& node.value
						&& sourceCode.getText(node).includes('this')
					) {
						return;
					}
				}

				return {type, id, body, parent};
			}
		`,
	],
	invalid: [
		invalidTestCase({
			code: outdent`
				let foo = bar;
				foo = baz;
				const {a} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				let foo = bar;
				foo = baz;
				const {a} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				let foo = bar;
				const {a} = foo;
				console.log(foo.a);
				foo = baz;
			`,
			suggestions: [outdent`
				let foo = bar;
				const {a} = foo;
				console.log(a);
				foo = baz;
			`],
		}),
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
				const {
					a: {
						b,
						...other
					},
					a
				} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {
					a: {
						b,
						...other
					},
					a
				} = foo;
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
				const {a} = this;
				const foo = () => this.a;
			`,
			suggestions: [outdent`
				const {a} = this;
				const foo = () => a;
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					static {
						const {a} = this;
						console.log(this.a);
					}
				}
			`,
			suggestions: [outdent`
				class Foo {
					static {
						const {a} = this;
						console.log(a);
					}
				}
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
				const {a} = foo;
				const {b} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				const {b} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a: first} = foo;
				console.log(foo.a);
				const {a: second} = foo;
			`,
			suggestions: [outdent`
				const {a: first} = foo;
				console.log(first);
				const {a: second} = foo;
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a: first} = foo;
				const {a: second} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {a: first} = foo;
				const {a: second} = foo;
				console.log(second);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(foo.a);
				foo.a = 1;
			`,
			suggestions: [outdent`
				const {a} = foo;
				console.log(a);
				foo.a = 1;
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				bar.a = 1;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				bar.a = 1;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo.a = 1;
				const {a} = foo;
				console.log(foo.a);
			`,
			suggestions: [outdent`
				foo.a = 1;
				const {a} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				{
					const foo = {};
					foo.a = 1;
				}
				console.log(foo.a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				{
					const foo = {};
					foo.a = 1;
				}
				console.log(a);
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
				const {a} = foo;
				console.log(foo.a); // 2
			`,
			errors: [{
				message: 'Use destructured variables over properties.',
				suggestions: [{
					desc: 'Replace `foo.a` with destructured property `a`.',
					output: outdent`
						const {a} = foo;
						console.log(a); // 2
					`,
				}],
			}],
		},
	],
});

test({
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

test.typescript({
	valid: [
		outdent`
			const {a, b, c}: {a: string; b?: number; c?: number} = params;
			const value = 'b' in params ? params.b : 'c' in params ? params.c : undefined;
		`,
		outdent`
			const {a, b}: {a: string; b?: number} = params;
			if ('b' in params) {
				console.log(params.b);
			}
		`,
		outdent`
			const {a, b}: {a: string; b?: number} = params;
			if ('b' in params && condition) {
				console.log(params.b);
			}
		`,
		outdent`
			const {a, b}: {a: string; b?: number} = params;
			const value = 'b' in params && params.b;
		`,
		outdent`
			const {a, b}: {a: string; b?: number} = params;
			if ('b' in params) {
				const getValue = () => params.b;
			}
		`,
		outdent`
			const {a, b}: {a: string; b?: number} = params;
			if ('b' in params) {
				const getValue = function () {
					return params.b;
				};
			}
		`,
		outdent`
			const {a, b}: {a: string; b?: number} = params;
			if ('b' in params) {
				const value = {
					get() {
						return params.b;
					}
				};
			}
		`,
		outdent`
			const {b}: {b?: number} = params;
			if ('b' in params) {
				console.log(params.b);
			}
		`,
		outdent`
			const {a} = foo;
			foo!.a = 1;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			(foo as Foo).a = 1;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			(<Foo>foo).a = 1;
			console.log(foo.a);
		`,
		outdent`
			const {a} = foo;
			(foo satisfies Foo).a = 1;
			console.log(foo.a);
		`,
	],
	invalid: [
		invalidTestCase({
			code: outdent`
				const {a, b}: {a: string; b?: number; c?: unknown} = params;
				if ('c' in params) {
					console.log(params.b);
				}
			`,
			suggestions: [outdent`
				const {a, b}: {a: string; b?: number; c?: unknown} = params;
				if ('c' in params) {
					console.log(b);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log(foo!.a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log((foo as Foo).a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log((<Foo>foo).a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a} = foo;
				console.log((foo satisfies Foo).a);
			`,
			suggestions: [outdent`
				const {a} = foo;
				console.log(a);
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a, b}: {a: string; b?: number} = params;
				if ('b' in params) {
					class Value {
						get() {
							return params.b;
						}
					}
				}
			`,
			suggestions: [outdent`
				const {a, b}: {a: string; b?: number} = params;
				if ('b' in params) {
					class Value {
						get() {
							return b;
						}
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a, b}: {a: string; b?: number} = params;
				if ('b' in params) {
					class Value {
						accessor value = params.b;
					}
				}
			`,
			suggestions: [outdent`
				const {a, b}: {a: string; b?: number} = params;
				if ('b' in params) {
					class Value {
						accessor value = b;
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a, b}: {a: string; b?: number} = params;
				if ('b' in params) {
					class Value {
						value = params.b;
					}
				}
			`,
			suggestions: [outdent`
				const {a, b}: {a: string; b?: number} = params;
				if ('b' in params) {
					class Value {
						value = b;
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const {a, b}: {a: string; b?: number} = params;
				if ('b' in params) {
					function getValue() {
						return params.b;
					}
				}
			`,
			suggestions: [outdent`
				const {a, b}: {a: string; b?: number} = params;
				if ('b' in params) {
					function getValue() {
						return b;
					}
				}
			`],
		}),
	],
});
