import {createRequire} from 'node:module';
import {Linter, SourceCodeFixer} from 'eslint/lib/linter/index.js';
import {codeFrameColumns} from '@babel/code-frame';
import outdent from 'outdent';

const require = createRequire(import.meta.url);
const codeFrameColumnsOptions = {linesAbove: Number.POSITIVE_INFINITY, linesBelow: Number.POSITIVE_INFINITY};

function visualizeRange(text, location, message) {
	return codeFrameColumns(
		text,
		location,
		{
			...codeFrameColumnsOptions,
			message,
		},
	);
}

function visualizeEslintMessage(text, result) {
	const {line, column, endLine, endColumn, message} = result;
	const location = {
		start: {
			line,
			column,
		},
	};

	if (typeof endLine === 'number' && typeof endColumn === 'number') {
		location.end = {
			line: endLine,
			column: endColumn,
		};
	}

	return visualizeRange(text, location, message);
}

const printCode = code => codeFrameColumns(code, {start: {line: 0, column: 0}}, codeFrameColumnsOptions);
const INDENT = ' '.repeat(4);
const indentCode = code => code.replace(/^/gm, INDENT);
const getAdditionalProperties = (object, properties) =>
	Object.keys(object).filter(property => !properties.includes(property));

function normalizeTests(tests) {
	const additionalProperties = getAdditionalProperties(tests, ['valid', 'invalid']);
	if (additionalProperties.length > 0) {
		throw new Error(`Unexpected snapshot test properties: ${additionalProperties.join(', ')}`);
	}

	for (const type of ['valid', 'invalid']) {
		const cases = tests[type];

		for (const [index, testCase] of cases.entries()) {
			if (typeof testCase === 'string') {
				cases[index] = {code: testCase};
				continue;
			}

			const additionalProperties = getAdditionalProperties(
				testCase,
				['code', 'options', 'filename', 'parserOptions', 'parser'],
			);

			if (additionalProperties.length > 0) {
				throw new Error(`Unexpected ${type} snapshot test case properties: ${additionalProperties.join(', ')}`);
			}
		}
	}

	return tests;
}

function getVerifyConfig(ruleId, testerConfig, testCase) {
	const {
		options,
		parserOptions,
		parser = testerConfig.parser,
	} = testCase;

	return {
		...testerConfig,
		parser,
		parserOptions: {
			...testerConfig.parserOptions,
			...parserOptions,
		},
		rules: {
			[ruleId]: ['error', ...(Array.isArray(options) ? options : [])],
		},
	};
}

const parsers = new WeakMap();
function defineParser(linter, parser) {
	if (!parser) {
		return;
	}

	if (!parsers.has(linter)) {
		parsers.set(linter, new Set());
	}

	const defined = parsers.get(linter);
	if (defined.has(parser)) {
		return;
	}

	defined.add(parser);
	linter.defineParser(parser, require(parser));
}

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

		const {valid, invalid} = normalizeTests(tests);

		for (const [index, testCase] of valid.entries()) {
			const {code, filename} = testCase;
			const verifyConfig = getVerifyConfig(ruleId, config, testCase);
			defineParser(linter, verifyConfig.parser);

			test(
				outdent`
					Valid #${index + 1}
					${indentCode(printCode(code))}
				`,
				t => {
					const messages = linter.verify(code, verifyConfig, {filename});
					t.deepEqual(messages, [], 'Valid case should not has errors.');
				},
			);
		}

		for (const [index, testCase] of invalid.entries()) {
			const {code, options, filename} = testCase;
			const verifyConfig = getVerifyConfig(ruleId, config, testCase);
			defineParser(linter, verifyConfig.parser);

			test(
				outdent`
					Invalid #${index + 1}
					${indentCode(printCode(code))}
				`,
				t => {
					const messages = linter.verify(code, verifyConfig, {filename});
					t.notDeepEqual(messages, [], 'Invalid case should has at least one error.');

					const fatalError = messages.find(({fatal}) => fatal);
					if (fatalError) {
						throw fatalError;
					}

					const {fixed, output} = fixable ? linter.verifyAndFix(code, verifyConfig, {filename}) : {fixed: false};

					if (filename) {
						t.snapshot(`\n${filename}\n`, 'Filename');
					}

					if (Array.isArray(options)) {
						t.snapshot(`\n${JSON.stringify(options, undefined, 2)}\n`, 'Options');
					}

					if (fixable && fixed) {
						t.snapshot(`\n${printCode(output)}\n`, 'Output');
					}

					for (const [index, message] of messages.entries()) {
						let messageForSnapshot = visualizeEslintMessage(code, message);

						const {suggestions = []} = message;
						if (suggestions.length > 0 && rule.meta.hasSuggestions !== true) {
							// This check will no longer be necessary if this change lands in ESLint 8: https://github.com/eslint/eslint/issues/14312
							throw new Error('Rule with suggestion is missing `meta.hasSuggestions`.');
						}

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
				},
			);
		}
	}
}

export default SnapshotRuleTester;
