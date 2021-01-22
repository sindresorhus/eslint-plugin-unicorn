import {outdent} from 'outdent';
import {test} from './utils/test.js';

test.snapshot({
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
		// A test to make sure function head part range correctly calculated
		'foo.forEach(element => ({}))',
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
		`,
		'node.children.index.forEach((children, index) => process(children, index))',
		'(node?.children?.index).forEach((children, index) => process(children, index))',
		'node[children].index.forEach((children, index) => process(children, index))',
		'(node.children?.[index]).forEach((children, index) => process(children, index))',
		'[{children: 1, index: 1}].forEach((children, index) => process(children, index))',
		'[{[children]: 1, index: 1}].forEach((children, index) => process(children, index))',
		'[{[children]: 1, [index]: 1}].forEach((children, index) => process(children, index))',
		'[{children, index: 1}].forEach((children, index) => process(children, index))',
		'[{children: 1, index}].forEach((children, index) => process(children, index))',
		'[function name() {}].forEach((name, index) => process(name, index))',
		outdent`
			[
				function () {
					function index() {}
				}
			].forEach((name, index) => process(name, index))
		`,
		outdent`
			[
				function () {
					class index {}
				}
			].forEach((name, index) => process(name, index))
		`,
		'[class Foo{}].forEach((Foo, index) => process(Foo, index))',
		'[class Foo{}].forEach((X, Foo) => process(X, Foo))',
		outdent`
			[
				class Foo {
					bar() {}
				}
			].forEach((Foo, bar) => process(Foo, bar))
		`
	]
});

test.typescript({
	valid: [],
	invalid: [
		// https://github.com/vercel/next.js/blob/699a7aeaaa48a6c3611ede7a35af2d9676421de0/packages/next/build/index.ts#L1358
		{
			code: outdent`
				staticPages.forEach((pg) => allStaticPages.add(pg))
				pageInfos.forEach((info: PageInfo, key: string) => {
					allPageInfos.set(key, info)
				})
			`,
			output: outdent`
				for (const pg of staticPages)  allStaticPages.add(pg)
				pageInfos.forEach((info: PageInfo, key: string) => {
					allPageInfos.set(key, info)
				})
			`,
			errors: 2
		},
		// https://github.com/gatsbyjs/gatsby/blob/3163ca67d44b79c727dd3e331fb56b21707877a5/packages/gatsby/src/bootstrap/remove-stale-jobs.ts#L14
		{
			code: outdent`
				const actions: Array<IRemoveStaleJobAction> = []

				state.jobsV2.complete.forEach(
					(job: IGatsbyCompleteJobV2, contentDigest: string): void => {
						if (isJobStale(job)) {
							actions.push(internalActions.removeStaleJob(contentDigest))
						}
					}
				)
			`,
			output: outdent`
				const actions: Array<IRemoveStaleJobAction> = []

				state.jobsV2.complete.forEach(
					(job: IGatsbyCompleteJobV2, contentDigest: string): void => {
						if (isJobStale(job)) {
							actions.push(internalActions.removeStaleJob(contentDigest))
						}
					}
				)
			`,
			errors: 1
		},
		// https://github.com/microsoft/fluentui/blob/20f3d664a36c93174dc32786a9d465dd343dabe5/apps/todo-app/src/DataProvider.ts#L157
		{
			code: 'this._listeners.forEach((listener: () => void) => listener());',
			output: 'for (const listener: () => void of this._listeners)  listener();',
			errors: 1
		},
		// https://github.com/angular/angular/blob/4e8198d60f421ce120e3a6b57afe60a9332d2692/packages/animations/browser/src/render/transition_animation_engine.ts#L1636
		{
			code: outdent`
				const cloakVals: string[] = [];
				elements.forEach(element => cloakVals.push(cloakElement(element)));
			`,
			output: outdent`
				const cloakVals: string[] = [];
				for (const element of elements)  cloakVals.push(cloakElement(element));
			`,
			errors: 1
		}
	]
});
