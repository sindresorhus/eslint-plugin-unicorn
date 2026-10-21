import {atob, btoa} from 'node:buffer';
import {stripTypeScriptTypes} from 'node:module';
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

test({
	valid: [
		'String(new Date());',
		'String(Date?.());',
		'String(globalThis.Date());',
		'String(other.Date());',
		'/** @type {unknown} */ const text = Date(); String(text);',
	],
	invalid: [
		['String(Date())', 'Date()'],
		['String(Date(value))', 'Date(value)'],
		['String(Date(...values))', 'Date(...values)'],
		['Number(Date(value).length)', 'Date(value).length'],
		['Boolean(Date(value).includes("GMT"))', 'Date(value).includes("GMT")'],
	].map(([expression, replacement]) => ({
		code: `/** @param {unknown} value */ function run(value, ...values) { return ${expression}; }`,
		output: `/** @param {unknown} value */ function run(value, ...values) { return ${replacement}; }`,
		errors: [{messageId: 'no-useless-coercion'}],
	})),
});

test({
	valid: [],
	invalid: [{
		code: 'const text = Date(); const alias = text; String(alias.trim());',
		output: 'const text = Date(); const alias = text; alias.trim();',
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{filename: 'file.ts', code: 'const text: number = Date(); String(text);'}],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(value: unknown) { return String(Date(value).trim()); }',
			output: 'function run(value: unknown) { return Date(value).trim(); }',
			errors: [{messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('Date call coercion removal retains argument evaluation without coercing ignored values', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const [expression, expected] of [
		['Date()', ['string', []]],
		['Date({[Symbol.toPrimitive]() { events.push("coerce"); throw new Error("ignored"); }})', ['string', []]],
		['Date(events.push("first"), ...(function* () { events.push("spread"); yield 1; })())', ['string', ['first', 'spread']]],
		['Date((() => { events.push("throw"); throw new RangeError("expected"); })())', ['RangeError', ['throw']]],
	]) {
		const prefix = 'const events = []; let kind; try { const result = ';
		const suffix = '; kind = typeof result; } catch (error) { kind = error.name; } JSON.stringify([kind, events]);';
		const code = `${prefix}String(${expression})${suffix}`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, `${prefix}${expression}${suffix}`);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(code), JSON.stringify(expected));
		t.assert.strictEqual(runInNewContext(output), JSON.stringify(expected));
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

for (const method of ['toString', 'valueOf']) {
	test({
		valid: [
			`function run(text) { return String(text.${method}(ignored)); }`,
			...['?string', 'string | number', `{${method}: () => number}`].map(type =>
				`/** @param {${type}} text */ function run(text) { return String(text.${method}(ignored)); }`,
			),
			`/** @param {string} [text] */ function run(text) { return String(text.${method}(ignored)); }`,
			`/** @param {string} text */ function run(text) { return String(text?.${method}(ignored)); }`,
			`/** @param {string} text */ function run(text) { return String(text.${method}?.(ignored)); }`,
			`/** @param {string} text */ function run(text) { return String(text["${method}"](ignored)); }`,
		],
		invalid: [
			[`String(text.${method}(ignored).trim())`, `text.${method}(ignored).trim()`],
			[`Boolean(text.${method}(ignored).includes("x"))`, `text.${method}(ignored).includes("x")`],
			[`Number(text.${method}(ignored).length)`, `text.${method}(ignored).length`],
		].map(([expression, replacement]) => ({
			code: `/** @param {string} text */ function run(text) { return ${expression}; }`,
			output: `/** @param {string} text */ function run(text) { return ${replacement}; }`,
			errors: [{messageId: 'no-useless-coercion'}],
		})),
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			filename: 'file.ts',
			code: '/** @param {string} text */ function run(text: {valueOf(): number}) { return String(text.valueOf()); }',
		}],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(text: string) { return [String(text.toString(ignored)), String(text.valueOf())]; }',
			output: 'function run(text: string) { return [text.toString(ignored), text.valueOf()]; }',
			errors: [{messageId: 'no-useless-coercion'}, {messageId: 'no-useless-coercion'}],
		}],
	});
}

test({
	valid: [
		'/** @param {Date} value */ function run(value) { return String(value.valueOf()); }',
		{code: 'function run(text: String) { return String(text.valueOf()); }', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [{
		code: '/** @param {Date} value */ function run(value) { return [String(value.toString()), Number(value.valueOf())]; }',
		output: '/** @param {Date} value */ function run(value) { return [value.toString(), value.valueOf()]; }',
		errors: [{messageId: 'no-useless-coercion'}, {messageId: 'no-useless-coercion'}],
	}],
});

nodeTest('nested string toString coercions converge while preserving existing reports', t => {
	const code = '/** @param {string} text */ function run(text) { return String(text.toString()); }';
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	t.assert.deepStrictEqual(linter.verify(code, config).map(({messageId}) => messageId), ['no-useless-coercion', 'no-useless-coercion']);
	t.assert.strictEqual(linter.verifyAndFix(code, config).output, '/** @param {string} text */ function run(text) { return text; }');
});

nodeTest('primitive string method coercion removal retains ignored argument effects and errors', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const method of ['toString', 'valueOf']) {
		for (const [text, argument, expected] of [
			['', 'events.push("argument")', ['', ['argument']]],
			['🦄\u0000é', 'events.push("argument")', ['🦄\u0000é', ['argument']]],
			['text', '(() => { events.push("throw"); throw new RangeError("expected"); })()', ['RangeError', ['throw']]],
		]) {
			const prefix = 'const events = []; /** @param {string} text */ function run(text) { try { return ';
			const expression = `text.${method}(${argument})`;
			const suffix = `; } catch (error) { return error.name; } } JSON.stringify([run(${JSON.stringify(text)}), events]);`;
			const code = `${prefix}String(${expression})${suffix}`;
			const {output, fixed, messages} = linter.verifyAndFix(code, config);
			t.assert.strictEqual(output, `${prefix}${expression}${suffix}`);
			t.assert.strictEqual(fixed, true);
			t.assert.deepStrictEqual(messages, []);
			t.assert.strictEqual(runInNewContext(code), JSON.stringify(expected));
			t.assert.strictEqual(runInNewContext(output), JSON.stringify(expected));
			t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
		}
	}
});

