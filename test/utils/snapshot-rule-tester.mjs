import {createRequire} from 'node:module';
import {Linter} from 'eslint';
import {codeFrameColumns} from '@babel/code-frame';
import outdent from 'outdent';

const require = createRequire(import.meta.url);
const codeFrameColumnsOptions = {linesAbove: Number.POSITIVE_INFINITY, linesBelow: Number.POSITIVE_INFINITY};
// A simple version of `SourceCodeFixer.applyFixes`
// https://github.com/eslint/eslint/issues/14936#issuecomment-906746754
const applyFix = (code, {fix}) => `${code.slice(0, fix.range[0])}${fix.text}${code.slice(fix.range[1])}`;

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
const indentCode = code => code.replaceAll(/^/gm, INDENT);
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
				['code', 'options', 'filename', 'parserOptions', 'parser', 'globals', 'only'],
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
		env,
		globals,
	} = testCase;

	return {
		...testerConfig,
		parser,
		parserOptions: {
			...testerConfig.parserOptions,
			...parserOptions,
		},
		env: {
			...testerConfig.env,
			...env,
		},
		globals: {
			...testerConfig.globals,
			...globals,
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

function verify(linter, code, verifyConfig, {filename}) {
	const messages = linter.verify(code, verifyConfig, {filename});

	// Missed `message`, #1923
	const invalidMessage = messages.find(({message}) => typeof message !== 'string');
	if (invalidMessage) {
		throw Object.assign(new Error('Unexpected message.'), {eslintMessage: invalidMessage});
	}

	const fatalError = messages.find(({fatal}) => fatal);
	if (fatalError) {
		const {line, column, message} = fatalError;
		throw new SyntaxError('\n' + codeFrameColumns(code, {start: {line, column}}, {message}));
	}

	return messages;
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
			const {code, filename, only} = testCase;
			const verifyConfig = getVerifyConfig(ruleId, config, testCase);
			defineParser(linter, verifyConfig.parser);

			(only ? test.only : test)(
				outdent`
					Valid #${index + 1}
					${indentCode(printCode(code))}
				`,
				t => {
					const messages = verify(linter, code, verifyConfig, {filename});
					t.deepEqual(messages, [], 'Valid case should not have errors.');
				},
			);
		}

		for (const [index, testCase] of invalid.entries()) {
			const {code, options, filename, only} = testCase;
			const verifyConfig = getVerifyConfig(ruleId, config, testCase);
			defineParser(linter, verifyConfig.parser);
			const runVerify = code => verify(linter, code, verifyConfig, {filename});

			(only ? test.only : test)(
				outdent`
					Invalid #${index + 1}
					${indentCode(printCode(code))}
				`,
				t => {
					const messages = runVerify(code);
					t.notDeepEqual(messages, [], 'Invalid case should have at least one error.');

					const {fixed, output} = fixable ? linter.verifyAndFix(code, verifyConfig, {filename}) : {fixed: false};

					if (filename) {
						t.snapshot(`\n${filename}\n`, 'Filename');
					}

					if (Array.isArray(options)) {
						t.snapshot(`\n${JSON.stringify(options, undefined, 2)}\n`, 'Options');
					}

					if (fixable && fixed) {
						runVerify(output);
						t.snapshot(`\n${printCode(output)}\n`, 'Output');
					}

					for (const [index, message] of messages.entries()) {
						let messageForSnapshot = visualizeEslintMessage(code, message);

						const {suggestions = []} = message;

						for (const [index, suggestion] of suggestions.entries()) {
							const output = applyFix(code, suggestion);
							runVerify(output);

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
