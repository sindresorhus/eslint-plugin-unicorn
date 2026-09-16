import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			function foo() {
				if (condition) {
					doSomething();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition)
					doSomething();
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}

				finish();
			}
		`,
		outdent`
			if (condition) {
				doSomething();
				doSomethingElse();
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				} else {
					doOtherThing();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
				} else if (otherCondition) {
					doOtherThing();
				}
			}
		`,
		'const foo = () => condition ? doSomething() : doOtherThing();',
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			options: [{maximumStatements: 2}],
		},
		{
			code: outdent`
				function foo() {
					if (condition) {}
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition);
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition) {
						;(event.target as HTMLInputElement).blur();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			const foo = function() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			};
		`,
		outdent`
			const foo = () => {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			};
		`,
		outdent`
			const object = {
				foo() {
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				},
			};
		`,
		outdent`
			class Foo {
				bar() {
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				}
			}
		`,
		outdent`
			callback(function() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			});
		`,
		outdent`
			function foo() {
				if (!condition) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (! /* Keep this comment with the condition. */ condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (!/* Keep this comment with the condition. */ condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (foo || bar) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (foo === bar) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					if (foo as boolean) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (foo!) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (<boolean>foo) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (foo satisfies boolean) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			function foo() {
				if (condition) {
					// Keep this comment.
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) /* no autofix */ {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					let value = getValue();
					value = updateValue(value);
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					var value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					const {value} = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					const value = getValue();
					const result = transform(value);
					doSomething(result);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					const [first, second] = getValues();
					let total = first + second;
					doSomething(total);
				}
			}
		`,
		outdent`
			function foo(object) {
				if (object.value) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function value() {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			const foo = function value() {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			};
		`,
		outdent`
			function foo(items) {
				if (items.some(value => value.enabled)) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						const element = <div />;
						doSomething(element);
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		outdent`
			function foo(event) {
				if (
					event.key === 'Escape'
					&& event.isTrusted
				) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(event) {
				if (
					// Keep this comment with the condition.
					event.altKey
					&& event.isTrusted
				) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(event) {
				if (event.altKey /* Keep this comment with the condition. */ && event.isTrusted) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(event) {
				if (event.altKey /* Keep this trailing condition comment. */) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(event) {
				if (event.altKey // Keep this trailing condition comment.
				) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		{
			code: outdent`
				export default mem((selector: string | ((clickedItem: HTMLElement) => string)): EventHandler => event => {
					if (event.altKey && event.isTrusted) {
						const clickedItem = event.delegateTarget;

						// \`parentElement\` is the anchor because \`clickedItem\` might be hidden/replaced after the click
						const resetScroll = preserveScroll(clickedItem.parentElement!);
						clickAllExcept(typeof selector === 'string' ? selector : selector(clickedItem), clickedItem);
						resetScroll();
					}
				});
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			function foo() {
				if (value) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (getCondition(() => value)) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (getCondition(function() {
					return value;
				})) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(object) {
				if (object[value]) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(value) {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo({value}) {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			const foo = function value(parameter) {
				if (condition) {
					const parameter = getValue();
					doSomething(parameter);
				}
			};
		`,
		outdent`
			function foo() {
				if (eval('typeof value === "undefined"')) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (eval('condition')) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					function getValue() {}
					doSomething(getValue);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					class Value {}
					doSomething(Value);
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						type Value = string;
						doSomething<Value>();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (condition) {
						interface Value {
							key: string;
						}
						doSomething<Value>();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (condition) {
						enum Value {
							Key,
						}
						doSomething(Value.Key);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (condition) {
						namespace Value {
							export const key = 'value';
						}
						doSomething(Value.key);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (condition) {
						module Value {
							export const key = 'value';
						}
						doSomething(Value.key);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			function foo() {
				if (condition) {
					using resource = getResource();
					doSomething(resource);
				}
			}
		`,
		outdent`
			async function foo() {
				if (condition) {
					await using resource = getResource();
					doSomething(resource);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething(\`
						value
					\`);
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething('value\\
						value');
					doSomethingElse();
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething(<div>
							value
						</div>);
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				} // Trailing comment.
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
				// Following comment.
			}
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething();
					}
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition)
						doSomething();
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition)
						doSomething(); // Trailing comment.
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition)
						doSomething(
							value,
						);
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition) {
						;(event.target as HTMLInputElement).blur();
					}
				}
			`,
			options: [{maximumStatements: 0}],
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: outdent`
				function foo() {
					doSomethingBefore();
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			output: outdent`
				function foo() {
					doSomethingBefore();
					if (!condition) {
						return;
					}

					doSomething();
					doSomethingElse();
				}
			`,
			errors: [{messageId: 'prefer-early-return'}],
		},
		{
			code: outdent`
				function foo() {
					before();
					if (condition) {
						var value = getValue();
						use(value);
					}
				}
			`,
			output: outdent`
				function foo() {
					before();
					if (!condition) {
						return;
					}

					var value = getValue();
					use(value);
				}
			`,
			errors: [{messageId: 'prefer-early-return'}],
		},
	],
});

test.snapshot({
	valid: [
		'function foo() {}',
		'function foo() { before(); }',
		'function foo() { before(); if (condition) { first(); } }',
		'function foo() { before(); if (condition) { first(); second(); } after(); }',
		'function foo() { before(); if (condition) { first(); second(); }; }',
		'function foo() { before(); if (condition) { first(); second(); } else { other(); } }',
		'function foo() { before(); { if (condition) { first(); second(); } } }',
		{code: 'function foo() { before(); if (condition) {} }', options: [{maximumStatements: 0}]},
		{code: 'function foo() { before(); if (condition); }', options: [{maximumStatements: 0}]},
		{code: 'function foo() { before(); if (condition) { first(); second(); } }', options: [{maximumStatements: 2}]},
	],
	invalid: [
		'const foo = function() { before(); if (condition) { first(); second(); } };',
		'const foo = () => { before(); if (condition) { first(); second(); } };',
		'const object = {foo() { before(); if (condition) { first(); second(); } }};',
		'class Foo { method() { before(); if (condition) { first(); second(); } } }',
		'async function foo() { before(); if (condition) { first(); second(); } }',
		'function* foo() { before(); if (condition) { first(); second(); } }',
		{code: 'function foo() { before(); if (condition) { first(); } }', options: [{maximumStatements: 0}]},
		{code: 'function foo() { before(); if (condition) first(); }', options: [{maximumStatements: 0}]},
		{code: 'function foo() { before(); if (condition) { first(); second(); third(); } }', options: [{maximumStatements: 2}]},
		{code: 'function foo() { before(); if (condition as boolean) { first(); second(); } }', languageOptions: {parser: parsers.typescript}},
		outdent`
			function foo() {
				const ready = prepare();
				// Keep this comment before the guard.
				if (ready) {
					// Keep this comment with the moved body.
					first();
					second();
				}
			}
		`,
	],
});

for (const kind of ['let', 'const']) {
	test({
		valid: [],
		invalid: [
			{
				code: `function foo() { before(); if (condition) { ${kind} value = getValue(); use(value); } }`,
				errors: [{messageId: 'prefer-early-return', suggestions: []}],
			},
		],
	});
}

// Short bodies can opt in to conditional wrapping.
test.snapshot({
	valid: [
		'function foo() { if (!condition) { return; } work(); }',
		{
			code: 'function foo() { if (!condition) { return; } work(); }',
			options: [{checkShortBodies: false}],
		},
		{
			code: 'function foo() { if (!condition) { return; } work(); }',
			options: [{checkShortBodies: true, maximumStatements: 0}],
		},
		{
			code: 'function foo() { if (!condition) { return; } work(); finish(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { prepare(); if (!condition) { return; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { prepare(); return; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } else if (other) { work(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } else { work(); } finish(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } else {} }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } ; }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return undefined; } work(); }',
			options: [{checkShortBodies: true}],
		},
	],
	invalid: [
		{
			code: 'function foo() { if (!condition) { return; } return 5; }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (condition) { return; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) return; work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } else { work(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) return; else work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } work(); finish(); }',
			options: [{checkShortBodies: true, maximumStatements: 2}],
		},
		{
			code: 'function foo() { if (!condition) { return; } else { work(); finish(); } }',
			options: [{checkShortBodies: true, maximumStatements: 2}],
		},
		{
			code: 'function foo() { if (!condition) { return; } ;work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } if (other) { work(); finish(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!(condition && other)) { return; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if ((condition)) { return; } (work)(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (value?.active) { return; } work?.(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } const value = work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } function work() {} }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } else { const value = work(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { /* keep */ return; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } /* keep */ work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } work(/* keep */); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (condition as boolean) { return; } work(); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo() { if (condition!) { return; } work(); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo() { if (condition satisfies boolean) { return; } work(); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo() { if (<boolean>condition) { return; } work(); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'function foo() {\n	if (!condition) {\n		return;\n	}\n\n	performWork();\n}',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() {\n	if (condition) { return; }\n	performWork(\n		value,\n	);\n}',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() {\n	if (condition) { return; }\n	performWork(); // keep here\n}',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (/* condition */ condition) { return; } performWork(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } else { /* keep */ performWork(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } const {value} = source; }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } class Example {} }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } var value = performWork(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } { const value = performWork(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } performWork(`first\nsecond`); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } else { performWork(`first\nsecond`); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'function foo() { if (!condition) { return; } performWork(<Component value={value} />); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'function foo() { if (!condition) { return; } performWork(<div>first\nsecond</div>); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
});