for (const method of ['push', 'unshift']) {
	test({
		valid: [
			`function run(values) { return Number(values.${method}(item)); }`,
			...['unknown', '?number[]', 'number[] | Set<number>', `{${method}: () => string}`, 'Uint8Array', 'BigInt64Array'].map(type =>
				`/** @param {${type}} values */ function run(values) { return Number(values.${method}(item)); }`,
			),
			`/** @param {number[]} [values] */ function run(values) { return Number(values.${method}(item)); }`,
			`/** @param {number[]} values */ function run(values) { return Number(values?.${method}(item)); }`,
			`/** @param {number[]} values */ function run(values) { return Number(values.${method}?.(item)); }`,
			`/** @param {number[]} values */ function run(values) { return Number(values["${method}"](item)); }`,
		],
		invalid: [
			[`Number(values.${method}())`, `values.${method}()`],
			[`+values.${method}(first, second)`, `values.${method}(first, second)`],
			[`Number(values.${method}(...items))`, `values.${method}(...items)`],
		].map(([expression, replacement]) => ({
			code: `/** @param {number[]} values */ function run(values) { return ${expression}; }`,
			output: `/** @param {number[]} values */ function run(values) { return ${replacement}; }`,
			errors: [{messageId: 'no-useless-coercion'}],
		})),
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			filename: 'file.ts',
			code: '/** @param {number[]} values */ function run(values: {push(): string}) { return Number(values.push()); }',
		}],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(values: number[], items: number[]) { return [Number(values.push(...items)), +values.unshift()]; }',
			output: 'function run(values: number[], items: number[]) { return [values.push(...items), values.unshift()]; }',
			errors: [{messageId: 'no-useless-coercion'}, {messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('array length mutator coercion removal preserves mutation arguments spread and errors', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const [initial, expression, expected] of [
		['[1]', 'values.push(item(2), ...(function* () { events.push("spread"); yield 3; })())', [3, [1, 2, 3], [2, 'spread']]],
		['[1]', 'values.unshift(item(2), item(3))', [3, [2, 3, 1], [2, 3]]],
		['Object.freeze([1])', 'values.push(item(2))', ['TypeError', [1], [2]]],
		['Object.freeze([1])', 'values.unshift(item(2))', ['TypeError', [1], [2]]],
	]) {
		const setup = `const events = []; const values = ${initial}; function item(value) { events.push(value); return value; } `;
		const prefix = `${setup}/** @param {number[]} values */ function run(values) { return `;
		const suffix = '; } let result; try { result = run(values); } catch (error) { result = error.name; } JSON.stringify([result, values, events]);';
		const code = `${prefix}Number(${expression})${suffix}`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, `${prefix}${expression}${suffix}`);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(code), JSON.stringify(expected));
		t.assert.strictEqual(runInNewContext(output), JSON.stringify(expected));
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

test({
	valid: [
		'function run(value) { return Number(reader.keys(value).length); }',
		'function run(value) { return String(Object?.values(value).join(",")); }',
		'function run(value) { return Number(Object.entries?.(value).length); }',
		'function run(value) { return Number(Object["getOwnPropertyNames"](value).length); }',
		'function run(value) { return Number(Object.getOwnPropertyDescriptor(value, "length").length); }',
		'/** @type {unknown} */ const values = Object.values(source); String(values.join(","));',
	],
	invalid: [
		['String', 'Object.keys(value).join(",")'],
		['Boolean', 'Object.values(value).includes(expected)'],
		['Number', 'Object.entries(value).length'],
		['Boolean', 'Object.getOwnPropertyNames(value).includes("length")'],
		['Number', 'Object.getOwnPropertySymbols(value).length'],
	].map(([coercion, expression]) => ({
		code: `/** @param {unknown} value */ function run(value) { return ${coercion}(${expression}); }`,
		output: `/** @param {unknown} value */ function run(value) { return ${expression}; }`,
		errors: [{messageId: 'no-useless-coercion'}],
	})),
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			filename: 'file.ts',
			code: 'const values: {length: string} = Object.values(source); Number(values.length);',
		}],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(value: object) { const keys = Object.keys(value); return String(keys.toReversed().join(",")); }',
			output: 'function run(value: object) { const keys = Object.keys(value); return keys.toReversed().join(","); }',
			errors: [{messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('Object array factory coercion removal preserves getter effects and errors', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const [method, getter, expected] of [
		['values', 'return 42;', '42'],
		['entries', 'return 42;', 'answer,42'],
		['values', 'throw new RangeError("expected");', 'RangeError'],
		['entries', 'throw new RangeError("expected");', 'RangeError'],
	]) {
		const prefix = `let reads = 0; const value = {get answer() { reads++; ${getter} }}; function run() { try { return `;
		const expression = `Object.${method}(value).join(",")`;
		const suffix = '; } catch (error) { return error.name; } } JSON.stringify([run(), reads]);';
		const code = `${prefix}String(${expression})${suffix}`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, `${prefix}${expression}${suffix}`);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(code), JSON.stringify([expected, 1]));
		t.assert.strictEqual(runInNewContext(output), JSON.stringify([expected, 1]));
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

test({
	valid: [
		'function run(value) { return Number(value.setTime(0)); }',
		'/** @param {{setTime: () => string}} value */ function run(value) { return Number(value.setTime(0)); }',
		'/** @param {?Date} value */ function run(value) { return Number(value.setTime(0)); }',
		'/** @param {Date} [value] */ function run(value) { return Number(value.setTime(0)); }',
		'/** @param {Date} value */ function run(value) { return Number(value?.setTime(0)); }',
		'/** @param {Date} value */ function run(value) { return Number(value.setTime?.(0)); }',
		'/** @param {Date} value */ function run(value) { return Number(value["setTime"](0)); }',
	],
	invalid: [
		'setDate(1)',
		'setFullYear(2000, 0, 1)',
		'setHours(12, 30, 15, 10)',
		'setMilliseconds(10)',
		'setMinutes(30, 15, 10)',
		'setMonth(0, 1)',
		'setSeconds(15, 10)',
		'setTime(0)',
		'setUTCDate(1)',
		'setUTCFullYear(2000, 0, 1)',
		'setUTCHours(12, 30, 15, 10)',
		'setUTCMilliseconds(10)',
		'setUTCMinutes(30, 15, 10)',
		'setUTCMonth(0, 1)',
		'setUTCSeconds(15, 10)',
	].map(methodCall => ({
		code: `/** @param {Date} value */ function run(value) { return Number(value.${methodCall}); }`,
		output: `/** @param {Date} value */ function run(value) { return value.${methodCall}; }`,
		errors: [{messageId: 'no-useless-coercion'}],
	})),
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			filename: 'file.ts',
			code: '/** @param {Date} value */ function run(value: {setTime(time: number): string}) { return Number(value.setTime(0)); }',
		}],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(value: Date) { return +value.setUTCFullYear(2000, 0, 1); }',
			output: 'function run(value: Date) { return value.setUTCFullYear(2000, 0, 1); }',
			errors: [{messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('Date setter coercion removal preserves mutation conversions invalid dates and errors', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const [initial, expression, expected] of [
		['0', 'value.setTime({valueOf() { reads++; return 1000; }})', ['number', '1000', 1000, 1]],
		['NaN', 'value.setUTCFullYear(2000, 0, 1)', ['number', '946684800000', 946_684_800_000, 0]],
		['0', 'value.setUTCDate(undefined)', ['number', 'NaN', NaN, 0]],
		['0', 'value.setTime({valueOf() { reads++; throw new RangeError("expected"); }})', ['string', 'RangeError', 0, 1]],
		['0', 'value.setTime(1n)', ['string', 'TypeError', 0, 0]],
	]) {
		const prefix = `let reads = 0; const date = new Date(${initial}); /** @param {Date} value */ function run(value) { return `;
		const suffix = '; } let result; try { result = run(date); } catch (error) { result = error.name; } JSON.stringify([typeof result, String(result), date.getTime(), reads]);';
		const code = `${prefix}Number(${expression})${suffix}`;
		const expectedOutput = `${prefix}${expression}${suffix}`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(code), JSON.stringify(expected));
		t.assert.strictEqual(runInNewContext(output), JSON.stringify(expected));
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

for (const methodCall of ['copyWithin(1, 0, 2)', 'fill(3, 1)', 'reverse()', 'sort((left, right) => left - right)']) {
	test({
		valid: [],
		invalid: [
			['Boolean', `values.${methodCall}.includes(3)`],
			['String', `values.${methodCall}.join(",")`],
			['Number', `values.${methodCall}.length`],
		].map(([coercion, expression]) => ({
			code: `/** @param {Array<number>} values */ function run(values) { return ${coercion}(${expression}); }`,
			output: `/** @param {Array<number>} values */ function run(values) { return ${expression}; }`,
			errors: [{messageId: 'no-useless-coercion'}],
		})),
	});
}

test({
	valid: [
		'/** @param {unknown} values */ function run(values) { return String(values.reverse().join(",")); }',
		'/** @param {{sort: () => string}} values */ function run(values) { return Number(values.sort().length); }',
		'/** @param {?Array<number>} values */ function run(values) { return Boolean(values.fill(3).includes(3)); }',
		'/** @param {Uint8Array} values */ function run(values) { return String(values.reverse().join(",")); }',
		'/** @param {BigInt64Array} values */ function run(values) { return Number(values.sort().length); }',
		'/** @param {Array<number>} values */ function run(values) { return Number(values?.copyWithin(1, 0).length); }',
		'/** @param {Array<number>} values */ function run(values) { return String(values["fill"](3).join(",")); }',
	],
	invalid: [],
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(values: number[]) { return [Number(values.copyWithin(1, 0).length), String(values.sort((left, right) => left - right).join(","))]; }',
			output: 'function run(values: number[]) { return [values.copyWithin(1, 0).length, values.sort((left, right) => left - right).join(",")]; }',
			errors: [{messageId: 'no-useless-coercion'}, {messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('array mutator result coercion removal preserves mutation and argument effects', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const [initial, expression, result, mutated] of [
		[[1, 2, 3], 'values.copyWithin({valueOf() { reads++; return 1; }}, 0, 2).join(",")', '1,1,2', [1, 1, 2]],
		[[3, 2, 1], 'values.fill(4, {valueOf() { reads++; return 1; }}).join(",")', '3,4,4', [3, 4, 4]],
		[[3, 1, 2], 'values.reverse().join(",")', '2,1,3', [2, 1, 3]],
		[[2, 1], 'values.sort((left, right) => { reads++; return left - right; }).join(",")', '1,2', [1, 2]],
	]) {
		const prefix = `let reads = 0; const values = ${JSON.stringify(initial)}; /** @param {Array<number>} values */ function run(values) { return `;
		const suffix = '; } const result = run(values); JSON.stringify([result, values, reads]);';
		const code = `${prefix}String(${expression})${suffix}`;
		const expectedOutput = `${prefix}${expression}${suffix}`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		const original = runInNewContext(code);
		t.assert.deepStrictEqual(JSON.parse(original).slice(0, 2), [result, mutated]);
		t.assert.strictEqual(runInNewContext(output), original);
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

test({
	valid: [
		'/** @param value - {boolean} Description. */ function run(value) { return Boolean(value); }',
		'/** @param {unknown} value {boolean} Description. */ function run(value) { return Boolean(value); }',
		'/** @param value.field {string} Description. */ function run(value) { return String(value); }',
		'/** @param value {string}\n * @arg value {number} */ function run(value) { return String(value); }',
		'/** @param [value] {boolean} Description. */ function run(value) { return Boolean(value); }',
		'/** @param value Description with {string}. */ function run(value) { return String(value); }',
	],
	invalid: [
		[
			'/** @param value {boolean} Description. */ function run(value) { return Boolean(value); }',
			'/** @param value {boolean} Description. */ function run(value) { return value; }',
		],
		[
			'/** @arg text {string} Description. */ function run(text) { return String(text); }',
			'/** @arg text {string} Description. */ function run(text) { return text; }',
		],
		[
			'/** @argument values {Array<number>} Description. */ function run(values) { return Number(values.length); }',
			'/** @argument values {Array<number>} Description. */ function run(values) { return values.length; }',
		],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'no-useless-coercion'}]})),
});

test({
	valid: [
		'/** @typex{boolean} */ const value = source; Boolean(value);',
		'/** @returnsValue{string} */ function read() { return source; } String(read());',
		'/** @parametric{string} value */ function run(value) { return String(value); }',
		'/** @param{string value */ function run(value) { return String(value); }',
		'/** @type{} */ const value = source; Boolean(value);',
		'/** @param{string}value.path */ function run(value) { return String(value); }',
	],
	invalid: [
		[
			'/** @type{boolean} */ const value = source; Boolean(value);',
			'/** @type{boolean} */ const value = source; value;',
		],
		[
			'/** @returns{boolean} */ function read() { return source; } Boolean(read());',
			'/** @returns{boolean} */ function read() { return source; } read();',
		],
		[
			'/** @param{string} value */ function run(value) { return String(value); }',
			'/** @param{string} value */ function run(value) { return value; }',
		],
		[
			'/** @param{Array<string>} values */ function run(values) { return String(values.join(",")); }',
			'/** @param{Array<string>} values */ function run(values) { return values.join(","); }',
		],
		[
			'/** @type{Array<number>} */ const values = source; Number(values.length);',
			'/** @type{Array<number>} */ const values = source; values.length;',
		],
		[
			'/** @return{string} */ const read = () => source; String(read());',
			'/** @return{string} */ const read = () => source; read();',
		],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'no-useless-coercion'}]})),
});

for (const [type, methodCall] of [
	['Array<number>', 'toReversed()'],
	['ReadonlyArray<number>', 'toSorted(compare)'],
	['[number, number]', 'toSpliced(0, 1, 3)'],
	['Array<number> | ReadonlyArray<number>', 'with(-1, 3)'],
]) {
	test({
		valid: [],
		invalid: [
			['Boolean', `values.${methodCall}.includes(3)`],
			['String', `values.${methodCall}.join(",")`],
			['Number', `values.${methodCall}.length`],
		].map(([coercion, expression]) => ({
			code: `/** @type {${type}} */ const values = source; ${coercion}(${expression});`,
			output: `/** @type {${type}} */ const values = source; ${expression};`,
			errors: [{messageId: 'no-useless-coercion'}],
		})),
	});
}

test({
	valid: [
		'/** @type {unknown} */ const values = source; String(values.toReversed().join(","));',
		'/** @type {{toSorted: () => string}} */ const values = source; Number(values.toSorted().length);',
		'/** @type {Uint8Array} */ const values = source; Number(values.toSorted().length);',
		'/** @type {BigInt64Array} */ const values = source; Boolean(values.with(0, 1n).includes(1n));',
		'/** @type {Array<number>} */ const values = source; Number(values?.toReversed().length);',
		'/** @type {Array<number>} */ const values = source; String(values["toSpliced"](0).join(","));',
	],
	invalid: [],
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(values: readonly string[]) { return [Number(values.toReversed().length), String(values.toSorted().join(","))]; }',
			output: 'function run(values: readonly string[]) { return [values.toReversed().length, values.toSorted().join(",")]; }',
			errors: [{messageId: 'no-useless-coercion'}, {messageId: 'no-useless-coercion'}],
		}],
	});
}

