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

	return visualizeRange(text, location, message);
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
			test(`${ruleId} - #${index}`, t => {
				const results = linter.verify(code, verifyConfig);
				if (results.length === 0) {
					throw new Error('No errors reported.');
				}

				const fatalError = results.find(({fatal}) => fatal);
				if (fatalError) {
					throw new Error(fatalError);
				}

				let visualized = '\n';
				for (const [index, error] of results.entries()) {
					visualized += `Error #${index}:\n${visualizeEslintResult(code, error)}`
				}
				visualized += '\n';

				t.snapshot(visualized);
			});
		}
	}
}

function visualizeRuleTester(test, config) {
	return new VisualizeRuleTester(test, config);
}

module.exports = visualizeRuleTester;
