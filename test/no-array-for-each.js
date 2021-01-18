import {outdent} from 'outdent';
import {test} from './utils/test.js';

test.visualize({
	valid: [
		'new foo.forEach(element => bar())',
		'forEach(element => bar())',
		'foo.notForEach(element => bar())'
	],
	invalid: [
		// Not fixable
		'foo.forEach?.(element => bar(element))',
		'(foo.forEach(element => bar(element)))',
		'foo.forEach(element => bar(element), thisArgument)',
		'foo.forEach()',
		'const baz = foo.forEach(element => bar(element))',
		'foo?.forEach(element => bar(element))',
		'foo.forEach(bar)',
		'foo.forEach(async function(element) {})',
		'foo.forEach(function * (element) {})',
		'foo.forEach(() => bar())',
		'foo.forEach((element, index, array) => bar())',
		// Ideally this should be fixable, but hard to know variable conflicts
		'foo.forEach(({property}) => bar(property))',

		// Can't turn `return` to `continue`
		outdent`
			foo.forEach(element => {
				do {
					return
				} while (element)
			});
		`,
		outdent`
			foo.forEach(element => {
				while (element) {
					return;
				}
			});
		`,
		outdent`
			foo.forEach(element => {
				for (let i = 0; i < 2; i++) {
					return;
				}
			});
		`,
		outdent`
			foo.forEach(element => {
				for (let i in element) {
					return;
				}
			});
		`,
		outdent`
			foo.forEach(element => {
				for (let i of element) {
					return;
				}
			});
		`,
		// `ReturnStatement` in `switch` is fixable
		outdent`
			foo.forEach(element => {
				switch (element) {
					case 1:
						break;
					case 2:
						return;
				}
			});
		`,

		// `parameters`
		'foo.forEach(foo => bar());',
		outdent`
			const foo = [];
			foo.forEach(foo => bar());
		`,
		outdent`
			const foo = [];
			function unicorn() {
				foo.forEach(foo => bar());
			}
		`,
		'index.forEach((a, index) => bar());',
		outdent`
			const index = [];
			index.forEach((a, index) => bar());
		`,
		outdent`
			const index = [];
			function unicorn() {
				index.forEach((a, index) => bar());
			}
		`,
		'a[foo].forEach(foo => bar());',
		outdent`
			const foo = 1;
			a[foo].forEach(foo => bar());
		`,
		outdent`
			const foo = 1;
			function unicorn() {
				a[foo].forEach(foo => bar());
			}
		`,
		'a[index].forEach((b, index) => bar());',
		'a((foo) => foo).forEach(foo => bar());',
		'a((foo, index) => foo + index).forEach((foo, index) => bar());',
		outdent`
			const foo = [];
			const index = 1;
			a.forEach((foo, index) => foo[index]);
		`,

		// `FunctionExpression.id`
		outdent`
			foo.forEach(function a(element) {
				bar(a)
			})
		`,
		outdent`
			foo.forEach(function a(element) {
				function b() {
					bar(a)
				}
			})
		`,
		outdent`
			foo.forEach(function a(element) {
				function b(a) {
					bar(a)
				}
			})
		`,

		// This
		outdent`
			foo.forEach(function(element) {
				bar(this)
			})
		`,
		outdent`
			foo.forEach(function(element) {
				function b() {
					bar(this)
				}
			})
		`,
		outdent`
			foo.forEach(function(element) {
				const x = b => {
					bar(this)
				}
			})
		`,
		outdent`
			foo.forEach((element) => {
				bar(this)
			})
		`,

		// `arguments`
		outdent`
			foo.forEach(function(element) {
				bar(arguments)
			})
		`,
		outdent`
			foo.forEach(function(element) {
				function b() {
					bar(arguments)
				}
			})
		`,
		outdent`
			foo.forEach(function(element) {
				const b = () => {
					bar(arguments)
				}
			})
		`,
		outdent`
			foo.forEach((element) => {
				bar(arguments)
			})
		`,

		// Auto-fix
		outdent`
			foo.forEach(function (element) {
				bar(element);
			});
		`,
		outdent`
			foo.forEach(function withName(element) {
				bar(element);
			});
		`,
		outdent`
			foo.forEach((element) => {
				bar(element);
			});
		`,
		'foo.forEach((element) => bar(element));',
		outdent`
			foo.forEach(function (element, index) {
				bar(element, index);
			});
		`,
		outdent`
			foo.forEach(function withName(element, index) {
				bar(element, index);
			});
		`,
		outdent`
			foo.forEach((element, index) => {
				bar(element, index);
			});
		`,
		'foo.forEach((element, index) => bar(element, index));',
		// Array is parenthesized
		'(foo).forEach((element, index) => bar(element, index))',
		'(0, foo).forEach((element, index) => bar(element, index))',
		// Trailing comma
		outdent`
			foo.forEach(function (element) {
				bar(element);
			},);
		`,
		outdent`
			foo.forEach(function withName(element) {
				bar(element);
			},);
		`,
		outdent`
			foo.forEach((element) => {
				bar(element);
			},);
		`,
		'foo.forEach((element) => bar(element),);',
		// Last semi token
		outdent`
			foo.forEach((element) => bar(element))
			;[foo].pop();
		`,
		outdent`
			foo.forEach((element) => {
				bar(element);
			});
			function noneRelatedFunction() {
				while (element) {
					return;
				}
			}
		`,
		// `callback` is parenthesized
		'foo.forEach((((((element => bar(element)))))));',
		outdent`
			foo.forEach((element) => {
				if (1) {
					return;
				}
				if (1) {
					return
				}
				if (1) {
					return!true;
				}
				if (1) {
					return!true
				}
				if (1) {
					return bar();
				}
				if (1) {
					return bar()
					unreachable();
				}
				if (1) {
					return {};
				}
				if (1) {
					return ({});
				}
				if (1) {
					return {a} = a;
				}
				if (1) {
					return [a] = a;
				}
				if (1) {
					foo
					return []
				}
				if (1) {
					foo
					return [foo] = bar;
				}
			});
		`
	]
});