test({
	valid: [
		'/** @type {() => boolean} */ let read; read = () => "changed"; Boolean(read());',
		'/** @type {unknown} */ const flag = true; Number(flag ? 1 : "text");',
		'/** @type {(() => boolean) & (() => string)} */ const read = () => "yes"; Boolean(read());',
		{
			code: '/** @returns {string} */ let read: () => unknown = (): string => source; String(read());',
			languageOptions: {parser: parsers.typescript},
		},
		'/** @param {() => boolean} read */ function run(read) { read = () => 0; Boolean(read()); }',
		'/** @returns {?string} */ function text() { return source; } Boolean(text().includes("x"));',
	],
	invalid: [{
		code: '/** @param {string} text */ function run(text) { return String(text || ""); }',
		output: '/** @param {string} text */ function run(text) { return (text || ""); }',
		errors: [{messageId: 'no-useless-coercion'}],
	}, {
		code: '/** @type {unknown} */ const flag = true; Number(flag ? 1 : 2);',
		output: '/** @type {unknown} */ const flag = true; (flag ? 1 : 2);',
		errors: [{messageId: 'no-useless-coercion'}],
	}, {
		code: '/** @returns {string} */ function text() { return source; } Boolean(text().includes("x"));',
		output: '/** @returns {string} */ function text() { return source; } text().includes("x");',
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});

test({
	valid: [
		'/** @type {"left\n * right"} */ let text; String(text);',
		'/** @returns {"left\r\n * right"} */ function text() { return source; } String(text());',
	],
	invalid: [{
		code: '/** @type {\n * "left"\n * | "right"\n * } */ let text; String(text);',
		output: '/** @type {\n * "left"\n * | "right"\n * } */ let text; text;',
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {{atob: () => number}} value */ function run(value) { return String(value.atob()); }',
			'/** @param {{encodeURI: () => number}} value */ function run(value) { return String(value.encodeURI()); }',
			'/** @param {{f16round: () => string}} value */ function run(value) { return Number(value.f16round()); }',
			'/** @param {Date} value */ function run(value) { return Number(value.toJSON()); }',
			'/** @param {?Date} value */ function run(value) { return Number(value?.getTime()); }',
			'/** @param {{valueOf: () => string}} value */ function run(value) { return +value.valueOf(); }',
			'Number(Date());',
			'function run(value) { return Number(new Date(value)); }',
			'function run(value, other) { return Number(other.parse(value)); }',
			'/** @param {Date} value */ function run(value) { return String(value.toJSON()); }',
			'/** @param {Date} value */ function run(value) { return String(value?.toISOString()); }',
			'/** @param {?Date} value */ function run(value) { return String(value.toISOString()); }',
			'/** @param {{toISOString: () => number}} value */ function run(value) { return String(value.toISOString()); }',
			'/** @param {{size: string}} value */ function run(value) { return Number(value.size); }',
			'/** @param {?Set<number>} value */ function run(value) { return Number(value?.size); }',
			'/** @param {{length: string}} value */ function run(value) { return Number(value.length); }',
			'/** @param {{length: bigint}} value */ function run(value) { return +value.length; }',
			'/** @param {unknown} value */ function run(value) { return Number(value.length); }',
			'/** @returns {number | undefined} */ function count() { return source; } Number(count());',
			'/** @returns {number} */ async function count() { return source; } Number(count());',
			'/** @returns {number} */ function* count() { yield source; } +count();',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...['encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent', 'atob', 'btoa'].map(name => ({
				filename: 'file.ts',
				code: `/** @param {unknown} value */ function run(value) { return String(${name}(value)); }`,
				output: `/** @param {unknown} value */ function run(value) { return ${name}(value); }`,
				errors: [{messageId: 'no-useless-coercion'}],
			})),
			...[
				[
					'/** @param {unknown} value */ function run(value) { return Number(Math.f16round(value)); }',
					'/** @param {unknown} value */ function run(value) { return Math.f16round(value); }',
				],
				[
					'/** @param {unknown} value */ function run(value) { return +Math.f16round(value); }',
					'/** @param {unknown} value */ function run(value) { return Math.f16round(value); }',
				],
			].map(([code, output]) => ({
				code, output, filename: 'file.ts', errors: [{messageId: 'no-useless-coercion'}],
			})),
			...[
				[
					'/** @param {Date} value */ function run(value) { return Number(value.getTime()); }',
					'/** @param {Date} value */ function run(value) { return value.getTime(); }',
				],
				[
					'/** @param {Date} value */ function run(value) { return +value.valueOf(); }',
					'/** @param {Date} value */ function run(value) { return value.valueOf(); }',
				],
			].map(([code, output]) => ({
				code, output, filename: 'file.ts', errors: [{messageId: 'no-useless-coercion'}],
			})),
			...['Date.now()', 'Date.parse(value)', 'Date.UTC(value, 0)'].map(expression => ({
				filename: 'file.ts',
				code: `/** @param {string | number} value */ function run(value) { return Number(${expression}); }`,
				output: `/** @param {string | number} value */ function run(value) { return ${expression}; }`,
				errors: [{messageId: 'no-useless-coercion'}],
			})),
			...['toISOString', 'toUTCString', 'toDateString', 'toTimeString', 'toLocaleDateString', 'toLocaleTimeString', 'toString', 'toLocaleString'].map(method => ({
				filename: 'file.ts',
				code: `/** @param {Date} value */ function run(value) { return String(value.${method}()); }`,
				output: `/** @param {Date} value */ function run(value) { return value.${method}(); }`,
				errors: [{messageId: 'no-useless-coercion'}],
			})),
			...['Map<string, boolean>', 'ReadonlySet<bigint>'].map(type => ({
				filename: 'file.ts',
				code: `/** @param {${type}} values */ function run(values) { return Number(values.size); }`,
				output: `/** @param {${type}} values */ function run(values) { return values.size; }`,
				errors: [{messageId: 'no-useless-coercion'}],
			})),
			{
				filename: 'file.ts',
				code: '/** @returns {number} */ function count() { return source; } Number(count());',
				output: '/** @returns {number} */ function count() { return source; } count();',
				errors: [{messageId: 'no-useless-coercion'}],
			},
			{
				filename: 'file.ts',
				code: '/** @return {Number} */ const count = () => source; +count();',
				output: '/** @return {Number} */ const count = () => source; count();',
				errors: [{messageId: 'no-useless-coercion'}],
			},
		],
	});
}

nodeTest('base64 string coercion removal preserves binary data errors and argument conversions', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	const binary = String.fromCodePoint(0, 0xFF);
	for (const [name, argument, value, reads = 0] of [
		['btoa', JSON.stringify(binary), 'AP8='],
		['atob', '"AP8="', binary],
		['atob', String.raw`" \n AP8 \t"`, binary],
		['atob', '"%%%"', 'InvalidCharacterError'],
		['btoa', '"🦄"', 'InvalidCharacterError'],
		['atob', '', 'TypeError'],
		['atob', 'undefined', 'InvalidCharacterError'],
		['btoa', '', 'TypeError'],
		['btoa', 'undefined', 'dW5kZWZpbmVk'],
		['atob', '({toString() { reads++; return "AP8="; }})', binary, 1],
		['btoa', '({toString() { reads++; return "a"; }})', 'YQ==', 1],
	]) {
		const code = `let reads = 0; function run() { try { return String(${name}(${argument})); } catch (error) { return error.name; } } JSON.stringify([run(), reads]);`;
		const expectedOutput = `let reads = 0; function run() { try { return ${name}(${argument}); } catch (error) { return error.name; } } JSON.stringify([run(), reads]);`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(code, {atob, btoa}), JSON.stringify([value, reads]));
		t.assert.strictEqual(runInNewContext(output, {atob, btoa}), JSON.stringify([value, reads]));
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

test({
	valid: ['Number(class {}.length);', 'Number(class { static length = "5"; }.length);'],
	invalid: [
		...[
			['Number(function () {}.length);', '(function () {}.length);'],
			['Number(async function () {}.length);', '(async function () {}.length);'],
			['use()\nNumber(function () {}.length);', 'use()\n;(function () {}.length);'],
		].map(([code, output]) => ({code, output, errors: 1})),
	],
});

nodeTest('nonnumeric object lengths still require numeric coercion', t => {
	const code = 'Number({length: "5"}.length);';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	});
	t.assert.strictEqual(runInNewContext(code), 5);
	t.assert.strictEqual(runInNewContext(output), 5);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

nodeTest('documented string lengths retain coercion and numeric results', t => {
	for (const expression of ['Number(value.length)', '+value.length', 'Number(~value.length)']) {
		const code = `/** @param {{length: string}} value */ function run(value) { return ${expression}; } const result = run({length: "5"}); JSON.stringify([typeof result, result]);`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
			rules: {'unicorn/no-useless-coercion': 'error'},
		});
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), JSON.stringify(['number', expression.includes('~') ? -6 : 5]));
	}
});

