import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		'new foo.forEach(element => bar())',
		'forEach(element => bar())',
		'foo.notForEach(element => bar())',
		// #1087
		'React.Children.forEach(children, (child) => {});',
		'Children.forEach(children, (child) => {});',
		// #1508
		outdent`
			await pIteration.forEach(plugins, async pluginName => {
				// My other code...
			});
		`,
		// #1788
		outdent`
			import * as CB from 'strict-callbag-basics';

			CB.pipe(
				CB.interval(1000),
				CB.map(x => x + 1),
				CB.filter(x => x % 2),
				CB.take(5),
				CB.forEach(x => console.log(x))
			);
		`,
		outdent`
			import * as callbagBasics from 'strict-callbag-basics';

			callbagBasics.forEach(value => console.log(value));
		`,
		// #2758
		'Effect.forEach([1,2,3], (n) => Effect.succeed(n))',
		'const map = new Map(); map.forEach(value => console.log(value));',
		'const set = new Set(); set.forEach(value => console.log(value));',
		'const typedArray = new Uint8Array(); typedArray.forEach(value => console.log(value));',
	],
	invalid: [
		'foo.forEach?.(element => bar(element))',
		...[
			'((  foo.forEach(element => bar(element))  ))',

			// Not fixable
			'foo.forEach(element => bar(element), thisArgument)',
			'foo.forEach()',
			'const baz = foo.forEach(element => bar(element))',
			'foo.forEach(bar)',
			'foo.forEach(async function(element) {})',
			'foo.forEach(function * (element) {})',
			'foo.forEach(() => bar())',
			'foo.forEach((element, index, array) => bar())',
			'property.forEach(({property}) => bar(property))',
			'() => foo.forEach()',
			'foo.forEach((element = {}) => call(element))',

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
			'a = foo?.bar.forEach((element) => bar(element));',

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
			'foo?.bar.forEach((element) => bar(element));',
			'foo.bar.forEach((element) => log(element))',
			'foo.bar().forEach((element) => log(element))',
			'(a ? b : c).forEach((element) => log(element))',
			'(a ? b : c()).forEach((element) => log(element))',
			'(foo || bar).forEach((element) => log(element))',
			'(foo || bar()).forEach((element) => log(element))',
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
			`,
			'foo.React.Children.forEach(bar)',
			'NotReact.Children.forEach(bar)',
			'React.NotChildren.forEach(bar)',
			'React?.Children.forEach(bar)',
			'NotChildren.forEach(bar)',
			// Parameters are reassigned
			outdent`
				foo.forEach(element => {
					element ++;
				})
			`,
			outdent`
				foo.forEach(element => {
					const a = -- element;
				})
			`,
			outdent`
				foo.forEach((element, index) => {
					index ++;
					element = 2
				});
			`,
			outdent`
				foo.forEach((element, index) => {
					element >>>= 2;
				});
			`,
			outdent`
				foo.forEach((element, index) => {
					const a = element = 1;
				});
			`,
			outdent`
				foo.forEach((element, index) => {
					let a;
					a >>>= element;
				});
			`,

			// Complicated parameters
			'foo.forEach(({property}) => {bar(property)})',
			'foo.forEach(({foo: {foo: [property]}}) => {bar(property, index)})',
			'foo.forEach((element, {bar: {bar: [index]}}) => {bar(element, index)})',
			'foo.forEach((element = elementDefaultValue, index = indexDefaultValue) => {})',
			'foo.forEach(({}) => {})',
			'foo.forEach(function foo({a, b, c, d}) {})',
			'foo.forEach(function foo({a, b, c, d, foo}) {})',
			'foo.forEach(({foo: property}) => {bar(property)})',
			'foo.forEach(({[foo]: property}) => {bar(property)})',
			outdent`
				foo.forEach(({element}, index) => {
					element &&= 2;
				});
			`,

			// Need switch to `BlockStatement`, #1318
			outdent`
				foo.forEach(_ => {
					if (true) return {};
				})
			`,
			outdent`
				foo.forEach(_ => {
					if (true);
					else return {};
				})
			`,

			// Need insert space after keyword
			'if (true) {} else[foo].forEach((element) => {})',

			// Arrow function body
			'const a = () => ((  foo.forEach(element => bar(element))  ))',
			'const a = () => ((  foo.forEach(element => bar(element))  ));',
			'const a = () => foo.forEach(element => bar(element))',
			'const a = () => foo.forEach(element => bar(element));',
			'const a = () => void foo.forEach(element => bar(element));',
		].flatMap(code => [code, code.replace('.forEach', '?.forEach')]),

		// Should not fix to invalid code
		'1?.forEach((a, b) => call(a, b))',

		// Arrow function body
		'array.forEach((arrayInArray) => arrayInArray.forEach(element => bar(element)));',
		'array.forEach((arrayInArray) => arrayInArray?.forEach(element => bar(element)));',

		// Destructuring assign
		...[
			'({element} = bar)',
			'({element: a} = bar)',
			'({a: element} = bar)',
			'({[element]: a} = bar)',
			'({[a]: element} = bar)',
			'({element = a} = bar)',
			'({a = element} = bar)',
			'[element] = bar',
			'[element = a] = bar',
			'[a = element] = bar',
			'({deep: {element}} = bar)',
			'({deep: {element: a}} = bar)',
			'({deep: {a: element}} = bar)',
			'({deep: {[element]: a}} = bar)',
			'({deep: {[a]: element}} = bar)',
			'({deep: {element = a}} = bar)',
			'({deep: {a = element}} = bar)',
			'({deep: [element]} = bar)',
			'({deep: [element = a]} = bar)',
			'({deep: [a = element]} = bar)',
			'[{element}] = bar',
			'[{element: a}] = bar',
			'[{a: element}] = bar',
			'[{[element]: a}] = bar',
			'[{[a]: element}] = bar',
			'[{element = a}] = bar',
			'[{a = element}] = bar',
			'[[element]] = bar',
			'[[element = a]] = bar',
			'[[a = element]] = bar',
		].map(code => outdent`
			foo.forEach(element => {
				${code};
			});
		`),
		outdent`
			foo.forEach(element => {
				[
					bar = ((element) => {
						[element] = array;
					})(element)
				] = baz;
			});
		`,
		outdent`
			foo.forEach(element => {
				[
					bar = ((element = array) => element)(element)
				] = baz;
			});
		`,
		outdent`
			foo.forEach(element => {
				[
					bar = (([element] = array) => element)(element)
				] = baz;
			});
		`,
		outdent`
			foo.forEach(element => {
				for (element in bar);
			});
		`,
		outdent`
			foo.forEach(element => {
				for ([{element}] of bar);
			});
		`,
		outdent`
			foo.forEach(element => {
				for (key in element);
				for (item of element);
			});
		`,
		outdent`
			foo.forEach((element, index) => {
				for (index of bar);
			});
		`,
		'array.forEach((element, index = element) => {})',
		'array.forEach(({foo}, index = foo) => {})',
		'array.forEach((element, {bar = element}) => {})',
		'array.forEach(({foo}, {bar = foo}) => {})',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: outdent`
				foo.forEach(function(element) {
					delete element;
					console.log(element)
				});
			`,
			errors: 1,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: 'foo.forEach(function(element, element) {})',
			errors: 1,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: 'foo.forEach(function element(element, element) {})',
			errors: 1,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: outdent`
				const CB = [];
				CB.forEach(element => console.log(element));
			`,
			output: outdent`
				const CB = [];
				for (const element of CB) console.log(element);
			`,
			errors: 1,
		},
	],
});

test.typescript({
	valid: [
		'function foo(map: Map<string, string>) { map.forEach(value => console.log(value)); }',
		'function foo(map: ReadonlyMap<string, string>) { map.forEach(value => console.log(value)); }',
		'function foo(map: WeakMap<object, string>) { map.forEach(value => console.log(value)); }',
		'function foo(set: Set<string>) { set.forEach(value => console.log(value)); }',
		'function foo(set: ReadonlySet<string>) { set.forEach(value => console.log(value)); }',
		'function foo(set: WeakSet<object>) { set.forEach(value => console.log(value)); }',
		outdent`
			type Array<T> = Map<T, T>;
			function foo(collection: Array<string>) {
				collection.forEach(value => console.log(value));
			}
		`,
		outdent`
			type ReadonlyArray<T> = ReadonlySet<T>;
			function foo(collection: ReadonlyArray<string>) {
				collection.forEach(value => console.log(value));
			}
		`,
	],
	invalid: [
		// https://github.com/vercel/next.js/blob/699a7aeaaa48a6c3611ede7a35af2d9676421de0/packages/next/build/index.ts#L1358
		{
			code: outdent`
				staticPages.forEach((pg) => allStaticPages.add(pg))
				pageInfos.forEach((info: PageInfo, key: string) => {
					allPageInfos.set(key, info)
				})
			`,
			errors: 2,
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
			errors: 1,
		},
		// https://github.com/microsoft/fluentui/blob/20f3d664a36c93174dc32786a9d465dd343dabe5/apps/todo-app/src/DataProvider.ts#L157
		{
			code: 'this._listeners.forEach((listener: () => void) => listener());',
			errors: 1,
		},
		// https://github.com/angular/angular/blob/4e8198d60f421ce120e3a6b57afe60a9332d2692/packages/animations/browser/src/render/transition_animation_engine.ts#L1636
		{
			code: outdent`
				const cloakVals: string[] = [];
				elements.forEach(element => cloakVals.push(cloakElement(element)));
			`,
			errors: 1,
		},
		{
			code: outdent`
				function foo(collection: string[] | {forEach(callback: (value: string) => void): void}) {
					collection.forEach(value => console.log(value));
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				function foo(array: Array<string>) {
					array.forEach(value => console.log(value));
				}
			`,
			output: outdent`
				function foo(array: Array<string>) {
					for (const value of array) console.log(value);
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				function foo(array: ReadonlyArray<string>) {
					array.forEach(value => console.log(value));
				}
			`,
			output: outdent`
				function foo(array: ReadonlyArray<string>) {
					for (const value of array) console.log(value);
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				function foo(array: [string, string]) {
					array.forEach(value => console.log(value));
				}
			`,
			output: outdent`
				function foo(array: [string, string]) {
					for (const value of array) console.log(value);
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				type Strings = string[];
				function foo(array: Strings) {
					array.forEach(value => console.log(value));
				}
			`,
			output: outdent`
				type Strings = string[];
				function foo(array: Strings) {
					for (const value of array) console.log(value);
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				type Map = string[];
				function foo(array: Map) {
					array.forEach(value => console.log(value));
				}
			`,
			output: outdent`
				type Map = string[];
				function foo(array: Map) {
					for (const value of array) console.log(value);
				}
			`,
			errors: 1,
		},
	],
});

test({
	valid: [
		typeAware('export {}; function foo(map: Map<string, string>) { map.forEach(value => console.log(value)); }'),
		typeAware('export {}; function foo(map: ReadonlyMap<string, string>) { map.forEach(value => console.log(value)); }'),
		typeAware('export {}; function foo(set: Set<string>) { set.forEach(value => console.log(value)); }'),
		typeAware('export {}; function foo(set: ReadonlySet<string>) { set.forEach(value => console.log(value)); }'),
	],
	invalid: [
		{
			...typeAware(outdent`
				declare function getStrings(): string[];
				getStrings().forEach(value => console.log(value));
			`),
			output: outdent`
				declare function getStrings(): string[];
				for (const value of getStrings()) console.log(value);
			`,
			errors: 1,
		},
	],
});

test({
	testerOptions: {
		languageOptions: {
			sourceType: 'script',
			parserOptions: {
				ecmaFeatures: {
					globalReturn: true,
				},
			},
		},
	},
	valid: [
		outdent`
			foo.notForEach(element => bar(element));
			while (true) return;
		`,
	],
	invalid: [
		{
			code: outdent`
				while (true) return;
				foo.forEach(element => bar(element));
			`,
			errors: 1,
		},
		{
			code: outdent`
				foo.forEach(element => {
					bar(element)
					while (true) return;
				});
				while (true) return;
			`,
			errors: 1,
		},
		{
			code: 'return foo.forEach(element => {bar(element)});',
			errors: 1,
		},
		{
			code: outdent`
				foo.forEach(_ => {
					with (a) return {};
				})
			`,
			errors: 1,
		},
	],
});
