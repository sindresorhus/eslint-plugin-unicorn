'use strict';
const {Linter, SourceCodeFixer} = require('eslint/lib/linter');
const {codeFrameColumns} = require('@babel/code-frame');
const {outdent} = require('outdent');

const codeFrameColumnsOptions = {linesAbove: Number.POSITIVE_INFINITY, linesBelow: Number.POSITIVE_INFINITY};

function visualizeRange(text, location, message) {
	return codeFrameColumns(
		text,
		location,
		{
			...codeFrameColumnsOptions,
			message
		}
	);
}

function visualizeEslintMessage(text, result) {
	const {line, column, endLine, endColumn, message} = result;
	const location = {
		start: {
			line,
			column
		}
	};

	if (typeof endLine === 'number' && typeof endColumn === 'number') {
		location.end = {
			line: endLine,
			column: endColumn
		};
	}

	return visualizeRange(text, location, message);
}

const getVerifyConfig = (ruleId, testerConfig, options) => ({
	...testerConfig,
	rules: {
		[ruleId]: ['error', ...(Array.isArray(options) ? options : [])]
	}
});

const printCode = code => codeFrameColumns(code, {start: {line: 0, column: 0}}, codeFrameColumnsOptions);
const INDENT = ' '.repeat(4);
const indentCode = code => code.replace(/^/gm, INDENT);
class SnapshotRuleTester {
	constructor(test, config) {
		this.test = test;
		this.config = config;
	}

	run(ruleId, rule, tests) {
		const {test, config} = this;
		const fixable = rule.meta && rule.meta.fixable;
		const linter = new Linter();
		linter.defineRule(ruleId, rule);

		tests = Array.isArray(tests) ? {valid: [], invalid: tests} : tests;

		for (const [index, testCase] of tests.valid.entries()) {
			const {code, options} = typeof testCase === 'string' ? {code: testCase} : testCase;
			const verifyConfig = getVerifyConfig(ruleId, config, options);

			test(
				outdent`
					Valid #${index + 1}
					${indentCode(printCode(code))}
				`,
				t => {
					const messages = linter.verify(code, verifyConfig);
					t.deepEqual(messages, [], 'Valid case should not has errors.');
				}
			);
		}

		for (const [index, testCase] of tests.invalid.entries()) {
			const {code, options} = typeof testCase === 'string' ? {code: testCase} : testCase;
			const verifyConfig = getVerifyConfig(ruleId, config, options);

			test(
				outdent`
					Invalid #${index + 1}
					${indentCode(printCode(code))}
				`,
				t => {
					const messages = linter.verify(code, verifyConfig);
					t.notDeepEqual(messages, [], 'Invalid case should has at least one error.');

					const fatalError = messages.find(({fatal}) => fatal);
					if (fatalError) {
						throw fatalError;
					}

					const {fixed, output} = fixable ? linter.verifyAndFix(code, verifyConfig) : {fixed: false};

					if (Array.isArray(options)) {
						t.snapshot(`\n${JSON.stringify(options, undefined, 2)}\n`, 'Options');
					}

					if (fixable && fixed) {
						t.snapshot(`\n${printCode(output)}\n`, 'Output');
					}

					for (const [index, message] of messages.entries()) {
						let messageForSnapshot = visualizeEslintMessage(code, message);

						const {suggestions = []} = message;
						for (const [index, suggestion] of suggestions.entries()) {
							const {output} = SourceCodeFixer.applyFixes(code, [suggestion]);
							messageForSnapshot += outdent`
								\n
								${'-'.repeat(80)}
								Suggestion ${index + 1}/${suggestions.length}: ${suggestion.desc}
								${printCode(output)}
							`;
						}

						t.snapshot(`\n${messageForSnapshot}\n`, `Error ${index + 1}/${messages.length}`);
					}
				}
			);
		}
	}
}

function snapshotRuleTester(test, config) {
	return new SnapshotRuleTester(test, config);
}

module.exports = snapshotRuleTester;