nodeTest('optional numeric parameters still require numeric coercion', t => {
	const code = 'function value(input?: number) { return Number(input); } Number.isNaN(value());';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	});
	t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(code)), true);
	t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(output)), true);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

nodeTest('an absent code point still requires numeric coercion', t => {
	const code = 'Number.isNaN(Number("".codePointAt(0)));';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	});
	t.assert.strictEqual(runInNewContext(code), true);
	t.assert.strictEqual(runInNewContext(output), true);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

test({
	valid: [
		'Number("".codePointAt(0));',
		'+"a".codePointAt(1);',
		...[
			'function getValue(value: string, index: number) { return Number(value.codePointAt(index)); }',
			'Number((value as string).codePointAt(index));',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [],
});

nodeTest('deleting a coerced value preserves the property and delete result', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};

	for (const [value, expression] of [
		['1', 'Number(object.value as number)'],
		['1', '+(object.value as number)'],
		['true', 'Boolean(object.value as boolean)'],
		['"x"', 'String(object.value as string)'],
		['1n', 'BigInt(object.value as bigint)'],
		['"x"', '(object.value as string) + ""'],
		['"x"', '"" + (object.value as string)'],
		['"x"', '(object.value as string).toString()'],
	]) {
		const code = `"use strict"; const object = {value: ${value}}; const result = delete (${expression}); JSON.stringify({result, exists: Object.hasOwn(object, "value")});`;
		const {fixed, output, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, false, code);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		const result = runInNewContext(stripTypeScriptTypes(output));
		t.assert.deepStrictEqual(JSON.parse(result), {result: true, exists: true});
	}

	const code = '"use strict"; const result = delete Number(Math.PI); result;';
	const {output, fixed, messages} = linter.verifyAndFix(code, config);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(runInNewContext(output), true);
	// Exposing the non-configurable reference would throw instead of returning true.
	t.assert.throws(() => runInNewContext('"use strict"; delete Math.PI;'), {name: 'TypeError'});
});

