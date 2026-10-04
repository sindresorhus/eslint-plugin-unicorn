import test from 'node:test';
import {Linter} from 'eslint';
import {
	getOutermostChainAndTypeScriptExpression,
	getOutermostTypeScriptExpression,
	isTypeScriptExpressionWrapper,
	unwrapChainAndTypeScriptExpression,
	unwrapTypeScriptExpression,
} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

/*
Run `getResult` on each node matching `selector`, the argument of each `inspect(…)` call by default.
*/
const getResults = (code, getResult, selector = 'CallExpression[callee.name="inspect"] > .arguments') => {
	const results = [];
	const linter = new Linter();
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: {parser: typescriptEslintParser},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							[selector](node) {
								results.push(getResult(node, context));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	}, 'file.ts');

	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return results;
};

const getUnwrappedType = unwrap => code => getResults(code, node => unwrap(node).type);

test('`unwrapTypeScriptExpression` unwraps all runtime-transparent TypeScript wrappers', t => {
	const getType = getUnwrappedType(unwrapTypeScriptExpression);
	for (const code of [
		'inspect(foo as Foo);',
		'inspect(foo satisfies Foo);',
		'inspect(foo!);',
		'inspect(<Foo>foo);',
		'inspect(foo<Foo>);',
		'inspect((foo as unknown as Foo)!);',
		'inspect(((foo<Foo>) satisfies Foo));',
	]) {
		t.assert.deepStrictEqual(getType(code), ['Identifier'], code);
	}
});

test('`unwrapTypeScriptExpression` does not unwrap optional chains', t => {
	const getType = getUnwrappedType(unwrapTypeScriptExpression);
	t.assert.deepStrictEqual(getType('inspect(foo?.bar as Foo);'), ['ChainExpression']);
	t.assert.deepStrictEqual(getType('inspect(foo?.bar);'), ['ChainExpression']);
});

test('`unwrapChainAndTypeScriptExpression` unwraps optional chains and TypeScript wrappers', t => {
	const getType = getUnwrappedType(unwrapChainAndTypeScriptExpression);
	for (const code of [
		'inspect(foo?.bar);',
		'inspect(foo?.bar as Foo);',
		'inspect((foo?.bar)!);',
		'inspect(foo.bar<Foo>);',
	]) {
		t.assert.deepStrictEqual(getType(code), ['MemberExpression'], code);
	}

	t.assert.deepStrictEqual(getType('inspect(foo?.());'), ['CallExpression']);
	t.assert.deepStrictEqual(getType('inspect(foo);'), ['Identifier']);
	t.assert.strictEqual(unwrapChainAndTypeScriptExpression(), undefined);
});

test('`isTypeScriptExpressionWrapper` only matches TypeScript wrappers', t => {
	t.assert.deepStrictEqual(
		getResults('inspect(foo as Foo); inspect(foo<Foo>); inspect(foo?.bar); inspect(foo);', node => isTypeScriptExpressionWrapper(node)),
		[true, true, false, false],
	);
	t.assert.strictEqual(isTypeScriptExpressionWrapper(), false);
});

const getOutermostText = (getOutermost, selector = 'Identifier[name="marker"]') => code => getResults(code, (node, context) => context.sourceCode.getText(getOutermost(node)), selector);

test('`getOutermostTypeScriptExpression` walks up all TypeScript wrappers', t => {
	const getText = getOutermostText(getOutermostTypeScriptExpression);
	for (const [code, expected] of [
		['inspect(marker);', 'marker'],
		['inspect(marker as Foo);', 'marker as Foo'],
		['inspect(marker satisfies Foo);', 'marker satisfies Foo'],
		['inspect(marker!);', 'marker!'],
		['inspect(<Foo>marker);', '<Foo>marker'],
		['inspect(marker<Foo>);', 'marker<Foo>'],
		['inspect(((marker as unknown) as Foo)!);', '((marker as unknown) as Foo)!'],
		['inspect((marker as Foo).bar);', 'marker as Foo'],
		['inspect(foo[marker as Foo]);', 'marker as Foo'],
	]) {
		t.assert.deepStrictEqual(getText(code), [expected], code);
	}
});

test('`getOutermostTypeScriptExpression` does not walk up optional chains', t => {
	const getText = getOutermostText(getOutermostTypeScriptExpression);
	t.assert.deepStrictEqual(getText('inspect((marker?.bar as Foo)!);'), ['marker']);
	const getChainText = getOutermostText(getOutermostTypeScriptExpression, 'ChainExpression > .expression');
	t.assert.deepStrictEqual(getChainText('inspect((foo?.bar as Foo)!);'), ['foo?.bar']);
});

test('`getOutermostChainAndTypeScriptExpression` walks up optional chains and TypeScript wrappers', t => {
	const getText = getOutermostText(getOutermostChainAndTypeScriptExpression);
	for (const [code, expected] of [
		['inspect(marker);', 'marker'],
		['inspect(marker!);', 'marker!'],
		['inspect(marker?.bar);', 'marker'],
	]) {
		t.assert.deepStrictEqual(getText(code), [expected], code);
	}

	const getChainText = getOutermostText(getOutermostChainAndTypeScriptExpression, 'ChainExpression > .expression');
	t.assert.deepStrictEqual(
		getChainText('inspect((foo?.bar as Foo)!); inspect(foo?.()); inspect((foo?.bar).baz);'),
		['(foo?.bar as Foo)!', 'foo?.()', 'foo?.bar'],
	);
});

test('`getOutermost*` functions are the upward counterparts of `unwrap*`', t => {
	const code = 'inspect(foo); inspect(foo as Foo); inspect((foo?.bar as Foo)!); inspect(foo.bar<Foo>);';
	t.assert.deepStrictEqual(
		getResults(code, node => getOutermostTypeScriptExpression(unwrapTypeScriptExpression(node)) === node),
		[true, true, true, true],
	);
	t.assert.deepStrictEqual(
		getResults(code, node => getOutermostChainAndTypeScriptExpression(unwrapChainAndTypeScriptExpression(node)) === node),
		[true, true, true, true],
	);
});
