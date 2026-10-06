import test from 'node:test';
import {Linter} from 'eslint';
import {getOnlyExpression, getSingleStatement} from '../../rules/utils/index.js';

const linter = new Linter();

/*
Return the text `getResult` gives for the consequent of each `if` statement.
*/
const getResults = (code, getResult) => {
	const results = [];
	const messages = linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							IfStatement(node) {
								const result = getResult(node.consequent);
								results.push(result && context.sourceCode.getText(result));
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

test('`getSingleStatement` returns the statement itself or the only statement of a block', t => {
	for (const [code, expected] of [
		['if (a) foo();', 'foo();'],
		['if (a) { foo(); }', 'foo();'],
		['if (a) { throw error; }', 'throw error;'],
		['if (a) { const b = 1; }', 'const b = 1;'],
		['if (a) { { foo(); } }', '{ foo(); }'],
		['if (a) {}', undefined],
		['if (a) { foo(); bar(); }', undefined],
		['if (a);', ';'],
	]) {
		t.assert.deepStrictEqual(getResults(code, getSingleStatement), [expected], code);
	}

	t.assert.strictEqual(getSingleStatement(), undefined);
});

test('`getOnlyExpression` returns the expression of the single expression statement', t => {
	for (const [code, expected] of [
		['if (a) foo();', 'foo()'],
		['if (a) { foo(); }', 'foo()'],
		['if (a) { a = b; }', 'a = b'],
		['if (a) { throw error; }', undefined],
		['if (a) { const b = 1; }', undefined],
		['if (a) { { foo(); } }', undefined],
		['if (a) {}', undefined],
		['if (a) { foo(); bar(); }', undefined],
	]) {
		t.assert.deepStrictEqual(getResults(code, getOnlyExpression), [expected], code);
	}

	t.assert.strictEqual(getOnlyExpression(), undefined);
});