test({
	valid: [],
	invalid: [
		{code: 'const object = [1]; delete Number(object.length);', errors: [{messageId: 'no-useless-coercion'}]},
		{code: 'const object = [1]; delete +object.length;', errors: [{messageId: 'no-useless-coercion'}]},
		{code: 'delete Number(Math.PI);', errors: [{messageId: 'no-useless-coercion'}]},
		...[
			'const object = [1]; delete (Number(object.length) as number);',
			'const object = [1]; delete Number(object.length)!;',
			'const object = [1]; delete (Number(object.length) satisfies number);',
			'const object = [1]; delete (<number>Number(object.length));',
			'const object = [1]; delete Number(object.length satisfies number);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'no-useless-coercion'}]})),
	],
});

test.typescript({
	valid: [
		'declare const isJson: (value: unknown) => value is string; export const isValidJson = (value: unknown) => Boolean(isJson(value));',
		'declare function isJson(value: unknown): value is string; function isValidJson(value: unknown) { return Boolean(isJson(value)); }',
		'declare function isJson(value: unknown): value is string; const isValidJson = function (value: unknown) { return Boolean(isJson(value)); };',
		'declare function isJson(value: unknown): value is string; const isValidJson = (value: unknown) => { const result = Boolean(isJson(value)); return result; };',
		'const isString = (value: unknown) => Boolean(typeof value === "string");',
		'const isArray = (value: unknown) => Boolean(Array.isArray(value));',
		'const object = {isArray(value: unknown) { return Boolean(Array.isArray(value)); }};',
		'class Validator { isArray(value: unknown) { return Boolean(Array.isArray(value)); } }',
		'function outer(): unknown { return (value: unknown) => Boolean(Array.isArray(value)); }',
		// Conservatively preserve all boolean coercions in functions without return annotations.
		'const getFlag = () => Boolean(true);',
	],
	invalid: [
		[
			'declare function isJson(value: unknown): value is string; const isValidJson = (value: unknown): boolean => Boolean(isJson(value));',
			'declare function isJson(value: unknown): value is string; const isValidJson = (value: unknown): boolean => isJson(value);',
		],
		[
			'function isString(value: unknown): boolean { return Boolean(typeof value === "string"); }',
			'function isString(value: unknown): boolean { return (typeof value === "string"); }',
		],
		[
			'const object = {isArray(value: unknown): boolean { return Boolean(Array.isArray(value)); }};',
			'const object = {isArray(value: unknown): boolean { return Array.isArray(value); }};',
		],
		[
			'class Validator { isArray(value: unknown): boolean { return Boolean(Array.isArray(value)); } }',
			'class Validator { isArray(value: unknown): boolean { return Array.isArray(value); } }',
		],
		[
			'function outer() { return (value: unknown): boolean => Boolean(Array.isArray(value)); }',
			'function outer() { return (value: unknown): boolean => Array.isArray(value); }',
		],
		[
			'declare function isJson(value: unknown): value is string; declare const value: unknown; Boolean(isJson(value));',
			'declare function isJson(value: unknown): value is string; declare const value: unknown; isJson(value);',
		],
		[
			'const stringify = (value: string) => String(value);',
			'const stringify = (value: string) => value;',
		],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'no-useless-coercion'}]})),
});

