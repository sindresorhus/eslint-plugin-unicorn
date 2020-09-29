'use strict';
const {Linter} = require('eslint');
const {codeFrameColumns} = require('@babel/code-frame');
const {outdent} = require('outdent');
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
			test(`${ruleId} - #${index + 1}`, t => {
				const results = linter.verify(code, verifyConfig);
				if (results.length === 0) {
					throw new Error('No errors reported.');
				}

				const fatalError = results.find(({fatal}) => fatal);
				if (fatalError) {
					throw new Error(fatalError);
				}

				let visualized = results.map((error, index, results) => {
					return `Error ${index + 1}/${results.length}:\n${visualizeEslintResult(code, error)}`;
				});

				t.snapshot(`\n${visualized.join('\n\n')}\n`);
			});
		}
	}
}

function visualizeRuleTester(test, config) {
	return new VisualizeRuleTester(test, config);
}

module.exports = visualizeRuleTester;
