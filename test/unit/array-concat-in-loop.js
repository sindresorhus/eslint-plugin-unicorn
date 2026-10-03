import test from 'node:test';
import {Linter} from 'eslint';
import {getArrayConcatInLoop} from '../../rules/shared/array-concat-in-loop.js';

const linter = new Linter();

/*
Return whether each assignment in `code` is an array `.concat()` in a loop.
*/
const getVerdicts = code => {
	const verdicts = [];

	const messages = linter.verify(code, {
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							AssignmentExpression(node) {
								verdicts.push(Boolean(getArrayConcatInLoop(node, context)));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return verdicts;
};

test('only a plain assignment is a concatenation in a loop', t => {
	t.assert.deepStrictEqual(getVerdicts('function f(items) { let result = []; for (const item of items) { result = result.concat(item); } }'), [true]);
	t.assert.deepStrictEqual(getVerdicts('function f(items) { let result = []; for (const item of items) { result += result.concat(item); } }'), [false]);
});

test('the receiver must be the assigned variable', t => {
	t.assert.deepStrictEqual(getVerdicts('function f(items) { let result = []; for (const item of items) { result = [].concat(item); } }'), [false]);
});
