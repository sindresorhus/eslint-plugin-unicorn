import test from 'node:test';
import {Linter} from 'eslint';
import toEslintRule from '../../rules/rule/to-eslint-rule.js';

const linter = new Linter();

const getRuleConfig = getProblem => ({
	plugins: {
		test: {
			rules: {
				rule: toEslintRule('test-rule', {
					meta: {
						fixable: 'code',
						hasSuggestions: true,
						messages: {
							problem: 'Test problem.',
							replace: 'Replace the identifier.',
						},
					},
					create(context) {
						context.on('Identifier', node => {
							if (node.name === 'value') {
								return {node, messageId: 'problem', ...getProblem(node)};
							}
						});
					},
				}),
			},
		},
	},
	rules: {'test/rule': 'error'},
});

test('aborting regular or generator fixes discards all edits', t => {
	for (const getProblem of [
		node => ({
			fix: (fixer, {abort}) => [fixer.replaceText(node, 'replacement'), abort()],
		}),
		node => ({
			* fix(fixer, {abort}) {
				yield fixer.replaceText(node, 'replacement');
				abort();
			},
		}),
	]) {
		const {output, fixed, messages} = linter.verifyAndFix('value;', getRuleConfig(getProblem));
		t.assert.strictEqual(output, 'value;');
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].message, 'Test problem.');
		t.assert.strictEqual(messages[0].fix, undefined);
	}
});

test('aborting a suggestion leaves the report and other suggestions available', t => {
	const config = getRuleConfig(node => ({
		suggest: [
			{
				messageId: 'replace',
				fix: (fixer, {abort}) => [fixer.replaceText(node, 'aborted'), abort()],
			},
			{
				messageId: 'replace',
				fix: fixer => fixer.replaceText(node, 'replacement'),
			},
		],
	}));
	const [message] = linter.verify('value;', config);
	t.assert.strictEqual(message.message, 'Test problem.');
	t.assert.deepStrictEqual(message.suggestions.map(suggestion => suggestion.fix), [{range: [0, 5], text: 'replacement'}]);
});

test('undefined edits mixed with valid edits are ignored', t => {
	for (const getProblem of [
		node => ({
			* fix(fixer) {
				yield;
				yield fixer.insertTextBefore(node, '(');
				yield [undefined, fixer.replaceText(node, 'replacement')];
				yield fixer.insertTextAfter(node, ')');
			},
		}),
		node => ({fix: fixer => [undefined, [fixer.insertTextBefore(node, '('), undefined], fixer.replaceText(node, 'replacement'), fixer.insertTextAfter(node, ')')]}),
	]) {
		const {output, fixed, messages} = linter.verifyAndFix('value;', getRuleConfig(getProblem));
		t.assert.strictEqual(output, '(replacement);');
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
	}
});

test('unexpected errors from regular calls and generator iteration still propagate', t => {
	const failure = new Error('Unexpected fixer failure.');
	for (const getProblem of [
		() => ({
			fix() {
				throw failure;
			},
		}),
		node => ({
			* fix(fixer) {
				yield fixer.replaceText(node, 'replacement');
				throw failure;
			},
		}),
	]) {
		t.assert.throws(() => linter.verify('value;', getRuleConfig(getProblem)), error => error === failure);
	}
});
