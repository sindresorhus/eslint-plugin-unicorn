import test from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import languages from './utils/languages.js';
import {testDisableDirectives} from './utils/test-disable-directives.js';

const cases = [
	['consistent-arrow-return-style', 'const f = () => @ (\nvalue\n);'],
	['no-blob-to-file', 'const blob = new Blob(); const file = new File([@ blob], "x"); URL.createObjectURL(file);'],
	['no-blob-to-file', 'const blob = new Blob(); const file = new File([blob], "x"); @\nURL.createObjectURL(file);'],
	['default-export-style', 'const f = () => {}; @ export default f;'],
	['default-export-style', 'class C {} @ export default C;'],
	// eslint-disable-next-line no-template-curly-in-string
	['operator-assignment', 'foo = `${@ foo} bar`;'],
	['no-incorrect-query-selector', 'document.querySelectorAll("form").at(@ 0);'],
	['no-incorrect-query-selector', 'document.querySelectorAll("form").item(@ 0);'],
];

for (const [ruleName, template] of cases) {
	testDisableDirectives(ruleName, template);
}

for (const [name, ordinaryComment, directive] of [
	['css', '/* Explanation. */', '/* eslint-disable unicorn/no-empty-file */'],
	['html', '<!-- Explanation. -->', '<!-- eslint-disable unicorn/no-empty-file -->'],
	['markdown', '<!-- Explanation. -->', '<!-- eslint-disable unicorn/no-empty-file -->'],
	['toml', '# Explanation.', '# eslint-disable unicorn/no-empty-file'],
	['yaml', '# Explanation.', '# eslint-disable unicorn/no-empty-file'],
]) {
	test(`no-empty-file counts ordinary comments but honors directives in ${name}`, t => {
		const linter = new Linter();
		const ruleId = 'unicorn/no-empty-file';
		const language = languages[name];
		const config = {
			files: [`**/*.${name}`],
			language: language.language,
			plugins: {...language.plugins, unicorn},
			rules: {[ruleId]: ['error', {allowComments: true}]},
			linterOptions: {reportUnusedDisableDirectives: 'error'},
		};
		const verifyOptions = {filename: `file.${name}`};
		const baselineMessages = linter.verify('', config, verifyOptions);
		t.assert.strictEqual(baselineMessages.length, 1);
		t.assert.strictEqual(baselineMessages[0].ruleId, ruleId);
		t.assert.deepStrictEqual(linter.verify(ordinaryComment, config, verifyOptions), []);
		t.assert.deepStrictEqual(linter.verify(directive, config, verifyOptions), []);
		const suppressedMessages = linter.getSuppressedMessages();
		t.assert.strictEqual(suppressedMessages.length, 1);
		t.assert.strictEqual(suppressedMessages[0].ruleId, ruleId);
		for (const allowComments of [true, false]) {
			const indentedCode = `\n\n  ${directive}  \n`;
			t.assert.deepStrictEqual(linter.verify(indentedCode, {...config, rules: {[ruleId]: ['error', {allowComments}]}}, verifyOptions), []);
			t.assert.strictEqual(linter.getSuppressedMessages().length, 1);
		}

		const unrelatedMessages = linter.verify(directive.replace(ruleId, 'no-alert'), {...config, linterOptions: {reportUnusedDisableDirectives: 'off'}}, verifyOptions);
		t.assert.strictEqual(unrelatedMessages.length, 1);
		t.assert.strictEqual(unrelatedMessages[0].ruleId, ruleId);
		t.assert.deepStrictEqual(linter.verify(`${directive}\n${ordinaryComment}`, {...config, linterOptions: {reportUnusedDisableDirectives: 'off'}}, verifyOptions), []);
	});
}

test('no-empty-file handles adjacent Markdown comments', t => {
	const linter = new Linter();
	const ruleId = 'unicorn/no-empty-file';
	const config = {
		files: ['**/*.md'],
		language: languages.markdown.language,
		plugins: {...languages.markdown.plugins, unicorn},
		linterOptions: {reportUnusedDisableDirectives: 'error'},
	};
	const verifyOptions = {filename: 'file.md'};
	for (const separator of ['', ' ', '\n']) {
		for (const allowComments of [false, true]) {
			const ruleConfig = {...config, rules: {[ruleId]: ['error', {allowComments}]}};
			const ordinaryComments = `<!-- First. -->${separator}<!-- Second. -->`;
			const ordinaryMessages = linter.verify(ordinaryComments, ruleConfig, verifyOptions);
			t.assert.deepStrictEqual(ordinaryMessages.map(message => message.ruleId), allowComments ? [] : [ruleId]);
			const directives = `<!-- eslint-disable ${ruleId} -- Explanation. -->${separator}<!-- eslint-enable ${ruleId} -->`;
			t.assert.deepStrictEqual(linter.verify(directives, ruleConfig, verifyOptions), []);
			const suppressedMessages = linter.getSuppressedMessages();
			t.assert.strictEqual(suppressedMessages.length, 1);
			t.assert.strictEqual(suppressedMessages[0].ruleId, ruleId);
			const unrelatedDirectives = directives.replaceAll(ruleId, 'no-alert');
			const unrelatedMessages = linter.verify(unrelatedDirectives, {...ruleConfig, linterOptions: {reportUnusedDisableDirectives: 'off'}}, verifyOptions);
			t.assert.deepStrictEqual(unrelatedMessages.map(message => message.ruleId), [ruleId]);
			t.assert.strictEqual(linter.getSuppressedMessages().length, 0);
			const mixedComments = `<!-- eslint-disable ${ruleId} -->${separator}<!-- Explanation. -->`;
			t.assert.deepStrictEqual(linter.verify(mixedComments, {...ruleConfig, linterOptions: {reportUnusedDisableDirectives: 'off'}}, verifyOptions), []);
			t.assert.strictEqual(linter.getSuppressedMessages().length, allowComments ? 0 : 1);
			t.assert.deepStrictEqual(linter.verify(`${ordinaryComments} text`, ruleConfig, verifyOptions), []);
			t.assert.deepStrictEqual(linter.verify(`${ordinaryComments}<div></div>`, ruleConfig, verifyOptions), []);
		}
	}
});

for (const [ruleName, template] of [
	['no-blob-to-file', 'const blob = new Blob();\n@ const file = new File([blob], "x");\nURL.createObjectURL(file);'],
	['default-export-style', 'function f() {}\n@ export default f;'],
	['no-magic-array-flat-depth', 'array.flat(\n@ 2);'],
]) {
	for (const directiveType of ['disable', 'disable-next-line']) {
		test(`${ruleName} honors ${directiveType} before its report location`, t => {
			const linter = new Linter();
			const ruleId = `unicorn/${ruleName}`;
			const config = {
				plugins: {unicorn},
				rules: {[ruleId]: 'error'},
				linterOptions: {reportUnusedDisableDirectives: 'error'},
			};
			const code = template.replace('@', () => `/* eslint-${directiveType} ${ruleId} */\n`);
			t.assert.deepStrictEqual(linter.verify(code, config), []);
			t.assert.strictEqual(linter.getSuppressedMessages().length, 1);
		});
	}
}