test({
	valid: [
		{code: 'function getFlag() { return Boolean(true); }', filename: 'file.ts'},
	],
	invalid: [
		{
			code: 'const isArray = value => Boolean(Array.isArray(value));',
			output: 'const isArray = value => Array.isArray(value);',
			errors: [{messageId: 'no-useless-coercion'}],
		},
	],
});

test({
	testerOptions: {
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
		},
	},
	valid: [
		'declare const isJson: (value: unknown) => value is string; export const isValidJson = (value: unknown) => Boolean(isJson(value));',
		'declare const validator: {isJson(value: unknown): value is string}; const isValidJson = (value: unknown) => Boolean(validator.isJson(value));',
	].map(code => ({code, filename: 'file.ts'})),
	invalid: [
		[
			'declare const validator: {isJson(value: unknown): value is string}; const isValidJson = (value: unknown): boolean => Boolean(validator.isJson(value));',
			'declare const validator: {isJson(value: unknown): value is string}; const isValidJson = (value: unknown): boolean => validator.isJson(value);',
		],
		[
			'declare const validator: {isJson(value: unknown): value is string}; declare const value: unknown; Boolean(validator.isJson(value));',
			'declare const validator: {isJson(value: unknown): value is string}; declare const value: unknown; validator.isJson(value);',
		],
	].map(([code, output]) => ({
		code,
		output,
		filename: 'file.ts',
		errors: [{messageId: 'no-useless-coercion'}],
	})),
});

