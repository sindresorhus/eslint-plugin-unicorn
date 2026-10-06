import test from 'node:test';
import {Linter} from 'eslint';
import getAttachedComment from '../../rules/utils/get-attached-comment.js';

const linter = new Linter();

/**
Get the attached comment value for each matching node in the supplied code.
*/
function getResults(code, selector = ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression)') {
	const results = [];
	const messages = linter.verify(code, {
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							[selector](node) {
								results.push(getAttachedComment(node, context)?.value);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	if (messages.length > 0) {
		throw new Error(messages[0].message);
	}

	return results;
}

test('finds comments on functions and enclosing declarations', t => {
	for (const code of [
		'/** attached */ function format() {}',
		'/** attached */ const format = () => {};',
		'/** attached */ const format = function () {};',
		'/** attached */ export const format = () => {};',
		'/** attached */ export default function format() {}',
		'/** attached */ format = () => {};',
		'const object = {/** attached */ format() {}};',
		'class Formatter {/** attached */ #format() {}}',
		'class Formatter {/** attached */ format = () => {};}',
	]) {
		t.assert.deepStrictEqual(getResults(code), ['* attached ']);
	}
});

test('finds adjacent line comments and chooses the nearest comment', t => {
	t.assert.deepStrictEqual(getResults('// attached\nfunction format() {}'), [' attached']);
	t.assert.deepStrictEqual(getResults('/** first */\n/** second */\nfunction format() {}'), ['* second ']);
});

test('ignores separated comments and comments on unrelated parents', t => {
	for (const code of [
		'function format() {}',
		'/** detached */\n\nfunction format() {}',
		'/** detached */ const object = {format() {}};',
		'/** detached */ call(() => {});',
	]) {
		t.assert.deepStrictEqual(getResults(code), [undefined]);
	}
});

test('returns undefined for a root node without a parent', t => {
	t.assert.deepStrictEqual(getResults('', 'Program'), [undefined]);
});
