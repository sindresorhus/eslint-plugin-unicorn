import test from 'node:test';
import {Linter} from 'eslint';
import {getNegatedExpressionText} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

/*
Return `getNegatedExpressionText` for the argument of each `inspect(…)` call.
*/
const getResults = code => {
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
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(getNegatedExpressionText(node.arguments[0], context));
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

test('negates without parentheses when not needed', t => {
	for (const [code, expected] of [
		['inspect(foo);', '!foo'],
		['inspect(foo.bar());', '!foo.bar()'],
		['inspect(!foo);', '!!foo'],
		['inspect(foo?.bar);', '!foo?.bar'],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});

test('adds parentheses for lower precedence and ambiguous arguments', t => {
	for (const [code, expected] of [
		['inspect(a || b);', '!(a || b)'],
		['inspect(a === b);', '!(a === b)'],
		['inspect(a ? b : c);', '!(a ? b : c)'],
		['inspect(foo as boolean);', '!(foo as boolean)'],
		['inspect(foo!);', '!(foo!)'],
		['inspect(<boolean>foo);', '!(<boolean>foo)'],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}

	// Redundant parentheses around a sequence expression are dropped, and the negation adds them back.
	t.assert.deepStrictEqual(getResults('inspect((a, b));'), ['!(a, b)']);
});

test('drops redundant parentheses unless they contain comments', t => {
	t.assert.deepStrictEqual(getResults('inspect((a || b));'), ['!(a || b)']);
	t.assert.deepStrictEqual(getResults('inspect((foo));'), ['!foo']);
	t.assert.deepStrictEqual(getResults('inspect((/* comment */ foo));'), ['!(/* comment */ foo)']);
});
