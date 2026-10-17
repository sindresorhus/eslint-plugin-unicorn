import test from 'node:test';
import {Linter} from 'eslint';
import {getMemberExpressionObjectText} from '../../rules/utils/index.js';

const linter = new Linter();

/*
Get the member expression object text of the first argument of the `marker()` call in `code`.
*/
const getText = code => {
	let result;
	const messages = linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="marker"]'(node) {
								result = getMemberExpressionObjectText(node.arguments[0], context, node);
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

	return result;
};

test('keeps nodes that do not need parentheses as is', t => {
	t.assert.strictEqual(getText('marker(foo)'), 'foo');
	t.assert.strictEqual(getText('marker(foo.bar())'), 'foo.bar()');
});

test('adds parentheses when the node needs them as a member expression object', t => {
	t.assert.strictEqual(getText('marker(a + b)'), '(a + b)');
	t.assert.strictEqual(getText('marker(1)'), '(1)');
	t.assert.strictEqual(getText('marker(new Foo)'), '(new Foo)');
	t.assert.strictEqual(getText('marker(new Foo())'), 'new Foo()');
});

test('keeps existing parentheses without adding more', t => {
	t.assert.strictEqual(getText('marker((a + b))'), '(a + b)');
	t.assert.strictEqual(getText('marker((foo))'), '(foo)');
});

test('groups declaration-like prefixes in nested expressions', t => {
	for (const expression of [
		'{value: 1}.value',
		'function () {}.value',
		'async function () {}.value',
		'class {}.value',
		'{fn: foo}.fn()',
		'{tag: foo}.tag`text`',
	]) {
		t.assert.strictEqual(getText(`marker(${expression})`), `(${expression})`);
	}

	t.assert.strictEqual(getText('marker(({value: 1}).value)'), '({value: 1}).value');
});

test('declaration-like prefixes are grouped only at exposed expression starts', t => {
	for (const expression of ['{value: 1}.value', 'function () {}.value', 'class {}.value']) {
		t.assert.strictEqual(getText(`const value = marker(${expression});`), expression);
		t.assert.strictEqual(getText(`function read() { return marker(${expression}); }`), expression);
		t.assert.strictEqual(getText(`(marker(${expression}));`), expression);
		t.assert.strictEqual(getText(`export default marker(${expression});`), expression.startsWith('{') ? expression : `(${expression})`);
	}

	t.assert.strictEqual(getText('const read = () => marker({value: 1}.value) || fallback;'), '({value: 1}.value)');
	t.assert.strictEqual(getText('const read = () => marker(function () {}.value);'), 'function () {}.value');
	t.assert.strictEqual(getText('const read = () => marker(class {}.value);'), 'class {}.value');
});
