import test from 'node:test';
import {Linter} from 'eslint';
import getConciseArrowBodyText from '../../rules/utils/get-concise-arrow-body-text.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const typescriptLanguageOptions = {
	parser: parsers.typescript.implementation,
	parserOptions: parsers.typescript.mergeParserOptions(),
};

const verify = (code, languageOptions, inspect) => linter.verify(code, {
	languageOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		...languageOptions,
	},
	plugins: {
		test: {
			rules: {
				capture: {
					create: context => ({
						ReturnStatement(node) {
							inspect(node.argument, context);
						},
					}),
				},
			},
		},
	},
	rules: {'test/capture': 'error'},
});

const getBodyTexts = (code, languageOptions = {}) => {
	const results = [];
	const messages = verify(code, languageOptions, (node, context) => {
		results.push(getConciseArrowBodyText(node, context));
	});

	if (messages.some(message => message.fatal)) {
		throw new Error(`Failed to parse: ${code}`);
	}

	return results;
};

const assertValidArrowBody = (t, text, languageOptions = {}) => {
	const messages = verify(`const function_ = () => ${text};`, languageOptions, () => {});
	t.assert.deepStrictEqual(messages.filter(message => message.fatal), []);
};

for (const [expression, expected] of [
	['value', 'value'],
	['foo.bar()', 'foo.bar()'],
	['a + b', 'a + b'],
	['function () {}', 'function () {}'],
	['[{a: x}]', '[{a: x}]'],
	['a in b', 'a in b'],
	['{a: 1}', '({a: 1})'],
	['{}', '({})'],
	['{a: x}.a', '({a: x}.a)'],
	['{a: x}[key]', '({a: x}[key])'],
	['{} + x', '({} + x)'],
	['{a}.a ? b : c', '({a}.a ? b : c)'],
	['a, b', '(a, b)'],
	['a = b', '(a = b)'],
	['(a = b)', '(a = b)'],
	['(a, b)', '(a, b)'],
	['({a: 1})', '({a: 1})'],
	['({a: x}).a', '({a: x}).a'],
	['((value))', 'value'],
	['(/* comment */ value)', '(/* comment */ value)'],
]) {
	test(`concise arrow body text of \`${expression}\``, t => {
		const [text] = getBodyTexts(`function function_() { return ${expression}; }`);
		t.assert.strictEqual(text, expected);
		assertValidArrowBody(t, text);
	});
}

test('concise arrow body text wraps the `in` operator inside a `for` statement initializer', t => {
	t.assert.deepStrictEqual(getBodyTexts('for (const function_ = () => { return a in b; };;) {}'), ['(a in b)']);
	t.assert.deepStrictEqual(getBodyTexts('for (const function_ = () => { return (a in b); };;) {}'), ['(a in b)']);
	t.assert.deepStrictEqual(getBodyTexts('for (const function_ = () => { return a + b; };;) {}'), ['a + b']);
	t.assert.deepStrictEqual(getBodyTexts('for (;;) { const function_ = () => { return a in b; }; }'), ['a in b']);
});

for (const [expression, expected] of [
	['value as Foo', 'value as Foo'],
	['value!', 'value!'],
	['{} as Foo', '({} as Foo)'],
	['{a: x}.a!', '({a: x}.a!)'],
	['{a: x} satisfies Foo', '({a: x} satisfies Foo)'],
	['({}) as Foo', '({}) as Foo'],
	['(a, b) as Foo', '(a, b) as Foo'],
	['<Foo>{}', '<Foo>{}'],
]) {
	test(`concise arrow body text of TypeScript \`${expression}\``, t => {
		const [text] = getBodyTexts(`function function_() { return ${expression}; }`, typescriptLanguageOptions);
		t.assert.strictEqual(text, expected);
		assertValidArrowBody(t, text, typescriptLanguageOptions);
	});
}
