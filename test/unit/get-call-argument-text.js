import test from 'node:test';
import {Linter} from 'eslint';
import {getCallArgumentText} from '../../rules/utils/index.js';

const linter = new Linter();

/*
Return `getCallArgumentText` for the argument of each `inspect(…)` call.
*/
const getResults = code => {
	const results = [];
	const messages = linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(getCallArgumentText(node.arguments[0], context));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	});

	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return results;
};

test('wraps only sequence expressions in parentheses', t => {
	for (const [code, expected] of [
		['inspect(foo);', 'foo'],
		['inspect(a + b);', 'a + b'],
		['inspect(a = b);', 'a = b'],
		['inspect(a ? b : c);', 'a ? b : c'],
		['inspect(...foo);', '...foo'],
		['inspect((a, b));', '(a, b)'],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});

test('drops redundant parentheses unless they contain comments', t => {
	for (const [code, expected] of [
		['inspect((foo));', 'foo'],
		['inspect(((a, b)));', '(a, b)'],
		['inspect((/* comment */ foo));', '(/* comment */ foo)'],
		['inspect((/* comment */ (a, b)));', '(/* comment */ (a, b))'],
		['inspect(((a, /* comment */ b)));', '(a, /* comment */ b)'],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});