test.snapshot({
	valid: [
		// Genuine conversions (argument type is unknown or different)
		'Boolean(1)',
		'Boolean(x)',
		'Boolean(null)',
		'Boolean(x ? 1 : 0)',
		'String(123)',
		'String(x)',
		'String(null)',
		'String([])',
		'Number("5")',
		'Number(x)',
		'Number(null)',
		'Number(bigintValue)',
		'Number(a - b)',
		'Number(a % b)',
		'const modes = new Set(["foo"]); modes.clear(); Number(modes.size ? value : "value");',
		'const modes = new Set(["foo"]); modes.clear(); +((modes.size && value) || "value");',
		'const modes = new Set(["foo"]); modes.clear(); Boolean(modes.size ? true : value);',
		'const modes = new Set(["foo"]); modes.clear(); String(modes.size ? "x" : value);',
		'const alias = condition; var condition = true; String(alias ? "x" : value);',
		'const modes = new Set(["foo"]); modes.clear(); BigInt(modes.size ? 1n : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); Boolean(object.value ? true : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); String(object.value ? "x" : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); BigInt(object.value ? 1n : value);',
		'Number(x?.length)',
		'Number(x.length)',
		'Number(~x.length)',
		'+x.length',
		'Number(/* keep */ x.length)',
		'Boolean(x ?? y)',
		'Boolean(x || false)',
		'Boolean(a && b)',
		'Boolean(x === y ? a : b)',
		'BigInt(5)',
		'BigInt(x)',
		'BigInt("5")',

		// Method return types are not tracked
		'String(x.repeat(3))',
		'String(x.at(0))',

		// `+` on a bigint throws at runtime, so it is never useless
		{code: 'declare const x: bigint; +x', languageOptions: {parser: parsers.typescript}},

		// Out of scope
		'Object({a: 1})',
		'Symbol(x)',
		'Array(x)',
		'new Boolean(true)',
		'new Number(42)',
		'globalThis.Boolean(true)',

		// Operator idioms we intentionally do not flag
		'~~x', // `~~` truncates, so it is never a no-op
		'~~5',
		'!!x', // Covered by ESLint's `no-extra-boolean-cast`
		'!!true',
		'-5', // Negation is not a coercion

		// Operator idioms on values that are not already the target type
		'x + \'\'',
		'5 + \'\'',
		'\'\' + 5',
		'x.toString()',
		'(5).toString()',
		'+x',
		'+\'5\'',
		'x + \'a\'', // Non-empty string is a real concatenation
		'x.toLocaleString()',
		'x[\'toString\']()',
		'x?.toString()',
		'x.toString(2)',

		// Wrong arity / shape
		'Boolean()',
		'Number()',
		'Number(1, 2)',
		'Number(...x)',
		'Boolean?.(true)',

		// Shadowed globals
		'const Boolean = () => {}; Boolean(true)',
		'function f(String) { return String(\'x\'); }',
		'function f(Number) { return Number(42); }',
		'import {String} from \'x\'; String(\'y\')',
	],
	invalid: [
		// Literals
		'Boolean(true)',
		'Boolean(false)',
		'String(\'hello\')',
		'Number(42)',
		'Number(0)',
		'BigInt(1n)',

		// Double coercion
		'Boolean(Boolean(x))',
		'String(String(x))',
		'Number(Number(x))',
		'Number(parseInt(x, 10))',
		'Number(Number.parseFloat(x))',
		'BigInt(BigInt(x))',

		// Already-typed expressions
		'Boolean(a === b)',
		'Boolean(!x)',
		'Boolean(!!x)',
		'Boolean(a > 0 && b > 0)',
		'Boolean(true || false)',
		'Boolean(x instanceof Foo)',
		'Boolean(x in obj)',
		'Boolean(delete obj.x)',
		'Boolean(a?.b === c)',
		'Number(String(x).length)',
		'Number(Math.PI)',
		'Number(Number.MAX_SAFE_INTEGER)',
		'Number(NaN)',
		'Number(x >>> 0)',
		'Number(~String(x).length)',
		'Number(+x)',
		'Number(x * 2)',
		'Number(x % 2)',
		'Number(x > 0 ? 1 : 2)',
		'String(`${x}`)', // eslint-disable-line no-template-curly-in-string
		'String(a + \'b\')',
		'String(typeof x)',
		'String(x ? \'a\' : \'b\')',
		'BigInt(1n + 2n)',
		'BigInt(2n ** 3n)',
		'BigInt(BigInt.asIntN(64, x))',
		'BigInt(x ? 1n : 2n)',

		// Unary `+` on a value already a number
		'+5',
		'+String(x).length',
		'+Number(x)',
		'+(x * 2)',
		'+ +x', // Nested: the inner `+x` is always a number, so the outer `+` is useless

		// Empty-string concatenation on a value already a string
		'\'a\' + \'\'',
		'\'\' + \'a\'',
		'\'\' + \'\'', // Both operands are empty strings
		'`${x}` + \'\'', // eslint-disable-line no-template-curly-in-string
		'(a + \'b\') + \'\'',
		'String(x) + \'\'',

		// `.toString()` on a value already a string
		'\'a\'.toString()',
		'`${x}`.toString()', // eslint-disable-line no-template-curly-in-string
		'(a + \'b\').toString()',
		'String(x).toString()',

		// Resolved variables
		'const flag = true; Boolean(flag)',
		'const name = \'unicorn\'; String(name)',
		'const text = \'x\'; text + \'\'',
		'const n = 5; +n',

		// Fix: parenthesization
		'String(a + \'b\').length',
		'Number(x * 2).toFixed(2)',
		'Boolean(x ? a > 0 : b < 0)',
		// Unary operator parent forces parentheses around a loosely-bound argument
		'!Boolean(a === b)',
		// Strong-precedence argument needs no parentheses, even in a tight position
		'-Number(String(x).length)',
		// Template literal binds tightly, so no parentheses before a member `.`
		'String(`foo`).length',
		// Decimal integer literal needs parentheses before a member `.`
		'Number(5).toFixed(2)',
		// Argument already parenthesized, do not double-wrap
		'Boolean((a === b))',
		'(Number(String(x).length))',
		// Sequence expression keeps its existing parentheses
		'Number((a, String(b).length))',
		// Object literal needs parentheses, otherwise `{` starts a block at statement position
		'Number({length: 1}.length)',

		// Fix: ASI
		outdent`
			foo
			Number(+bar)
		`,

		// Fix: comment inside (reported, not fixed)
		'Number(/* keep */ String(x).length)',
		'+/* keep */ String(x).length',
		'\'a\' /* keep */ + \'\'',
		'(/* keep */ \'a\').toString()',

		// TypeScript
		{code: 'Boolean(x as boolean)', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(x satisfies number)', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; String(x!)', languageOptions: {parser: parsers.typescript}},
		{code: 'const f = (x: number) => Number(x)', languageOptions: {parser: parsers.typescript}},
		{code: 'const f = (x: bigint) => BigInt(x)', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(<number>x)', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: number; Number(x!)', languageOptions: {parser: parsers.typescript}},
		{code: 'BigInt(x as bigint)', languageOptions: {parser: parsers.typescript}},
		// Cast expressions bind loosely, so they need parentheses in a tight position
		{code: 'String(x as string).length', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(x satisfies number).toFixed(2)', languageOptions: {parser: parsers.typescript}},

		// TypeScript: operator idioms on typed values
		{code: 'declare const x: number; +x', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; x + \'\'', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; x.toString()', languageOptions: {parser: parsers.typescript}},

		// Type information: a bigint literal type
		{
			code: 'declare const object: {value: 1n}; BigInt(object.value);',
			filename: 'file.ts',
			languageOptions: {
				parser: typescriptEslintParser,
				parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
			},
		},
	],
});

// A user object can have a `length` that is not a number
test({
	valid: [
		'const object = {length: "5"};\nconst a = Number(object.length);',
		'const object = {length: "abc"};\nconst a = +object.length;',
		'const object = {length: true};\nconst a = +object.length;',
		'Number({foo: 1}.length)',
		'const a = Number(foo.length);',
		'Number({length: "5"}.length)',
		'const object = {length: value}; Number(object.length);',
		'const object = {length: 5};\nconst a = Number(object.length);',
		'Number({length: 1, length: "5"}.length)',
		'+({length: 1, ...other}).length',
		...[
			'Number(({length: "5"} as {length: string}).length);',
			'const object = {"length": "5"} as const; +object!.length;',
			'const object = {length: "5"}; Number((object as {length: string}).length);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		{
			code: 'foo\nNumber({length: 1}.length)',
			output: 'foo\n;({length: 1}.length)',
			errors: 1,
		},
		{
			code: 'const size = Number(function () {}.length);',
			output: 'const size = function () {}.length;',
			errors: 1,
		},
		{
			code: 'export default Number(function () {}.length);',
			output: 'export default (function () {}.length);',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		['function get() { return Number({value: 1}.value); }', 'function get() { return {value: 1}.value; }'],
		['const get = () => Number({value: 1}.value);', 'const get = () => ({value: 1}.value);'],
		['const get = () => Number(function () {}.length);', 'const get = () => function () {}.length;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [{
		code: 'export default Number({value: 1}.value);',
		output: 'export default {value: 1}.value;',
		errors: 1,
	}],
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			['boolean', 'Boolean'],
			['string', 'String'],
			['number', 'Number'],
			['bigint', 'BigInt'],
		].map(([type, constructor]) => ({
			code: `/** @param {${type}} input */ function value(input?): ${type} { return ${constructor}(input); }`,
			filename: 'file.ts',
		})),
		invalid: [{
			filename: 'file.ts',
			code: '/** @param {boolean} input */ function value(input = false): boolean { return Boolean(input); }',
			output: '/** @param {boolean} input */ function value(input = false): boolean { return input; }',
			errors: [{messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('an omitted parameter documented as boolean still needs boolean coercion', t => {
	const code = '/** @param {boolean} input */ function value(input?): boolean { return Boolean(input); } value();';
	const {output, fixed, messages} = linter.verifyAndFix(code, {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	});
	t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(code)), false);
	t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(output)), false);
	t.assert.strictEqual(fixed, false);
	t.assert.deepStrictEqual(messages, []);
});

const nullableStringFallbackCases = [
	['/** @param {?string} value */ function run(value) { return String((value + 1) ?? ""); } run(null);', '1'],
	['/** @param {?string} value\n * @param {?string} fallback */ function run(value, fallback) { return String(value ?? fallback); } run(null, null);', 'null'],
	['/** @param {?string} value */ function run(value) { return String(value && "text"); } run(null);', 'null'],
];

nodeTest('nullable fallback coercions preserve the result type at runtime', t => {
	for (const [code, expected] of nullableStringFallbackCases) {
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
			rules: {'unicorn/no-useless-coercion': 'error'},
		});
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(output, code);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), expected);
	}
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			...nullableStringFallbackCases.map(([code]) => code),
			'/** @type {(() => string) | (() => number)} */ let read; String(read());',
			'/** @type {?(() => string)} */ let read; String(read());',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...[
				['(() => string) | (() => "text")', 'String'],
				['(() => number) & {label: string}', 'Number'],
				['(() => bigint) | (() => 1n)', 'BigInt'],
			].map(([type, constructor]) => ({
				filename: 'file.ts',
				code: `/** @type {${type}} */ let read; ${constructor}(read());`,
				output: `/** @type {${type}} */ let read; read();`,
				errors: [{messageId: 'no-useless-coercion'}],
			})),
			{
				filename: 'file.ts',
				code: '/** @type {(() => string[]) | (() => readonly string[])} */ let read; Boolean(read().some(predicate));',
				output: '/** @type {(() => string[]) | (() => readonly string[])} */ let read; read().some(predicate);',
				errors: [{messageId: 'no-useless-coercion'}],
			},
		],
	});
}

