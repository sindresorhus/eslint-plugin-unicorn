import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

const linterConfig = {
	plugins: {unicorn: {rules: {'prefer-array-find': rule}}},
	rules: {'unicorn/prefer-array-find': 'error'},
};

const ERROR_ZERO_INDEX = 'error-zero-index';
const ERROR_SHIFT = 'error-shift';
const ERROR_POP = 'error-pop';
const ERROR_AT_ZERO = 'error-at-zero';
const ERROR_AT_MINUS_ONE = 'error-at-minus-one';
const ERROR_SLICE_MINUS_ONE = 'error-slice-minus-one';
const ERROR_DESTRUCTURING_DECLARATION = 'error-destructuring-declaration';
const ERROR_DESTRUCTURING_ASSIGNMENT = 'error-destructuring-assignment';
const ERROR_DECLARATION = 'error-variable';
const SUGGESTION_ID = 'prefer-array-find/suggestion';

const getSuggestionError = (messageId, output, method = 'find') => ({
	messageId,
	suggestions: [{messageId: SUGGESTION_ID, data: {method}, output}],
});

// Replacing indexed function values must preserve their call or tag receiver.
test({
	valid: [
		'const items = array.filter(value => true); items[0]();',
		'let foo = array.filter(bar);foo[0](foo[0])[foo[0]];',
		'const items = array.filter(value => true); items[0]`template`;',
		{
			code: 'const items = array.filter(value => true); items[0]!();',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		...[
			'array.filter(value => true)[0]()',
			'array.filter(predicate)[0]()',
			'array.filter(value => true)[0]?.()',
			'array.filter(value => true)[0]`template`',
			'array?.filter(value => true)[0]()',
			'(array?.filter(value => true)[0])()',
			'array.filter(value => true).slice(-1)[0]()',
			'array.filter(value => true).slice(-1)[0]`template`',
		].map(code => ({code, errors: [{messageId: code.includes('.slice(-1)') ? ERROR_SLICE_MINUS_ONE : ERROR_ZERO_INDEX, suggestions: []}]})),
		...[
			'array.filter(value => true)[0]!()',
			'(array.filter(value => true)[0] as Function)()',
			'(array.filter(value => true)[0] satisfies Function)`template`',
			'array.filter(value => true).slice(-1)[0]!()',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: [{messageId: code.includes('.slice(-1)') ? ERROR_SLICE_MINUS_ONE : ERROR_ZERO_INDEX, suggestions: []}]})),
	],
});

nodeTest('indexed calls retain their original receiver', t => {
	for (const code of [
		'const array = [function () { return this.length; }]; array.filter(value => true)[0]();',
		'const array = [function () { return this.length; }]; array.filter(value => true).slice(-1)[0]();',
		'const array = [function () { return this.length; }]; const items = array.filter(value => true); items[0]();',
	]) {
		const {output, fixed} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(runInNewContext(output), 1);
	}
});

nodeTest('side-effect-free inline callbacks are autofixed', t => {
	for (const callback of ['value => value.id > 1', 'function (value) { return value.id > 1; }', '({id}) => id > 1', '(value, index) => index > 0 && value.id > 1']) {
		for (const values of ['[]', '[{id: 0}, {id: 1}]', '[{id: 2}, {id: 0}, {id: 3}]']) {
			for (const [code, output] of [
				[`${values}.filter(${callback})[0];`, `${values}.find(${callback});`],
				[`${values}.filter(${callback}).shift();`, `${values}.find(${callback});`],
				[`${values}.filter(${callback}).at(0);`, `${values}.find(${callback});`],
				[`const [item] = ${values}.filter(${callback}); item;`, `const item = ${values}.find(${callback}); item;`],
				[`let item; [item] = ${values}.filter(${callback}); item;`, `let item; item = ${values}.find(${callback}); item;`],
				[`const items = ${values}.filter(${callback}); items[0];`, `const item = ${values}.find(${callback}); item;`],
				[`${values}.filter(${callback}).pop();`, `${values}.findLast(${callback});`],
				[`${values}.filter(${callback}).at(-1);`, `${values}.findLast(${callback});`],
				[`${values}.filter(${callback}).slice(-1)[0];`, `${values}.findLast(${callback});`],
				[`${values}.filter(${callback}).slice(-1).pop();`, `${values}.findLast(${callback});`],
			]) {
				const result = linter.verifyAndFix(code, linterConfig);
				t.assert.strictEqual(result.output, output);
				t.assert.strictEqual(result.fixed, true);
				t.assert.deepStrictEqual(result.messages, []);
				t.assert.strictEqual(JSON.stringify(runInNewContext(output)), JSON.stringify(runInNewContext(code)));
			}
		}
	}
});

nodeTest('callbacks with side effects or unknown callbacks stay suggestions', t => {
	for (const [code, original, suggested] of [
		[
			'const calls = []; const item = [1, 2].filter(value => calls.push(value))[0]; JSON.stringify({item, calls});',
			'{"item":1,"calls":[1,2]}',
			'{"item":1,"calls":[1]}',
		],
		[
			'let count = 0; const item = [1, 2].filter(value => (count++, value > 0)).at(-1); JSON.stringify({item, count});',
			'{"item":2,"count":2}',
			'{"item":2,"count":1}',
		],
		[
			'const calls = []; const isPositive = value => calls.push(value); const item = [1, 2].filter(isPositive).shift(); JSON.stringify({item, calls});',
			'{"item":1,"calls":[1,2]}',
			'{"item":1,"calls":[1]}',
		],
		[
			'const calls = []; const item = [1, 2].filter(value => calls.push(value)).pop(); JSON.stringify({item, calls});',
			'{"item":2,"calls":[1,2]}',
			'{"item":2,"calls":[2]}',
		],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(runInNewContext(code), original);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions.length, 1);
		const {range, text} = messages[0].suggestions[0].fix;
		const suggestedCode = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.strictEqual(runInNewContext(suggestedCode), suggested);
	}
});

