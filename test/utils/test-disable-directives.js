import test from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../../index.js';

export function testDisableDirectives(ruleName, template, {options = [], expectedReports = 1, languageOptions} = {}) {
	const ruleId = `unicorn/${ruleName}`;
	const config = {
		plugins: {unicorn},
		rules: {[ruleId]: ['error', ...options]},
		linterOptions: {reportUnusedDisableDirectives: 'error'},
		...(languageOptions && {languageOptions}),
	};

	for (const explanation of ['', ' -- Keep this code readable.']) {
		test(`${ruleName} honors directives${explanation}: ${template}`, t => {
			const linter = new Linter();
			const baseline = template.replace('@', '');
			const messages = linter.verify(baseline, config);
			t.assert.strictEqual(messages.length, expectedReports);
			t.assert.strictEqual(messages.every(message => message.ruleId === ruleId), true);

			const disable = `/* eslint-disable ${ruleId}${explanation} */\n`;
			t.assert.deepStrictEqual(linter.verify(disable + baseline, config), []);
			t.assert.strictEqual(linter.getSuppressedMessages().length, expectedReports);

			const code = template.replace('@', () => `/* eslint-disable-line ${ruleId}${explanation} */`);
			t.assert.deepStrictEqual(linter.verify(code, config), []);
			const suppressedMessages = linter.getSuppressedMessages();
			t.assert.strictEqual(suppressedMessages.length, expectedReports);
			for (const message of suppressedMessages) {
				t.assert.strictEqual(message.ruleId, ruleId);
				t.assert.strictEqual(message.fix, undefined);
				t.assert.strictEqual(message.suggestions, undefined);
			}

			const result = linter.verifyAndFix(code, config);
			t.assert.deepStrictEqual(result.messages, []);
			t.assert.strictEqual(result.fixed, false);
			t.assert.strictEqual(result.output, code);

			const blockCode = disable + template.replace('@', () => `/* eslint-enable ${ruleId}${explanation} */`);
			const blockMessages = linter.verify(blockCode, config);
			const blockReports = [...blockMessages.filter(message => message.ruleId === ruleId), ...linter.getSuppressedMessages()];
			t.assert.strictEqual(blockReports.length, expectedReports);
			for (const message of blockReports) {
				t.assert.strictEqual(message.ruleId, ruleId);
				t.assert.strictEqual(message.fix, undefined);
				t.assert.strictEqual(message.suggestions, undefined);
			}
		});
	}

	test(`${ruleName} reports with unrelated directives: ${template}`, t => {
		const linter = new Linter();
		const code = '/* eslint-disable no-alert */\nalert(0);\n' + template.replace('@', '/* eslint-enable no-alert */');
		const result = linter.verifyAndFix(code, {
			...config,
			rules: {...config.rules, 'no-alert': 'error'},
		});
		t.assert.strictEqual(result.messages.length, expectedReports);
		for (const message of result.messages) {
			t.assert.strictEqual(message.ruleId, ruleId);
			t.assert.strictEqual(message.fix, undefined);
			t.assert.strictEqual(message.suggestions, undefined);
		}

		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
	});

	for (const comment of ['/* Explanation. */', `/* eslint-enable ${ruleId} */ /* Explanation. */`]) {
		test(`${ruleName} still skips ordinary comments (${comment}): ${template}`, t => {
			const linter = new Linter();
			const code = template.replace('@', () => comment);
			t.assert.deepStrictEqual(linter.verify(code, {...config, linterOptions: {reportUnusedDisableDirectives: 'off'}}), []);
		});
	}
}
