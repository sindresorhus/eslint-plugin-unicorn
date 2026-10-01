/* eslint-disable ava/no-ignored-test-files -- This helper registers tests from AVA test files. */
import test from 'ava';
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
			t.is(messages.length, expectedReports);
			t.true(messages.every(message => message.ruleId === ruleId));

			const disable = `/* eslint-disable ${ruleId}${explanation} */\n`;
			t.deepEqual(linter.verify(disable + baseline, config), []);
			t.is(linter.getSuppressedMessages().length, expectedReports);

			const code = template.replace('@', () => `/* eslint-disable-line ${ruleId}${explanation} */`);
			t.deepEqual(linter.verify(code, config), []);
			const suppressedMessages = linter.getSuppressedMessages();
			t.is(suppressedMessages.length, expectedReports);
			for (const message of suppressedMessages) {
				t.is(message.ruleId, ruleId);
				t.is(message.fix, undefined);
				t.is(message.suggestions, undefined);
			}

			const result = linter.verifyAndFix(code, config);
			t.deepEqual(result.messages, []);
			t.false(result.fixed);
			t.is(result.output, code);

			const blockCode = disable + template.replace('@', () => `/* eslint-enable ${ruleId}${explanation} */`);
			const blockMessages = linter.verify(blockCode, config);
			const blockReports = [...blockMessages.filter(message => message.ruleId === ruleId), ...linter.getSuppressedMessages()];
			t.is(blockReports.length, expectedReports);
			for (const message of blockReports) {
				t.is(message.ruleId, ruleId);
				t.is(message.fix, undefined);
				t.is(message.suggestions, undefined);
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
		t.is(result.messages.length, expectedReports);
		for (const message of result.messages) {
			t.is(message.ruleId, ruleId);
			t.is(message.fix, undefined);
			t.is(message.suggestions, undefined);
		}

		t.false(result.fixed);
		t.is(result.output, code);
	});

	for (const comment of ['/* Explanation. */', `/* eslint-enable ${ruleId} */ /* Explanation. */`]) {
		test(`${ruleName} still skips ordinary comments (${comment}): ${template}`, t => {
			const linter = new Linter();
			const code = template.replace('@', () => comment);
			t.deepEqual(linter.verify(code, {...config, linterOptions: {reportUnusedDisableDirectives: 'off'}}), []);
		});
	}
}
