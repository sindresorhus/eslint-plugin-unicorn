'use strict';
const {Linter} = require('eslint');
const {codeFrameColumns} = require('@babel/code-frame');
const codeFrameColumnsOptions = {linesAbove: Infinity, linesBelow: Infinity};

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

	return `\n${visualizeRange(text, location, message)}\n`;
}

class VisualizeRuleTester {
	constructor(test, config) {
		this.test = test;
		this.config = config;
	}

	run(ruleId, rule, tests) {
		const {test, config} = this;
		const linter = new Linter();
		const verifyConfig = {
			...config,
			rules: {
				[ruleId]: 'error'
			}
		};

		linter.defineRule(ruleId, rule);

		for (const [index, code] of tests.entries()) {
			test(`${ruleId} - #${index + 1}`, t => {
				const results = linter.verify(code, verifyConfig);

				if (results.length !== 1) {
					throw new Error(`Result: \n${JSON.stringify(results, undefined, 2)}\n\nVisualize test should has exactly one error.`);
				}

				const [error] = results;

				if (error.fatal) {
					throw new Error(error.message);
				}

				t.snapshot(visualizeEslintResult(code, error));
			});
		}
	}
}

function visualizeRuleTester(test, config) {
	return new VisualizeRuleTester(test, config);
}

module.exports = visualizeRuleTester;