test({
	valid: [],
	invalid: [
		{
			code: 'const item = values.filter(value => log(value))[0];',
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'const item = values.find(value => log(value));')],
		},
		{
			code: 'const item = values.filter(function (value) { seen.add(value); return value > 0; }).pop();',
			errors: [getSuggestionError(ERROR_POP, 'const item = values.findLast(function (value) { seen.add(value); return value > 0; });', 'findLast')],
		},
		{
			code: 'const [item] = values.filter((value = getDefault()) => value > 0);',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const item = values.find((value = getDefault()) => value > 0);')],
		},
		{
			code: 'const item = values.filter(async value => await check(value)).at(0);',
			errors: [getSuggestionError(ERROR_AT_ZERO, 'const item = values.find(async value => await check(value));')],
		},
		{
			code: 'const item = values.filter(value => value.id === id, context)[0];',
			output: 'const item = values.find(value => value.id === id, context);',
			errors: [{messageId: ERROR_ZERO_INDEX}],
		},
		{
			code: 'const item = values.filter(function (value) { return value.id === id; }).slice(-1).pop();',
			output: 'const item = values.findLast(function (value) { return value.id === id; });',
			errors: [{messageId: ERROR_SLICE_MINUS_ONE}],
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'const view = <div>{values.filter(predicate)[0]}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'const view = <div>{values.find(predicate)}</div>;')],
		},
		{
			code: 'const selected = ((values as number[]).filter(predicate)).at(-1);',
			languageOptions: {parser: parsers.typescript},
			errors: [getSuggestionError(ERROR_AT_MINUS_ONE, 'const selected = ((values as number[]).findLast(predicate));', 'findLast')],
		},
		{
			code: 'values!.filter(predicate).at(0);',
			languageOptions: {parser: parsers.typescript},
			errors: [getSuggestionError(ERROR_AT_ZERO, 'values!.find(predicate);')],
		},
	],
});

// `[0]`
test({
	valid: [
		'array.find(foo)',

		// Known non-array receiver (type information)
		{
			code: 'function f(foo: Set<number>) { return foo.filter(fn)[0]; }',
			languageOptions: {parser: parsers.typescript},
		},

		// Test `[0]`
		'array.filter(foo)',
		'array.filter(foo)[+0]',
		'array.filter(foo)[-0]',
		'array.filter(foo)[1-1]',
		'array.filter(foo)["0"]',
		'array.filter(foo).first',

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter[0]',
		// Not `MemberExpression`
		'filter(foo)[0]',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo)[0]',
		// Computed
		'array[filter](foo)[0]',
		// Not `filter`
		'array.notFilter(foo)[0]',
		// More or less argument(s)
		'array.filter()[0]',
		'array.filter(foo, thisArgument, extraArgument)[0]',
		'array.filter(...foo)[0]',
		// LHS
		'array.filter(foo)[0] += 1',
		'++ array.filter(foo)[0]',
		'array.filter(foo)[0]--',
		'delete array.filter(foo)[0]',
		'[array.filter(foo)[0] = 1] = []',
		// Writing to the first element of the result is not reading from it
		'const foo = array.filter(Boolean); foo[0] = 1;',
		'const foo = array.filter(Boolean); foo[0]++;',
		'const foo = array.filter(Boolean); delete foo[0];',
		'const foo = array.filter(Boolean); for (foo[0] of x) {}',
		'const foo = array.filter(Boolean); ({x: foo[0]} = o);',
		'let foo = array.filter(Boolean); foo[0] += 1;',
	],
	invalid: [
		// A typed array shares `Array#filter()` and `Array#find()`
		{
			code: 'function f(array: Int8Array) { return array.filter(foo)[0]; }',
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'function f(array: Int8Array) { return array.find(foo); }')],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array.filter(foo)[0]',
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'array.find(foo)')],
		},
		{
			code: 'array?.filter(foo)[0]',
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'array?.find(foo)')],
		},
		{
			code: 'array.filter(foo, thisArgument)[0]',
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'array.find(foo, thisArgument)')],
		},
		{
			code: 'array?.filter(foo, thisArgument)[0]',
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'array?.find(foo, thisArgument)')],
		},
	],
});

// `.shift()`
test({
	valid: [
		// Test `.shift()`
		// Not `CallExpression`
		'array.filter(foo).shift',
		// Not `MemberExpression`
		'shift(array.filter(foo))',
		// `callee.property` is not a `Identifier`
		'array.filter(foo)["shift"]()',
		// Computed
		'array.filter(foo)[shift]()',
		// Not `shift`
		'array.filter(foo).notShift()',
		// More or less argument(s)
		'array.filter(foo).shift(extraArgument)',
		'array.filter(foo).shift(...[])',

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter.shift()',
		// Not `MemberExpression`
		'filter(foo).shift()',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo).shift()',
		// Computed
		'array[filter](foo).shift()',
		// Not `filter`
		'array.notFilter(foo).shift()',
		// More or less argument(s)
		'array.filter().shift()',
		'array.filter(foo, thisArgument, extraArgument).shift()',
		'array.filter(...foo).shift()',
	],
	invalid: [
		{
			code: 'array.filter(foo).shift()',
			errors: [getSuggestionError(ERROR_SHIFT, 'array.find(foo)')],
		},
		{
			code: 'array?.filter(foo).shift()',
			errors: [getSuggestionError(ERROR_SHIFT, 'array?.find(foo)')],
		},
		{
			code: 'array.filter(foo, thisArgument).shift()',
			errors: [getSuggestionError(ERROR_SHIFT, 'array.find(foo, thisArgument)')],
		},
		{
			code: 'array?.filter(foo, thisArgument).shift()',
			errors: [getSuggestionError(ERROR_SHIFT, 'array?.find(foo, thisArgument)')],
		},
		{
			code: outdent`
				const item = array
					// comment 1
					.filter(
						// comment 2
						x => x === '🦄'
					)
					// comment 3
					.shift()
					// comment 4
					;
			`,
			errors: [{messageId: ERROR_SHIFT}],
		},
	],
});

