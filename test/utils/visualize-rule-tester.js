'use strict';
const {Linter} = require('eslint');
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

function visualizeEslintResult(text, result) {
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

function createSnapshot({fixable, code, options, fixed, output, messages}) {
	const parts = [];

	if (Array.isArray(options)) {
		parts.push(outdent`
			Options:
			${JSON.stringify(options, undefined, 2)}
		`);
	}

	if (fixable) {
		parts.push(
			outdent`
				Input:
				${printCode(code)}
			`,
			outdent`
				Output:
				${fixed ? printCode(output) : '[Same as input]'}
			`
		);
	}

	parts.push(
		messages
			.map(
				(error, index, messages) =>
					`Error ${index + 1}/${messages.length}:\n${visualizeEslintResult(code, error)}`
			)
			.join('\n')
	);

	return `\n${parts.join('\n\n')}\n`;
}

class VisualizeRuleTester {
	constructor(test, config) {
		this.test = test;
		this.config = config;
	}

	run(ruleId, rule, tests) {
		const {test, config} = this;
		const fixable = rule.meta && rule.meta.fixable;
		const linter = new Linter();
		linter.defineRule(ruleId, rule);

		for (const [index, testCase] of tests.entries()) {
			const {code, options} = typeof testCase === 'string' ? {code: testCase} : testCase;
			const verifyConfig = getVerifyConfig(ruleId, config, options);

			test(`${ruleId} - #${index + 1}`, t => {
				const messages = linter.verify(code, verifyConfig);
				if (messages.length === 0) {
					throw new Error('No errors reported.');
				}

				const fatalError = messages.find(({fatal}) => fatal);
				if (fatalError) {
					throw fatalError;
				}

				const {fixed, output} = fixable ? linter.verifyAndFix(code, verifyConfig) : {fixed: false};

				t.snapshot(
					createSnapshot({fixable, code, options, fixed, output, messages})
				);
			});
		}
	}
}

function visualizeRuleTester(test, config) {
	return new VisualizeRuleTester(test, config);
}

module.exports = visualizeRuleTester;
