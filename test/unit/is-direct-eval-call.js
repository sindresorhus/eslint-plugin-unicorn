import test from 'node:test';
import {Linter} from 'eslint';
import {isDirectEvalCall} from '../../rules/ast/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

/*
Return `isDirectEvalCall` for each call expression.
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
						create: () => ({
							CallExpression(node) {
								results.push(isDirectEvalCall(node));
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

test('detects direct `eval` calls', t => {
	for (const code of [
		'eval(code);',
		'eval();',
		'(eval)(code);',
		'eval<string>(code);',
		'(eval as any)(code);',
		'eval!(code);',
		'(eval satisfies Function)(code);',
		'(<any>eval)(code);',
	]) {
		t.assert.deepStrictEqual(getResults(code), [true], code);
	}
});

test('ignores indirect `eval` calls and other calls', t => {
	for (const code of [
		'(0, eval)(code);',
		'eval?.(code);',
		'globalThis.eval(code);',
		'window.eval(code);',
		'foo(code);',
		'evaluate(code);',
	]) {
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}

	t.assert.strictEqual(isDirectEvalCall(), false);
	t.assert.strictEqual(isDirectEvalCall({type: 'NewExpression', callee: {type: 'Identifier', name: 'eval'}}), false);
});
