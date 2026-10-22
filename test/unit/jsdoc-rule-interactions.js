import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import unicorn from '../../index.js';

const linter = new Linter();
const namingOptions = {
	checkArguments: 'never',
	checkFunctions: 'never',
	prefixes: {
		are: false, has: false, have: false, can: false, should: false, was: false, were: false, does: false, did: false, will: false, requires: false,
	},
};
const config = {
	plugins: {unicorn},
	rules: {
		'unicorn/consistent-boolean-name': ['error', namingOptions],
		'unicorn/no-useless-coercion': 'error',
		'unicorn/no-unnecessary-boolean-comparison': 'error',
		'unicorn/prefer-includes': 'error',
		'unicorn/prefer-string-starts-ends-with': 'error',
	},
};

for (const {name, code, output, value, rules} of [
	{
		name: 'local boolean renaming composes with coercion and comparison fixes',
		code: '/** @returns {boolean} */ function read(value) { return value; } function run() { const ready = Boolean(read(true)) === true; return ready; } run();',
		output: '/** @returns {boolean} */ function read(value) { return value; } function run() { const isReady = read(true); return isReady; } run();',
		value: true,
		rules: ['consistent-boolean-name', 'no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'documented strings compose with prefix matching and boolean cleanup',
		code: '/** @param {string} text */ function run(text) { return Boolean(String(text).indexOf("a") === 0) === true; } run("abc");',
		output: '/** @param {string} text */ function run(text) { return (text.startsWith("a")); } run("abc");',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison', 'prefer-string-starts-ends-with'],
	},
	{
		name: 'array identity searches compose with boolean local renaming',
		code: '/** @param {Array<RegExp>} values */ function run(values) { const ready = Boolean(values.indexOf(/a/) !== -1) === true; return ready; } run([/a/]);',
		output: '/** @param {Array<RegExp>} values */ function run(values) { const isReady = (values.includes(/a/)); return isReady; } run([/a/]);',
		value: false,
		rules: ['consistent-boolean-name', 'no-useless-coercion', 'no-unnecessary-boolean-comparison', 'prefer-includes'],
	},
	{
		name: 'typed array predicates preserve negation across overlapping fixes',
		code: '/** @param {Uint8Array} bytes */ function run(bytes) { return Boolean(bytes.every(value => value > 0)) === false; } run(new Uint8Array([1, 0]));',
		output: '/** @param {Uint8Array} bytes */ function run(bytes) { return !bytes.every(value => value > 0); } run(new Uint8Array([1, 0]));',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'documented RegExp flags retain primitive boolean results',
		code: '/** @param {RegExp} pattern */ function run(pattern) { return Boolean(pattern.global) === true; } run(/a/g);',
		output: '/** @param {RegExp} pattern */ function run(pattern) { return pattern.global; } run(/a/g);',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'Map membership evaluates a sequence key exactly once',
		code: [
			'const events = [];',
			'/** @param {Map<string, number>} map */ function run(map) { return Boolean(map.has((events.push("key"), "x"))) !== false; }',
			'JSON.stringify([run(new Map([["x", 1]])), events]);',
		].join('\n'),
		output: [
			'const events = [];',
			'/** @param {Map<string, number>} map */ function run(map) { return map.has((events.push("key"), "x")); }',
			'JSON.stringify([run(new Map([["x", 1]])), events]);',
		].join('\n'),
		value: '[true,["key"]]',
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'callable object return documentation survives repeated fix passes',
		code: '/** @param {{(): boolean; label: string}} read */ function run(read) { return Boolean(read()) === false; } run(() => false);',
		output: '/** @param {{(): boolean; label: string}} read */ function run(read) { return !read(); } run(() => false);',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'documented string callback results feed prefix matching',
		code: '/** @param {() => string} read */ function run(read) { return Boolean(String(read()).indexOf("a") === 0) === true; } run(() => "abc");',
		output: '/** @param {() => string} read */ function run(read) { return (read().startsWith("a")); } run(() => "abc");',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison', 'prefer-string-starts-ends-with'],
	},
	{
		name: 'homogeneous logical array receivers remain boolean after cleanup',
		code: '/** @param {Array<number>} values */ function run(values) { return Boolean((values || []).includes(2)) === true; } run([2]);',
		output: '/** @param {Array<number>} values */ function run(values) { return (values || []).includes(2); } run([2]);',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'sequence array receivers preserve effects under a negated predicate',
		code: [
			'const events = [];',
			'/** @param {Array<number>} values */ function run(values) { return Boolean((events.push("read"), values).some(value => value > 0)) === false; }',
			'JSON.stringify([run([-1]), events]);',
		].join('\n'),
		output: [
			'const events = [];',
			'/** @param {Array<number>} values */ function run(values) { return !(events.push("read"), values).some(value => value > 0); }',
			'JSON.stringify([run([-1]), events]);',
		].join('\n'),
		value: '[true,["read"]]',
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'assigned string receivers preserve the assignment under negation',
		code: '/** @param {string} text */ function run(text, cache) { return [Boolean((cache = text).startsWith("a")) === false, cache]; } JSON.stringify(run("xyz"));',
		output: '/** @param {string} text */ function run(text, cache) { return [!(cache = text).startsWith("a"), cache]; } JSON.stringify(run("xyz"));',
		value: '[true,"xyz"]',
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'unknown documented values retain necessary string coercion',
		code: '/** @type {unknown} */ const value = "abc"; Boolean(String(value).indexOf("a") === 0) === true;',
		output: '/** @type {unknown} */ const value = "abc"; (String(value).startsWith("a"));',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison', 'prefer-string-starts-ends-with'],
	},
	{
		name: 'nullable inputs retain coercion while boolean and prefix checks simplify',
		code: '/** @param {?string} text */ function run(text) { return Boolean(String(text).indexOf("n") === 0) === true; } run(null);',
		output: '/** @param {?string} text */ function run(text) { return (String(text).startsWith("n")); } run(null);',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison', 'prefer-string-starts-ends-with'],
	},
	{
		name: 'higher-order callbacks keep coercion of the returned function',
		code: '/** @param {() => (() => boolean)} read */ function run(read) { return Boolean(read()) === true; } run(() => () => false);',
		output: '/** @param {() => (() => boolean)} read */ function run(read) { return Boolean(read()); } run(() => () => false);',
		value: true,
		rules: ['no-unnecessary-boolean-comparison'],
	},
	{
		name: 'optional callback contracts keep coercion after comparison cleanup',
		code: '/** @param {() => boolean} [read] */ function run(read = () => true) { return Boolean(read()) === true; } run();',
		output: '/** @param {() => boolean} [read] */ function run(read = () => true) { return Boolean(read()); } run();',
		value: true,
		rules: ['no-unnecessary-boolean-comparison'],
	},
	{
		name: 'renaming a boolean local preserves shorthand return property names',
		code: '/** @returns {boolean} */ function read(value) { return value; } function run() { const ready = Boolean(read(true)) === true; return {ready}; } JSON.stringify(run());',
		output: '/** @returns {boolean} */ function read(value) { return value; } function run() { const isReady = read(true); return {ready: isReady}; } JSON.stringify(run());',
		value: '{"ready":true}',
		rules: ['consistent-boolean-name', 'no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'cached annotations are rebuilt after more than one documented local is renamed',
		code: [
			'function run(first, second) {',
			' /** @type {boolean} */ const ready = first;',
			' /** @type {boolean} */ const active = second;',
			' return Boolean(ready) === true && Boolean(active) === false;',
			'}',
			'run(true, false);',
		].join('\n'),
		output: [
			'function run(first, second) {',
			' /** @type {boolean} */ const isReady = first;',
			' /** @type {boolean} */ const isActive = second;',
			' return isReady && !isActive;',
			'}',
			'run(true, false);',
		].join('\n'),
		value: true,
		rules: ['consistent-boolean-name', 'no-useless-coercion', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'same-named string parameters keep independent certainty during repeated fixes',
		code: [
			'/** @param {string} text */ function first(text) { return String(text); }',
			'/** @param {unknown} text */ function second(text) { return String(text); }',
			'JSON.stringify([first("x"), second(null)]);',
		].join('\n'),
		output: [
			'/** @param {string} text */ function first(text) { return text; }',
			'/** @param {unknown} text */ function second(text) { return String(text); }',
			'JSON.stringify([first("x"), second(null)]);',
		].join('\n'),
		value: '["x","null"]',
		rules: ['no-useless-coercion'],
	},
]) {
	test(name, t => {
		const messages = linter.verify(code, config);
		t.assert.deepStrictEqual(new Set(messages.map(message => message.ruleId)), new Set(rules.map(rule => `unicorn/${rule}`)));
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(runInNewContext(code), value);
		t.assert.strictEqual(runInNewContext(result.output), value);
		t.assert.deepStrictEqual(linter.verifyAndFix(output, config), {fixed: false, output, messages: []});
	});
}

for (const {name, code, output = code, value, rules = [], remainingRules = rules} of [
	{
		name: 'nested comparison cleanup preserves comments that block coercion removal',
		code: '/** @param {string} text */ function run(text) { return Boolean(/* keep */ text.includes("x")) === true; } run("x");',
		output: '/** @param {string} text */ function run(text) { return Boolean(/* keep */ text.includes("x")); } run("x");',
		value: true,
		rules: ['no-useless-coercion', 'no-unnecessary-boolean-comparison'],
		remainingRules: ['no-useless-coercion'],
	},
	{
		name: 'comparison comments do not disappear when a documented call is boolean',
		code: '/** @returns {boolean} */ function read(value) { return value; } read(true) /* keep */ === true;',
		value: true,
		rules: ['no-unnecessary-boolean-comparison'],
	},
	{
		name: 'shadowed unannotated parameters do not inherit outer boolean contracts',
		code: '/** @param {boolean} flag */ function run(flag) { return (function (flag) { return JSON.stringify([Boolean(flag), flag === true]); })("yes"); } run(true);',
		value: '[true,false]',
	},
	{
		name: 'mixed string and array receivers preserve RegExp search and explicit conversions',
		code: '/** @param {string | Array<string>} value */ function run(value) { return JSON.stringify([String(value), Boolean(value.includes("a")), value.indexOf(/a/) !== -1]); } run("/a/");',
		value: '["/a/",true,true]',
	},
	{
		name: 'unresolved named JSDoc types remain conservative across consumers',
		code: '/** @param {CustomString} value */ function run(value) { return JSON.stringify([String(value), value.indexOf("a") === 0]); } run("abc");',
		value: '["abc",true]',
	},
]) {
	test(name, t => {
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, output !== code);
		t.assert.strictEqual(result.output, output);
		t.assert.strictEqual(result.messages.length, remainingRules.length);
		t.assert.deepStrictEqual(new Set(result.messages.map(message => message.ruleId)), new Set(remainingRules.map(rule => `unicorn/${rule}`)));
		t.assert.strictEqual(runInNewContext(code), value);
		t.assert.strictEqual(runInNewContext(result.output), value);
	});
}

for (const {name, code, suggested, output = suggested, value} of [
	{
		name: 'required parameter suggestions update documentation before comparison fixes',
		code: '/** @param {boolean} flag Description. */ function run(flag) { return flag === true; } run(true);',
		suggested: '/** @param {boolean} isFlag Description. */ function run(isFlag) { return isFlag === true; } run(true);',
		output: '/** @param {boolean} isFlag Description. */ function run(isFlag) { return isFlag; } run(true);',
		value: true,
	},
	{
		name: 'optional parameter suggestions retain the comparison needed for omitted values',
		code: '/** @arg {boolean} [flag=false] Description. */ function run(flag = false) { return flag === true; } run();',
		suggested: '/** @arg {boolean} [isFlag=false] Description. */ function run(isFlag = false) { return isFlag === true; } run();',
		value: false,
	},
	{
		name: 'optional type suffixes survive renaming without enabling boolean simplification',
		code: '/** @argument {boolean=} flag Description. */ function run(flag = false) { return flag === true; } run();',
		suggested: '/** @argument {boolean=} isFlag Description. */ function run(isFlag = false) { return isFlag === true; } run();',
		value: false,
	},
	{
		name: 'parameter suggestions preserve CRLF while downstream fixes use updated ranges',
		code: '/**\r\n * @param {boolean} flag Description.\r\n */\r\nfunction run(flag) { return flag === false; }\r\nrun(false);',
		suggested: '/**\r\n * @param {boolean} isFlag Description.\r\n */\r\nfunction run(isFlag) { return isFlag === false; }\r\nrun(false);',
		output: '/**\r\n * @param {boolean} isFlag Description.\r\n */\r\nfunction run(isFlag) { return !isFlag; }\r\nrun(false);',
		value: true,
	},
	{
		name: 'parameter renaming updates captured references while leaving shadowed names alone',
		code: '/** @param {boolean} flag */ function run(flag) { function shadow(flag) { return flag; } return (() => flag === true)() && shadow(true); } run(true);',
		suggested: '/** @param {boolean} isFlag */ function run(isFlag) { function shadow(flag) { return flag; } return (() => isFlag === true)() && shadow(true); } run(true);',
		output: '/** @param {boolean} isFlag */ function run(isFlag) { function shadow(flag) { return flag; } return (() => isFlag)() && shadow(true); } run(true);',
		value: true,
	},
	{
		name: 'parameter renaming preserves shorthand keys while coercion fixes remove wrappers',
		code: '/** @param {boolean} flag */ function run(flag) { return JSON.stringify({flag, result: Boolean(flag) === true}); } run(true);',
		suggested: '/** @param {boolean} isFlag */ function run(isFlag) { return JSON.stringify({flag: isFlag, result: Boolean(isFlag) === true}); } run(true);',
		output: '/** @param {boolean} isFlag */ function run(isFlag) { return JSON.stringify({flag: isFlag, result: isFlag}); } run(true);',
		value: '{"flag":true,"result":true}',
	},
]) {
	test(name, t => {
		const parameterConfig = {
			...config,
			rules: {...config.rules, 'unicorn/consistent-boolean-name': ['error', {...namingOptions, checkArguments: 'always'}]},
		};
		const messages = linter.verify(code, parameterConfig);
		const namingMessages = messages.filter(message => message.ruleId === 'unicorn/consistent-boolean-name');
		t.assert.strictEqual(namingMessages.length, 1);
		t.assert.strictEqual(namingMessages[0].suggestions.length, 1);
		const {range, text} = namingMessages[0].suggestions[0].fix;
		const renamed = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.strictEqual(renamed, suggested);
		const result = linter.verifyAndFix(renamed, parameterConfig);
		t.assert.strictEqual(result.output, output);
		t.assert.strictEqual(result.fixed, output !== suggested);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(runInNewContext(code), value);
		t.assert.strictEqual(runInNewContext(output), value);
		t.assert.deepStrictEqual(linter.verifyAndFix(output, parameterConfig), {fixed: false, output, messages: []});
	});
}

const booleanConsumerConfig = {
	plugins: {unicorn},
	rules: {
		'unicorn/no-useless-logical-operand': 'error',
		'unicorn/prefer-simplified-conditions': 'error',
		'unicorn/prefer-logical-operator-over-ternary': 'error',
		'unicorn/no-unnecessary-boolean-comparison': 'error',
		'unicorn/no-useless-coercion': 'error',
	},
};

for (const {name, annotation, parameters, expression, replacement = expression, argumentsList, values, rules = []} of [
	{
		name: 'logical identity and positive comparison cleanup preserve both boolean outcomes',
		annotation: '/** @param {boolean} flag */',
		parameters: 'flag',
		expression: '(flag && true) === true',
		replacement: '(flag)',
		argumentsList: ['false', 'true'],
		values: [false, true],
		rules: ['no-useless-logical-operand', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'logical identity removal composes with negative boolean comparisons',
		annotation: '/** @param {boolean} flag */',
		parameters: 'flag',
		expression: '(flag || false) === false',
		replacement: '!(flag)',
		argumentsList: ['false', 'true'],
		values: [true, false],
		rules: ['no-useless-logical-operand', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'false ternary branches become conjunctions before identity cleanup',
		annotation: '/** @param {boolean} flag\n * @param {boolean} other */',
		parameters: 'flag, other',
		expression: '(flag ? other : false) && true',
		replacement: '(flag && other)',
		argumentsList: ['false, true', 'true, false', 'true, true'],
		values: [false, false, true],
		rules: ['prefer-logical-operator-over-ternary', 'no-useless-logical-operand'],
	},
	{
		name: 'true ternary branches become disjunctions before identity cleanup',
		annotation: '/** @param {boolean} flag\n * @param {boolean} other */',
		parameters: 'flag, other',
		expression: '(flag ? true : other) || false',
		replacement: '(flag || other)',
		argumentsList: ['false, false', 'false, true', 'true, false'],
		values: [false, true, true],
		rules: ['prefer-logical-operator-over-ternary', 'no-useless-logical-operand'],
	},
	{
		name: 'De Morgan simplification keeps disjunction precedence during identity removal',
		annotation: '/** @param {boolean} first\n * @param {boolean} second */',
		parameters: 'first, second',
		expression: '!(!first && !second) && true',
		replacement: '(first || second)',
		argumentsList: ['false, false', 'false, true', 'true, false'],
		values: [false, true, true],
		rules: ['prefer-simplified-conditions', 'no-useless-logical-operand'],
	},
	{
		name: 'documented boolean absorption and comparison removal converge',
		annotation: '/** @param {boolean} first\n * @param {boolean} second */',
		parameters: 'first, second',
		expression: '(first || (first && second)) === true',
		replacement: '(first)',
		argumentsList: ['false, true', 'true, false'],
		values: [false, true],
		rules: ['prefer-simplified-conditions', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'factoring documented booleans does not lose grouping when identities disappear',
		annotation: '/** @param {boolean} first\n * @param {boolean} second\n * @param {boolean} third */',
		parameters: 'first, second, third',
		expression: '((first && second) || (first && third)) && true',
		replacement: '(first && (second || third))',
		argumentsList: ['false, true, true', 'true, false, false', 'true, false, true'],
		values: [false, false, true],
		rules: ['prefer-simplified-conditions', 'no-useless-logical-operand'],
	},
	{
		name: 'ternary conversion retains coercion of an unknown test before calling a predicate',
		annotation: '/** @param {unknown} condition\n * @param {() => boolean} read */',
		parameters: 'condition, read',
		expression: '(condition ? read() : false) === true',
		replacement: '(Boolean(condition) && read())',
		argumentsList: ['0, () => true', '"x", () => false', '"x", () => true'],
		values: [false, false, true],
		rules: ['prefer-logical-operator-over-ternary', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'documented RegExp results stay boolean through De Morgan and identity fixes',
		annotation: '/** @param {RegExp} pattern\n * @param {string} text\n * @param {boolean} flag */',
		parameters: 'pattern, text, flag',
		expression: '!(!pattern.test(text) && !flag) || false',
		replacement: 'pattern.test(text) || flag',
		argumentsList: ['/a/, "x", false', '/a/, "a", false', '/a/, "x", true'],
		values: [false, true, true],
		rules: ['prefer-simplified-conditions', 'no-useless-logical-operand'],
	},
	{
		name: 'coercion removal remains safe after logical and comparison cleanup',
		annotation: '/** @param {boolean} flag */',
		parameters: 'flag',
		expression: 'Boolean(flag && true) === true',
		replacement: '(flag)',
		argumentsList: ['false', 'true'],
		values: [false, true],
		rules: ['no-useless-coercion', 'no-useless-logical-operand', 'no-unnecessary-boolean-comparison'],
	},
	{
		name: 'partially known De Morgan operands retain the necessary truthiness coercion',
		annotation: '/** @param {string | boolean} flag\n * @param {boolean} other */',
		parameters: 'flag, other',
		expression: '!(!flag && !other)',
		replacement: '!!flag || other',
		argumentsList: ['"", false', '"x", false', 'false, true'],
		values: [false, true, true],
		rules: ['prefer-simplified-conditions'],
	},
	{
		name: 'optional boolean identity operands preserve false instead of returning undefined',
		annotation: '/** @param {boolean} [flag] */',
		parameters: 'flag',
		expression: 'flag || false',
		argumentsList: ['', 'false', 'true'],
		values: [false, false, true],
	},
	{
		name: 'mixed primitive conjunctions preserve booleans rather than returning truthy strings',
		annotation: '/** @param {boolean | string} flag */',
		parameters: 'flag',
		expression: 'flag && true',
		argumentsList: ['""', '"x"', 'false'],
		values: ['', true, false],
	},
	{
		name: 'two uncertain De Morgan operands keep a primitive boolean result',
		annotation: '/** @param {boolean | string} first\n * @param {boolean | string} second */',
		parameters: 'first, second',
		expression: '!(!first && !second)',
		argumentsList: ['"x", false', '"", true', '"", false'],
		values: [true, true, false],
	},
	{
		name: 'higher-order callback results do not escape a truthy conjunction',
		annotation: '/** @param {() => (() => boolean)} read */',
		parameters: 'read',
		expression: 'read() && true',
		argumentsList: ['() => () => false', '() => () => true'],
		values: [true, true],
	},
	{
		name: 'nullable callback returns keep false as their fallback result',
		annotation: '/** @param {() => ?string} read */',
		parameters: 'read',
		expression: 'read() || false',
		argumentsList: ['() => null', '() => ""', '() => "x"'],
		values: [false, false, 'x'],
	},
	{
		name: 'an unknown ternary branch keeps nonboolean result types explicit',
		annotation: '/** @param {boolean} flag\n * @param {unknown} other */',
		parameters: 'flag, other',
		expression: 'flag ? true : other',
		argumentsList: ['false, ""', 'false, "x"', 'true, null'],
		values: ['', 'x', true],
	},
	{
		name: 'optional predicate calls retain a fallback for absent callbacks',
		annotation: '/** @param {() => boolean} [read] */',
		parameters: 'read',
		expression: 'read?.() || false',
		argumentsList: ['', '() => false', '() => true'],
		values: [false, false, true],
	},
]) {
	test(name, t => {
		const prefix = `${annotation}\nfunction run(${parameters}) { return `;
		const calls = argumentsList.map(argumentsText => `run(${argumentsText})`).join(', ');
		const suffix = `; }\nJSON.stringify([${calls}].map(value => [typeof value, value]));`;
		const code = prefix + expression + suffix;
		const output = prefix + replacement + suffix;
		const messages = linter.verify(code, booleanConsumerConfig);
		t.assert.deepStrictEqual(new Set(messages.map(message => message.ruleId)), new Set(rules.map(rule => `unicorn/${rule}`)));
		const result = linter.verifyAndFix(code, booleanConsumerConfig);
		t.assert.strictEqual(result.fixed, expression !== replacement);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
		const expected = JSON.stringify(values.map(value => [typeof value, value]));
		t.assert.strictEqual(runInNewContext(code), expected);
		t.assert.strictEqual(runInNewContext(result.output), expected);
		t.assert.deepStrictEqual(linter.verifyAndFix(output, booleanConsumerConfig), {fixed: false, output, messages: []});
	});
}