// `const [foo] =`
test({
	valid: [
		// Test `const [item] = …`
		// Not `VariableDeclarator`
		'function a([foo] = array.filter(bar1)) {}',
		// Not `ArrayPattern`
		'const foo = array.filter(bar)',
		'const items = array.filter(bar)', // Plural variable name.
		'const {0: foo} = array.filter(bar)',
		// `elements`
		'const [] = array.filter(bar)',
		'const [foo, another] = array.filter(bar)',
		'const [, foo] = array.filter(bar)',
		'const [,] = array.filter(bar)',
		// `RestElement`
		'const [...foo] = array.filter(bar)',

		// Test `.filter()`
		// Not `CallExpression`
		'const [foo] = array.filter',
		// Not `MemberExpression`
		'const [foo] = filter(bar)',
		// `callee.property` is not a `Identifier`
		'const [foo] = array["filter"](bar)',
		// Computed
		'const [foo] = array[filter](bar)',
		// Not `filter`
		'const [foo] = array.notFilter(bar)',
		// More or less argument(s)
		'const [foo] = array.filter()',
		'const [foo] = array.filter(bar, thisArgument, extraArgument)',
		'const [foo] = array.filter(...bar)',
	],
	invalid: [
		{
			code: 'const [foo] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const foo = array.find(bar)')],
		},
		{
			// Plural variable name.
			code: 'const [items] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const items = array.find(bar)')],
		},
		{
			// Array-pattern export is still flagged (unlike the identifier-pattern export)
			code: 'export const [foo] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'export const foo = array.find(bar)')],
		},
		{
			code: 'const [foo] = array.filter(bar, thisArgument)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const foo = array.find(bar, thisArgument)')],
		},
		{
			code: 'const [{foo}] = array.filter(fn);',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const {foo} = array.find(fn);')],
		},
		{
			code: 'const [{foo = bar}] = array.filter(fn);',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const {foo = bar} = array.find(fn);')],
		},
		{
			code: 'const [[foo]] = array.filter(fn);',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const [foo] = array.find(fn);')],
		},
		{
			code: 'const [[foo = bar]] = array.filter(fn);',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const [foo = bar] = array.find(fn);')],
		},
		{
			code: 'const [foo, ] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'const foo = array.find(bar)')],
		},
		{
			code: 'var [foo, ] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'var foo = array.find(bar)')],
		},
		{
			code: 'let [foo, ] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'let foo = array.find(bar)')],
		},
		{
			code: 'let a = 1, [foo, ] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'let a = 1, foo = array.find(bar)')],
		},
		{
			code: 'let a = 1, [{foo}] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'let a = 1, {foo} = array.find(bar)')],
		},
		{
			code: 'for (let [i] = array.filter(bar); i< 10; i++) {}',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, 'for (let i = array.find(bar); i< 10; i++) {}')],
		},
		{
			code: outdent`
				const [
					// comment 1
					item
					]
					// comment 2
					= array
					// comment 3
					.filter(
						// comment 4
						x => x === '🦄'
					)
					// comment 5
					;
			`,
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		// A destructuring default only applies to `undefined`, no operator preserves that
		{
			code: 'const [foo = baz] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [foo = (bar)] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		// Default value has lower precedence
		{
			code: 'const [foo = a ? b : c] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [foo = a ?? b] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [foo = a || b] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [foo = a && b] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
	],
});

