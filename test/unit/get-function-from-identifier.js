import test from 'node:test';
import {Linter} from 'eslint';
import {getFunctionFromIdentifier} from '../../rules/utils/index.js';
import parsers from '../utils/parsers.js';

/*
Return the source text of the `getFunctionFromIdentifier` result for the argument of each `inspect(…)` call.
*/
const getResults = code => {
	const results = [];
	const linter = new Linter();
	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								const functionNode = getFunctionFromIdentifier(node.arguments[0], context);
								results.push(functionNode && context.sourceCode.getText(functionNode));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	}, {filename: 'file.ts'});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return results;
};

test('returns a function declaration', t => {
	t.assert.deepStrictEqual(getResults('function foo(a) {} inspect(foo);'), ['function foo(a) {}']);
	t.assert.deepStrictEqual(getResults('inspect(foo); function foo(a) {}'), ['function foo(a) {}']);
	t.assert.deepStrictEqual(getResults('export default function foo(a) {} inspect(foo);'), ['function foo(a) {}']);
});

test('returns the name of a function expression from inside it', t => {
	t.assert.deepStrictEqual(getResults('const bar = function foo(a) { inspect(foo); };'), ['function foo(a) { inspect(foo); }']);
});

test('returns a function or arrow expression initializer', t => {
	t.assert.deepStrictEqual(getResults('const foo = a => a; inspect(foo);'), ['a => a']);
	t.assert.deepStrictEqual(getResults('const foo = function (a) {}; inspect(foo);'), ['function (a) {}']);
	t.assert.deepStrictEqual(getResults('const foo = async (a) => a, bar = 1; inspect(foo);'), ['async (a) => a']);
});

test('returns the initializer of a never-reassigned `let` or `var`', t => {
	t.assert.deepStrictEqual(getResults('let foo = a => a; inspect(foo);'), ['a => a']);
	t.assert.deepStrictEqual(getResults('var foo = a => a; inspect(foo);'), ['a => a']);
});

test('unwraps TypeScript expression wrappers around the initializer', t => {
	t.assert.deepStrictEqual(getResults('const foo = (a => a) as Foo; inspect(foo);'), ['a => a']);
	t.assert.deepStrictEqual(getResults('const foo = (a => a) satisfies Foo; inspect(foo);'), ['a => a']);
	t.assert.deepStrictEqual(getResults('const foo = (a => a)!; inspect(foo);'), ['a => a']);
	t.assert.deepStrictEqual(getResults('const foo: Foo = a => a; inspect(foo);'), ['a => a']);
});

test('returns `undefined` for a reassigned variable', t => {
	for (const code of [
		'let foo = a => a; foo = (a, b) => b; inspect(foo);',
		'var foo = a => a; foo ??= b => b; inspect(foo);',
		'let foo = a => a; [foo] = [b => b]; inspect(foo);',
		'function foo(a) {} foo = b => b; inspect(foo);',
		'let foo; foo = a => a; inspect(foo);',
	]) {
		t.assert.deepStrictEqual(getResults(code), [undefined], code);
	}
});

test('returns `undefined` for more than one declaration', t => {
	for (const code of [
		'var foo = a => a; var foo = b => b; inspect(foo);',
		'function foo(a: string): void; function foo(a) {} inspect(foo);',
	]) {
		t.assert.deepStrictEqual(getResults(code), [undefined], code);
	}
});

test('returns `undefined` for other values and declarations', t => {
	for (const code of [
		'const foo = bar; inspect(foo);',
		'const foo = bar(); inspect(foo);',
		'const foo = class {}; inspect(foo);',
		'class foo {} inspect(foo);',
		'const {foo} = () => {}; inspect(foo);',
		'const [foo] = [() => {}]; inspect(foo);',
		'function bar(foo = () => {}) { inspect(foo); }',
		'declare const foo: () => void; inspect(foo);',
		'declare function foo(): void; inspect(foo);',
		'import foo from \'foo\'; inspect(foo);',
		'inspect(foo);',
		'inspect(() => {});',
		'const foo = () => {}; inspect(foo.bar);',
	]) {
		t.assert.deepStrictEqual(getResults(code), [undefined], code);
	}
});