test({
	valid: [
		'/** @param {() => boolean} read */ function value(read = async () => true) { return Boolean(read()); }',
		'/** @param {() => string} read */ function value(read = function* () {}) { return String(read()); }',
		{
			code: '/** @param {() => string} read */ function value(read = (): boolean => true) { return String(read()); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '/** @param {() => boolean} read */ function value(read = (): string => "text"): boolean { return Boolean(read()); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [{
		code: '/** @param {() => string} read */ function value(read = () => "text") { return String(read()); }',
		output: '/** @param {() => string} read */ function value(read = () => "text") { return read(); }',
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});

for (const initializer of ['async () => true', 'function* () { return true; }']) {
	nodeTest(`a documented synchronous callback with default ${initializer} still needs coercion`, t => {
		const code = `/** @param {() => boolean} read */ function value(read = ${initializer}) { return Boolean(read()); } value();`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
			rules: {'unicorn/no-useless-coercion': 'error'},
		});
		t.assert.strictEqual(runInNewContext(code), true);
		t.assert.strictEqual(runInNewContext(output), true);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
	});
}

const assertedCallbackCoercions = [
	['boolean', 'Boolean', 'string', '"text"', true],
	['string', 'String', 'number', '1', '1'],
	['number', 'Number', 'string', '"1"', 1],
	['bigint', 'BigInt', 'number', '1', 1n],
].map(([type, constructor, native, value, expected]) => ({
	code: `/** @param {() => ${type}} read */ function run(read = (() => ${value}) as (() => ${native})): ${type} { return ${constructor}(read()); } run();`,
	expected,
}));

nodeTest('native assertions on default callbacks preserve scalar coercion results', t => {
	for (const {code, expected} of assertedCallbackCoercions) {
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			languageOptions: {parser: typescriptEslintParser},
			plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
			rules: {'unicorn/no-useless-coercion': 'error'},
		});
		t.assert.strictEqual(runInNewContext(stripTypeScriptTypes(output)), expected, code);
		t.assert.strictEqual(fixed, false, code);
		t.assert.strictEqual(output, code);
		t.assert.deepStrictEqual(messages, []);
	}
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
]) {
	test({
		testerOptions: {languageOptions},
		valid: assertedCallbackCoercions.map(({code}) => ({code, filename: 'file.ts'})),
		invalid: [],
	});
}

const nativeCallbackDefault = '/** @param {() => boolean} read */ function value(read = (): boolean => true): boolean { return Boolean(read()); }';
test({
	valid: [{code: nativeCallbackDefault, languageOptions: {parser: parsers.typescript}}],
	invalid: [{
		code: nativeCallbackDefault,
		filename: 'file.ts',
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
		},
		output: nativeCallbackDefault.replace('Boolean(read())', 'read()'),
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});