// `[foo] =`
test({
	valid: [
		// Test `[item] = …`
		// Not `AssignmentExpression`
		'function a([foo] = array.filter(bar)) {}',
		// Not `ArrayPattern`
		'foo = array.filter(bar)',
		'items = array.filter(bar)', // Plural variable name.
		'({foo} = array.filter(bar))',
		// `elements`
		'[] = array.filter(bar)',
		'[foo, another] = array.filter(bar)',
		'[, foo] = array.filter(bar)',
		'[,] = array.filter(bar)',
		// `RestElement`
		'[...foo] = array.filter(bar)',

		// Test `.filter()`
		// Not `CallExpression`
		'[foo] = array.filter',
		// Not `MemberExpression`
		'[foo] = filter(bar)',
		// `callee.property` is not a `Identifier`
		'[foo] = array["filter"](bar)',
		// Computed
		'[foo] = array[filter](bar)',
		// Not `filter`
		'[foo] = array.notFilter(bar)',
		// More or less argument(s)
		'[foo] = array.filter()',
		'[foo] = array.filter(bar, thisArgument, extraArgument)',
		'[foo] = array.filter(...bar)',
	],
	invalid: [
		{
			code: '[foo] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, 'foo = array.find(bar)')],
		},
		{
			code: '[foo] = array.filter(bar, thisArgument)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, 'foo = array.find(bar, thisArgument)')],
		},
		{
			code: '[foo.bar().baz] = array.filter(fn)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, 'foo.bar().baz = array.find(fn)')],
		},
		{
			code: '[{foo}] = array.filter(fn);',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, '({foo} = array.find(fn));')],
		},
		{
			code: '[[foo]] = array.filter(fn);',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, '[foo] = array.find(fn);')],
		},
		{
			code: '[{foo = baz}] = array.filter(fn);',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, '({foo = baz} = array.find(fn));')],
		},
		{
			code: '[foo, ] = array.filter(bar)',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, 'foo = array.find(bar)')],
		},
		{
			code: 'for ([i] = array.filter(bar); i< 10; i++) {}',
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, 'for (i = array.find(bar); i< 10; i++) {}')],
		},
		// `no-semi` style
		{
			code: outdent`
				let foo
				const bar = []
				;[foo] = array.filter(bar)
			`,
			errors: [getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, outdent`
				let foo
				const bar = []
				;foo = array.find(bar)
			`)],
		},
		// Suggestions
		{
			code: '[foo = baz] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: '[{foo} = baz] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: ';([{foo} = baz] = array.filter(bar))',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		// Default value is parenthesized
		{
			code: '[foo = (bar)] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		// Default value has lower precedence
		{
			code: '[foo = a ? b : c] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: '[foo = a || b] = array.filter(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
	],
});

// `const foo = array.filter(); foo[0]; [bar] = foo`
test({
	valid: [
		'const foo = array.find(bar), first = foo[0];',
		'const foo = array.filter(bar), first = notFoo[0];',
		'const foo = array.filter(bar), first = foo[+0];',
		'const foo2 = array.filter(bar); first = foo;',
		'const foo = array.filter(bar), first = a[foo][0];',
		'const foo = array.filter(bar), first = foo[-0];',
		'const foo = array.filter(bar), first = foo[1-1];',
		'const foo = array.filter(bar), first = foo["0"];',
		'const foo = array.filter(bar), first = foo.first;',
		'foo = array.filter(bar); const first = foo[+0];',
		'const {foo} = array.filter(bar), first = foo[0];',
		outdent`
			const foo = array.filter(bar);
			doSomething(foo);
			const first = foo[0];
		`,
		outdent`
			var foo = array.filter(bar);
			var foo = array.filter(bar);
			const first = foo[0];
		`,
		outdent`
			export const foo = array.filter(bar);
			const first = foo[0];
		`,

		'const foo = array.find(bar); const [first] = foo;',
		'const foo = array.find(bar); [first] = foo;',
		'const foo = array.filter(bar); const [first] = notFoo;',
		'const foo = array.filter(bar); [first] = notFoo;',
		'const foo = array.filter(bar); const first = foo;',
		'const foo = array.filter(bar); first = foo;',
		'const foo = array.filter(bar); const {0: first} = foo;',
		'const foo = array.filter(bar); ({0: first} = foo);',
		'const foo = array.filter(bar); const [] = foo;',
		'const foo = array.filter(bar); const [first, another] = foo;',
		'const foo = array.filter(bar); [first, another] = foo;',
		'const foo = array.filter(bar); const [,first] = foo;',
		'const foo = array.filter(bar); [,first] = foo;',
		'const foo = array.filter(bar); const [,] = foo;',
		'const foo = array.filter(bar); [,] = foo;',
		'const foo = array.filter(bar); const [...first] = foo;',
		'const foo = array.filter(bar); [...first] = foo;',
		outdent`
			const foo = array.filter(bar);
			function a([bar] = foo) {}
		`,

		// Test `.filter()`
		// Not `CallExpression`
		'const foo = array.filter; const first = foo[0]',
		// Not `MemberExpression`
		'const foo = filter(bar); const first = foo[0]',
		// `callee.property` is not a `Identifier`
		'const foo = array["filter"](bar); const first = foo[0]',
		// Computed
		'const foo = array[filter](bar); const first = foo[0]',
		// Not `filter`
		'const foo = array.notFilter(bar); const first = foo[0]',
		// More or less argument(s)
		'const foo = array.filter(); const first = foo[0]',
		'const foo = array.filter(bar, thisArgument, extraArgument); const first = foo[0]',
		'const foo = array.filter(...bar); const first = foo[0]',

		// Singularization
		'const item = array.find(bar), first = item;', // Already singular variable name.
		'let items = array.filter(bar); console.log(items[0]); items = [1,2,3]; console.log(items[0]);', // Reassigning array variable.
	],
	invalid: [
		{
			code: 'const foo = array.filter(bar); const first = foo[0];',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const foo = array.find(bar); const first = foo;')],
		},
		{
			code: 'const foo = array.filter(bar), first = foo[0];',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const foo = array.find(bar), first = foo;')],
		},
		{
			code: 'var foo = array.filter(bar), first = foo[0];',
			errors: [getSuggestionError(ERROR_DECLARATION, 'var foo = array.find(bar), first = foo;')],
		},
		{
			code: 'let foo = array.filter(bar), first = foo[0];',
			errors: [getSuggestionError(ERROR_DECLARATION, 'let foo = array.find(bar), first = foo;')],
		},
		{
			code: 'const foo = array.filter(bar); const [first] = foo;',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const foo = array.find(bar); const first = foo;')],
		},
		{
			code: 'const foo = array.filter(bar); [first] = foo;',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const foo = array.find(bar); first = foo;')],
		},
		{
			code: 'const foo = array.filter(bar); const [{propOfFirst = unicorn}] = foo;',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const foo = array.find(bar); const {propOfFirst = unicorn} = foo;')],
		},
		{
			code: 'const foo = array.filter(bar); [{propOfFirst = unicorn}] = foo;',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const foo = array.find(bar); ({propOfFirst = unicorn} = foo);')],
		},

		// Singularization
		{
			// Multiple usages and child scope.
			code: outdent`
				const items = array.filter(bar);
				const first = items[0];
				console.log(items[0]);
				function foo() { return items[0]; }
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				const item = array.find(bar);
				const first = item;
				console.log(item);
				function foo() { return item; }
			`)],
		},
		{
			// Variable name collision.
			code: 'const item = {}; const items = array.filter(bar); console.log(items[0]);',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const item = {}; const item_ = array.find(bar); console.log(item_);')],
		},
		{
			// Variable defined with `let`.
			code: 'let items = array.filter(bar); console.log(items[0]);',
			errors: [getSuggestionError(ERROR_DECLARATION, 'let item = array.find(bar); console.log(item);')],
		},
		{
			code: outdent`
				const item = 1;
				function f() {
					const items = array.filter(bar);
					console.log(items[0]);
				}
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				const item = 1;
				function f() {
					const item_ = array.find(bar);
					console.log(item_);
				}
			`)],
		},
		{
			code: outdent`
				const items = array.filter(bar);
				function f() {
					const item = 1;
					const item_ = 2;
					console.log(items[0]);
				}
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				const item__ = array.find(bar);
				function f() {
					const item = 1;
					const item_ = 2;
					console.log(item__);
				}
			`)],
		},
		{
			code: outdent`
				const items = array.filter(bar);
				function f() {
					console.log(items[0], item);
				}
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				const item_ = array.find(bar);
				function f() {
					console.log(item_, item);
				}
			`)],
		},
		{
			code: outdent`
				const items = array.filter(bar);
				console.log(items[0]);
				function f(item) {
					return item;
				}
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				const item_ = array.find(bar);
				console.log(item_);
				function f(item) {
					return item;
				}
			`)],
		},
		{
			code: outdent`
				function f() {
					const items = array.filter(bar);
					console.log(items[0]);
				}
				function f2(item) {
					return item;
				}
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				function f() {
					const item = array.find(bar);
					console.log(item);
				}
				function f2(item) {
					return item;
				}
			`)],
		},
		{
			code: outdent`
				const packages = array.filter(bar);
				console.log(packages[0]);
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				const package_ = array.find(bar);
				console.log(package_);
			`)],
		},
		{
			code: outdent`
				const symbols = array.filter(bar);
				console.log(symbols[0]);
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				const symbol_ = array.find(bar);
				console.log(symbol_);
			`)],
		},

		// Not fixable
		{
			code: 'const foo = array.filter(bar); const [first = bar] = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'const foo = array.filter(bar); [first = bar] = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		// Many
		{
			code: outdent`
				let baz;
				const foo = array.filter(bar);
				const [bar] = foo;
				[{bar}] = foo;
				function getValueOfFirst() {
					return foo[0].value;
				}
				function getPropertyOfFirst(property) {
					return foo[0][property];
				}
			`,
			errors: [getSuggestionError(ERROR_DECLARATION, outdent`
				let baz;
				const foo = array.find(bar);
				const bar = foo;
				({bar} = foo);
				function getValueOfFirst() {
					return foo.value;
				}
				function getPropertyOfFirst(property) {
					return foo[property];
				}
			`)],
		},
	],
});

