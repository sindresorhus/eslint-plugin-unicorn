import test from 'node:test';
import {Linter} from 'eslint';
import {getStaticPropertyName} from '../../rules/utils/index.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const getResults = (code, {nodeTypes = 'MemberExpression, Property', languageOptions, useScope = false} = {}) => {
	const results = [];
	linter.verify(code, {
		...(languageOptions && {languageOptions}),
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							[nodeTypes](node) {
								results.push(getStaticPropertyName(node, context, useScope ? context.sourceCode.getScope(node) : undefined));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	});
	return results;
};

test('`getStaticPropertyName` returns static member and property key names', t => {
	t.assert.deepStrictEqual(getResults('foo.bar;'), ['bar']);
	t.assert.deepStrictEqual(getResults('foo["bar"];'), ['bar']);
	t.assert.deepStrictEqual(getResults('foo[`bar`];'), ['bar']);
	t.assert.deepStrictEqual(getResults('foo["b" + "ar"];'), ['bar']);
	t.assert.deepStrictEqual(getResults('foo[0];'), ['0']);
	t.assert.deepStrictEqual(getResults('({bar: 1, ["baz"]: 2});'), ['bar', 'baz']);
});

test('`getStaticPropertyName` returns `undefined` for unknown names', t => {
	t.assert.deepStrictEqual(getResults('foo[bar];'), [undefined]);
	t.assert.deepStrictEqual(getResults('foo[`${bar}`];'), [undefined]); // eslint-disable-line no-template-curly-in-string
	t.assert.deepStrictEqual(getResults('class Foo { #bar; method() { this.#bar; } }'), [undefined]);
});

test('`getStaticPropertyName` returns `undefined` when the computed key has side effects', t => {
	t.assert.deepStrictEqual(getResults('foo[(sideEffect(), "bar")];'), [undefined]);
	t.assert.deepStrictEqual(getResults('({[(sideEffect(), "bar")]: 1});'), [undefined]);
});

for (const [nodeType, createCode] of [
	['MemberExpression', key => `object[${key}];`],
	['Property', key => `({[${key}]: 1});`],
	['MethodDefinition', key => `class Value { [${key}]() {} }`],
	['PropertyDefinition', key => `class Value { [${key}] = 1; }`],
]) {
	test(`computed ${nodeType} keys with side effects are unknown`, t => {
		for (const key of ['(calls++, "name")', '(tag`value`, "name")', '((tag`value`, "na") + "me")', '([...items], "name")', '(({...source}), "name")']) {
			t.assert.deepStrictEqual(getResults(createCode(key), {nodeTypes: nodeType, useScope: true}), [undefined]);
		}
	});

	test(`computed ${nodeType} keys resolve static names`, t => {
		for (const key of ['"name"', '`name`', '"na" + "me"', '(("name"))']) {
			t.assert.deepStrictEqual(getResults(createCode(key), {nodeTypes: nodeType}), ['name']);
		}

		const constantKeyCode = `const name = "name"; ${createCode('name')}`;
		t.assert.strictEqual(getResults(constantKeyCode, {nodeTypes: nodeType})[0], undefined);
		t.assert.strictEqual(getResults(constantKeyCode, {nodeTypes: nodeType, useScope: true})[0], 'name');
		t.assert.strictEqual(getResults(createCode('Symbol.iterator'), {nodeTypes: nodeType})[0], undefined);
		t.assert.strictEqual(getResults(createCode('Symbol.iterator'), {nodeTypes: nodeType, useScope: true})[0], 'Symbol(Symbol.iterator)');
	});
}

test('TypeScript computed keys keep pure assertions and reject wrapped effects', t => {
	const languageOptions = {parser: parsers.typescript.implementation};
	t.assert.deepStrictEqual(getResults('object["name" as const];', {languageOptions}), ['name']);
	t.assert.deepStrictEqual(getResults('object[((tag`value`, "name") as string)];', {languageOptions}), [undefined]);
	t.assert.deepStrictEqual(getResults('object[(([...items], "name") as string)];', {languageOptions}), [undefined]);
});