// Mixed
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				const quz = array.filter(fn);
				const [foo] = array.filter(quz[0]);
				[{bar: baz}] = foo[
					array.filter(fn)[0]
				].filter(
					array.filter(fn).shift()
				);
			`,
			// Suggestions may overlap.
			// Apply them one at a time.
			// See next test
			errors: [
				getSuggestionError(ERROR_DECLARATION, outdent`
					const quz = array.find(fn);
					const [foo] = array.filter(quz);
					[{bar: baz}] = foo[
						array.filter(fn)[0]
					].filter(
						array.filter(fn).shift()
					);
				`),
				getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, outdent`
					const quz = array.filter(fn);
					const foo = array.find(quz[0]);
					[{bar: baz}] = foo[
						array.filter(fn)[0]
					].filter(
						array.filter(fn).shift()
					);
				`),
				getSuggestionError(ERROR_ZERO_INDEX, outdent`
					const quz = array.filter(fn);
					const [foo] = array.filter(quz[0]);
					[{bar: baz}] = foo[
						array.find(fn)
					].filter(
						array.filter(fn).shift()
					);
				`),
				getSuggestionError(ERROR_DESTRUCTURING_ASSIGNMENT, outdent`
					const quz = array.filter(fn);
					const [foo] = array.filter(quz[0]);
					({bar: baz} = foo[
						array.filter(fn)[0]
					].find(
						array.filter(fn).shift()
					));
				`),
				getSuggestionError(ERROR_SHIFT, outdent`
					const quz = array.filter(fn);
					const [foo] = array.filter(quz[0]);
					[{bar: baz}] = foo[
						array.filter(fn)[0]
					].filter(
						array.find(fn)
					);
				`),
			],
		},
		{
			// Some rewrites are already applied here.
			code: outdent`
				const quz = array.find(fn);
				const [foo] = array.filter(quz);
				({bar: baz} = foo[
					array.filter(fn)[0]
				].find(
					array.filter(fn).shift()
				));
			`,
			errors: [
				getSuggestionError(ERROR_DESTRUCTURING_DECLARATION, outdent`
					const quz = array.find(fn);
					const foo = array.find(quz);
					({bar: baz} = foo[
						array.filter(fn)[0]
					].find(
						array.filter(fn).shift()
					));
				`),
				getSuggestionError(ERROR_ZERO_INDEX, outdent`
					const quz = array.find(fn);
					const [foo] = array.filter(quz);
					({bar: baz} = foo[
						array.find(fn)
					].find(
						array.filter(fn).shift()
					));
				`),
				getSuggestionError(ERROR_SHIFT, outdent`
					const quz = array.find(fn);
					const [foo] = array.filter(quz);
					({bar: baz} = foo[
						array.filter(fn)[0]
					].find(
						array.find(fn)
					));
				`),
			],
		},
	],
});

// `checkFromLast` default to true
test({
	valid: [
		'array.filter(foo).pop()',
		'array.filter(foo).at(-1)',
		'array.filter(foo).slice(-1)[0]',
		'array.filter(foo).slice(-1).pop()',
		'array.filter(foo).slice(-1).shift()',
	].map(code => ({code, options: [{checkFromLast: false}]})),
	invalid: [],
});

// `.pop()`
test({
	valid: [
		// Test `.pop()`
		// Not `CallExpression`
		'array.filter(foo).pop',
		// Not `MemberExpression`
		'pop(array.filter(foo))',
		// `callee.property` is not a `Identifier`
		'array.filter(foo)["pop"]()',
		// Computed
		'array.filter(foo)[pop]()',
		// Not `pop`
		'array.filter(foo).notPop()',
		// More or less argument(s)
		'array.filter(foo).pop(extraArgument)',
		'array.filter(foo).pop(...[])',

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter.pop()',
		// Not `MemberExpression`
		'filter(foo).pop()',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo).pop()',
		// Computed
		'array[filter](foo).pop()',
		// Not `filter`
		'array.notFilter(foo).pop()',
		// More or less argument(s)
		'array.filter().pop()',
		'array.filter(foo, thisArgument, extraArgument).pop()',
		'array.filter(...foo).pop()',
	],
	invalid: [
		{
			code: 'array.filter(foo).pop()',
			errors: [getSuggestionError(ERROR_POP, 'array.findLast(foo)', 'findLast')],
		},
		{
			code: 'array.filter(foo, thisArgument).pop()',
			errors: [getSuggestionError(ERROR_POP, 'array.findLast(foo, thisArgument)', 'findLast')],
		},
		{
			code: outdent`
				const item = array
					// comment 1
					.filter(
						// comment 2
						x => x === '🦄'
					)
					// comment 3
					.pop()
					// comment 4
					;
			`,
			errors: [{messageId: ERROR_POP}],
		},
	],
});

// `.at(-1)`
test({
	valid: [
		// Test `.at()`
		// Not `CallExpression`
		'array.filter(foo).at',
		// Not `MemberExpression`
		'at(array.filter(foo), -1)',
		// `callee.property` is not a `Identifier`
		'array.filter(foo)["at"](-1)',
		// Computed
		'array.filter(foo)[at](-1)',
		// Not `at`
		'array.filter(foo).notAt(-1)',
		// More or less argument(s)
		'array.filter(foo).at()',
		'array.filter(foo).at(-1, extraArgument)',
		'array.filter(foo).at(...[-1])',

		// Test `-1`
		'array.filter(foo).at(1)',
		'array.filter(foo).at(+1)',
		'const ONE = 1; array.filter(foo).at(-ONE)',
		'const MINUS_ONE = -1; array.filter(foo).at(MINUS_ONE)',
		'const a = {b: 1}; array.filter(foo).at(-a.b)',
		'const a = {b: -1}; array.filter(foo).at(a.b)',
		'array.filter(foo).at(-2)',
		'array.filter(foo).at(-(-1))',
		'array.filter(foo).at(-1.)',
		'array.filter(foo).at(-0b1)',
		'array.filter(foo).at(-"1")',
		'array.filter(foo).at(-null)',
		'array.filter(foo).at(-false)',
		'array.filter(foo).at(-true)',

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter.at(-1)',
		// Not `MemberExpression`
		'filter(foo).at(-1)',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo).at(-1)',
		// Computed
		'array[filter](foo).at(-1)',
		// Not `filter`
		'array.notFilter(foo).at(-1)',
		// More or less argument(s)
		'array.filter().at(-1)',
		'array.filter(foo, thisArgument, extraArgument).at(-1)',
		'array.filter(...foo).at(-1)',
	],
	invalid: [
		{
			code: 'array.filter(foo).at(-1)',
			errors: [getSuggestionError(ERROR_AT_MINUS_ONE, 'array.findLast(foo)', 'findLast')],
		},
		{
			code: 'array.filter(foo, thisArgument).at(-1)',
			errors: [getSuggestionError(ERROR_AT_MINUS_ONE, 'array.findLast(foo, thisArgument)', 'findLast')],
		},
		{
			code: outdent`
				const item = array
					// comment 1
					.filter(
						// comment 2
						x => x === '🦄'
					)
					// comment 3
					.at(
						// comment 4
						-1
						// comment 5
					)
					// comment 6
					;
			`,
			errors: [{messageId: ERROR_AT_MINUS_ONE}],
		},
	],
});

// `.slice(-1)[0]`, `.slice(-1).pop()`, `.slice(-1).shift()`
test({
	valid: [
		// Test `.slice()`
		// Not `CallExpression`
		'array.filter(foo).slice[0]',
		// `callee.property` is not a `Identifier`
		'array.filter(foo)["slice"](-1)[0]',
		// Computed
		'array.filter(foo)[slice](-1)[0]',
		// Not `slice`
		'array.filter(foo).notSlice(-1)[0]',
		// More or less argument(s)
		'array.filter(foo).slice()[0]',
		'array.filter(foo).slice(-1, 1)[0]',
		'array.filter(foo).slice(...[-1])[0]',
		// Optional call/member on `.slice`
		'array.filter(foo)?.slice(-1)[0]',

		// Test `-1`
		'array.filter(foo).slice(1)[0]',
		'array.filter(foo).slice(+1)[0]',
		'const ONE = 1; array.filter(foo).slice(-ONE)[0]',
		'const MINUS_ONE = -1; array.filter(foo).slice(MINUS_ONE)[0]',
		'array.filter(foo).slice(-2)[0]',
		'array.filter(foo).slice(0)[0]',
		'array.filter(foo).slice(-(-1))[0]',
		'array.filter(foo).slice(-1.)[0]',
		'array.filter(foo).slice(-0b1)[0]',
		'array.filter(foo).slice(-"1")[0]',

		// Test accessor
		// Not `0`
		'array.filter(foo).slice(-1)[1]',
		'array.filter(foo).slice(-1)["0"]',
		'array.filter(foo).slice(-1).at(0)',
		'array.filter(foo).slice(-1).at(-1)',
		// Optional access
		'array.filter(foo).slice(-1)?.[0]',
		// Not `pop`/`shift`
		'array.filter(foo).slice(-1).find(foo)',
		'array.filter(foo).slice(-1).pop(extraArgument)',
		'array.filter(foo).slice(-1).shift(extraArgument)',
		// Optional call on `.pop()`/`.shift()`
		'array.filter(foo).slice(-1)?.pop()',
		'array.filter(foo).slice(-1)?.shift()',
		// Left-hand side
		'array.filter(foo).slice(-1)[0] = bar',
		'array.filter(foo).slice(-1)[0] += bar',
		'++ array.filter(foo).slice(-1)[0]',
		'array.filter(foo).slice(-1)[0]--',
		'delete array.filter(foo).slice(-1)[0]',

		// Test `.filter()`
		// Not `filter`
		'array.notFilter(foo).slice(-1)[0]',
		'array.notFilter(foo).slice(-1).pop()',
		// Optional call on `.filter`
		'array.filter?.(foo).slice(-1)[0]',
		// More or less argument(s)
		'array.filter().slice(-1)[0]',
		'array.filter(foo, thisArgument, extraArgument).slice(-1)[0]',
		'array.filter(...foo).slice(-1)[0]',
		// Known non-array
		{
			code: 'function f(foo: Set<number>) { return foo.filter(fn).slice(-1)[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		{
			code: 'array.filter(foo).slice(-1)[0]',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array.findLast(foo)', 'findLast')],
		},
		{
			code: 'array.filter(foo).slice(-1).pop()',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array.findLast(foo)', 'findLast')],
		},
		{
			code: 'array.filter(foo).slice(-1).shift()',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array.findLast(foo)', 'findLast')],
		},
		{
			code: 'array?.filter(foo).slice(-1)[0]',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array?.findLast(foo)', 'findLast')],
		},
		{
			code: 'array?.filter(foo).slice(-1).pop()',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array?.findLast(foo)', 'findLast')],
		},
		{
			code: 'array?.filter(foo).slice(-1).shift()',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array?.findLast(foo)', 'findLast')],
		},
		{
			code: 'array.filter(foo, thisArgument).slice(-1)[0]',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array.findLast(foo, thisArgument)', 'findLast')],
		},
		{
			code: 'array.filter(foo, thisArgument).slice(-1).pop()',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array.findLast(foo, thisArgument)', 'findLast')],
		},
		// Result used in a declaration
		{
			code: 'const item = array.filter(foo).slice(-1)[0];',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'const item = array.findLast(foo);', 'findLast')],
		},
		// Result used as an argument
		{
			code: 'foo(array.filter(bar).slice(-1)[0])',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'foo(array.findLast(bar))', 'findLast')],
		},
		// Parenthesized `.filter()` call
		{
			code: '(array.filter(foo)).slice(-1)[0]',
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, '(array.findLast(foo))', 'findLast')],
		},
		// TypeScript non-null assertion on the result
		{
			code: 'array.filter(foo).slice(-1)[0]!',
			languageOptions: {parser: parsers.typescript},
			errors: [getSuggestionError(ERROR_SLICE_MINUS_ONE, 'array.findLast(foo)!', 'findLast')],
		},
		// Don't drop comments in the removed slice/accessor part.
		{
			code: 'array.filter(foo).slice(/* comment */ -1)[0]',
			errors: [{messageId: ERROR_SLICE_MINUS_ONE}],
		},
		{
			code: 'array.filter(foo).slice(-1) /* comment */ [0]',
			errors: [{messageId: ERROR_SLICE_MINUS_ONE}],
		},
		{
			code: 'array.filter(foo).slice(-1) /* comment */ .pop()',
			errors: [{messageId: ERROR_SLICE_MINUS_ONE}],
		},
		{
			code: outdent`
				const item = array
					// comment 1
					.filter(
						// comment 2
						x => x === '🦄'
					)
					// comment 3
					.slice(
						// comment 4
						-1
					)
					// comment 5
					[0]
					// comment 6
					;
			`,
			errors: [{messageId: ERROR_SLICE_MINUS_ONE}],
		},
		{
			code: outdent`
				const item = array
					// comment 1
					.filter(
						// comment 2
						x => x === '🦄'
					)
					// comment 3
					.slice(
						// comment 4
						-1
					)
					// comment 5
					.pop()
					// comment 6
					;
			`,
			errors: [{messageId: ERROR_SLICE_MINUS_ONE}],
		},
	],
});

// `.at(0)`
test({
	valid: [
		// Test `.at()`
		// Not `CallExpression`
		'array2.filter(foo).at',
		// Not `MemberExpression`
		'at(array.filter(foo), 0)',
		// `callee.property` is not a `Identifier`
		'array.filter(foo)["at"](0)',
		// Optional member access on `.at`
		'array.filter(foo)?.at(0)',
		// Computed
		'array.filter(foo)[at](0)',
		// Not `at`
		'array.filter(foo).notAt(0)',
		// More or less argument(s)
		'array2.filter(foo).at()',
		'array.filter(foo).at(0, extraArgument)',
		'array.filter(foo).at(...[0])',

		// Test `0`
		'array.filter(foo).at(100)',
		'array.filter(foo).at(+0)',
		'const ZERO = 0; array.filter(foo).at(ZERO)',
		'const a = {b: 0}; array.filter(foo).at(a.b)',
		'array.filter(foo).at(0b0)',
		'array.filter(foo).at("0")',

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter.at(0)',
		// Not `MemberExpression`
		'filter(foo).at(0)',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo).at(0)',
		// Computed
		'array[filter](foo).at(0)',
		// Not `filter`
		'array.notFilter(foo).at(0)',
		// More or less argument(s)
		'array.filter().at(0)',
		'array.filter(foo, thisArgument, extraArgument).at(0)',
		'array.filter(...foo).at(0)',
	],
	invalid: [
		{
			code: 'array.filter(foo).at(0)',
			errors: [getSuggestionError(ERROR_AT_ZERO, 'array.find(foo)')],
		},
		{
			code: 'array?.filter(foo).at(0)',
			errors: [getSuggestionError(ERROR_AT_ZERO, 'array?.find(foo)')],
		},
		{
			code: 'array.filter(foo, thisArgument).at(0)',
			errors: [getSuggestionError(ERROR_AT_ZERO, 'array.find(foo, thisArgument)')],
		},
		{
			code: 'array?.filter(foo, thisArgument).at(0)',
			errors: [getSuggestionError(ERROR_AT_ZERO, 'array?.find(foo, thisArgument)')],
		},
		{
			code: outdent`
				const item = array
					// comment 1
					.filter(
						// comment 2
						x => x === '🦄'
					)
					// comment 3
					.at(
						// comment 4
						0
						// comment 5
					)
					// comment 6
					;
			`,
			errors: [{messageId: ERROR_AT_ZERO}],
		},
	],
});

// Reported, but not fixed, the replaced range would drop the comment
test({
	valid: [],
	invalid: [
		{
			code: 'const [/* keep */ a] = b.filter(c);',
			errors: 1,
		},
		{
			code: '[/* keep */ a] = b.filter(c);',
			errors: 1,
		},
		{
			code: 'const a = b.filter(c)[/* keep */ 0];',
			errors: 1,
		},
		{
			code: 'const a = b.filter(c) /* keep */.shift();',
			errors: 1,
		},
		{
			code: 'const a = b.filter(c) /* keep */.at(0);',
			errors: 1,
		},
		{
			code: 'const a = b.filter(c) /* keep */.pop();',
			errors: 1,
		},
		{
			code: 'const a = b.filter(c) /* keep */.at(-1);',
			errors: 1,
		},
	],
});

// The pattern's type annotation describes the whole array, it cannot be carried over
test({
	valid: [],
	invalid: [
		...[
			'const [{id}]: {id: number}[] = foo.filter(x => x.id > 0);',
			'const [a]: [string] = foo.filter(Boolean);',
			'let [a]: [string, string] = foo.filter(Boolean);',
		].map(code => ({
			code,
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		})),
		{
			code: 'const [{id}] = foo.filter(x => x.id > 0);',
			languageOptions: {parser: parsers.typescript},
			output: 'const {id} = foo.find(x => x.id > 0);',
			errors: 1,
		},
	],
});

// The annotation describes the whole array, and `find()` returns one element or `undefined`, so carrying it over produces a type error: `Type 'string | undefined' is not assignable to type 'string[]'.`
test({
	valid: [
		...[
			'const items: string[] = list.filter(fn); console.log(items[0]);',
			'let items: string[] = list.filter(fn); console.log(items[0]);',
			'const items: ReadonlyArray<string> = list.filter(fn); console.log(items[0]);',
			'const items: string[] = list.filter(fn); const [first] = items;',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		{
			code: 'const items = list.filter(fn); console.log(items[0]);',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const item = list.find(fn); console.log(item);')],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const items = list.filter(fn); const [first] = items;',
			errors: [getSuggestionError(ERROR_DECLARATION, 'const item = list.find(fn); const first = item;')],
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// A comment inside the `.filter(…)` call is kept, so it does not block the fix
test({
	valid: [],
	invalid: [
		{
			code: 'const a = b.filter(x => /* keep */ x)[0];',
			output: 'const a = b.find(x => /* keep */ x);',
			errors: [{messageId: ERROR_ZERO_INDEX}],
		},
		{
			code: 'const a = b.filter(x => /* keep */ x).shift();',
			output: 'const a = b.find(x => /* keep */ x);',
			errors: [{messageId: ERROR_SHIFT}],
		},
		{
			code: 'const a = b.filter(x => /* keep */ x).at(0);',
			output: 'const a = b.find(x => /* keep */ x);',
			errors: [{messageId: ERROR_AT_ZERO}],
		},
		{
			code: 'const a = b.filter(x => /* keep */ x).pop();',
			output: 'const a = b.findLast(x => /* keep */ x);',
			errors: [{messageId: ERROR_POP}],
		},
		{
			code: 'const a = b.filter(x => /* keep */ x).at(-1);',
			output: 'const a = b.findLast(x => /* keep */ x);',
			errors: [{messageId: ERROR_AT_MINUS_ONE}],
		},
		{
			code: 'const a = b./* keep */filter(c)[0];',
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'const a = b./* keep */find(c);')],
		},
		{
			code: 'const a = (b.filter(c) /* keep */)[0];',
			errors: [getSuggestionError(ERROR_ZERO_INDEX, 'const a = (b.find(c) /* keep */);')],
		},
	],
});
