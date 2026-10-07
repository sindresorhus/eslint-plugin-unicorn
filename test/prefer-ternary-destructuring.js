import nodeTest from 'node:test';
import vm from 'node:vm';
import outdent from 'outdent';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-ternary');

const errors = [{messageId: 'prefer-ternary'}];
const onlySingleLineOptions = ['only-single-line'];

// Destructuring assignments
test({
	valid: [
		...[
			['[a, b]', '[a, c]'],
			['[a, b]', '[b, a]'],
			['[a = 1]', '[a = 2]'],
			['[a, ...rest]', '[a, ...other]'],
			['[a]', '{a}'],
			['{a, b}', '{b, a}'],
			['{key: a}', '{other: a}'],
			['{a = 1}', '{a = 2}'],
			['{[key]: a}', '{[other]: a}'],
		].map(([consequent, alternate]) => `if (test) { (${consequent} = first); } else { (${alternate} = second); }`),
		// Identical tokens do not imply identical behavior inside statement bodies.
		...[
			['[value = () => { return\n1; }]', '[value = () => { return 1; }]'],
			['{value = function () { return\n1; }}', '{value = function () { return 1; }}'],
			['{nested: [value = () => { return\n1; }]}', '{nested: [value = () => { return 1; }]}'],
			['{[(() => { return\n1; })()]: value}', '{[(() => { return 1; })()]: value}'],
		].flatMap(([first, second]) => [
			`if (test) { (${first} = a); } else { (${second} = b); }`,
			`if (test) { (${second} = a); } else { (${first} = b); }`,
		]),
		...[
			'[value = class {}]',
			'[value = [\nfirst,\nsecond\n]]',
			'{value = {\nkey: first\n}}',
		].map(pattern => `if (test) { (${pattern} = first); } else { (${pattern} = second); }`),
		'if (test) { [a] = first ? second : third; } else { [a] = other; }',
		'if (test ? first : second) { [a] = first; } else { [a] = second; }',
		'if (test) { [a] = first; } else { [a] = format({\nvalue: second,\n}); }',
		'if (test) { [a] = items.map(item => { return item; }); } else { [a] = second; }',
		'let [a] = first; if (test) { [a] = second; }',
		{
			code: 'if (test) { [a,\nb] = first; } else { [a, b] = second; }',
			options: onlySingleLineOptions,
		},
		{
			code: 'if (test) { [a] = format(\nfirst\n); } else { [a] = second; }',
			options: onlySingleLineOptions,
		},
	],
	invalid: [
		{
			code: outdent`
				let r, g, b;
				if (Y > 1) {
					[r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));
				} else {
					[r, g, b] = RGB;
				}
			`,
			output: 'let r, g, b;\n[r, g, b] = Y > 1 ? RGB.map((c) => (c > 0 ? c / 255 : 0)) : RGB;',
			errors,
		},
		...[
			'[a, b]',
			'[a, {b}]',
			'[a = fallback(), ...rest]',
			'[a = () => fallback()]',
			'[object.value, object[key]]',
			'[a, , b]',
			'[]',
			'{a, b}',
			'{key: a, nested: {b}}',
			'{a = fallback(), ...rest}',
			'{[getKey()]: object.value}',
			'{}',
		].map(pattern => ({
			code: `if (test) { (${pattern} = first); } else { (${pattern} = second); }`,
			output: pattern.startsWith('{') ? `(${pattern} = test ? first : second);` : `${pattern} = test ? first : second;`,
			errors,
		})),
		{
			code: 'if (test) { [ a, b ] = first; } else { [a,b] = second; }',
			output: '[ a, b ] = test ? first : second;',
			errors,
		},
		{
			code: 'if (test) { ({ a, b } = first); } else { ({a,b} = second); }',
			output: '({ a, b } = test ? first : second);',
			errors,
		},
		{
			code: 'if (test) { [a,\nb] = first; } else { [a, b] = second; }',
			output: '[a,\nb] = test ? first : second;',
			errors,
		},
		{
			code: 'if (test) {\r\n  [a, b] = first;\r\n} else {\r\n  [a, b] = second;\r\n}',
			output: '[a, b] = test ? first : second;',
			errors,
		},
		{
			code: 'if (test) { [a, b] = first; } else { [a, b] = second; }',
			output: '[a, b] = test ? first : second;',
			options: onlySingleLineOptions,
			errors,
		},
		{
			code: 'run()\nif (test) { [a] = first; } else { [a] = second; }',
			output: 'run()\n;[a] = test ? first : second;',
			errors,
		},
		{
			code: 'run()\nif (test) { ({a} = first); } else { ({a} = second); }',
			output: 'run()\n;({a} = test ? first : second);',
			errors,
		},
		{
			code: 'function foo() { if (test) { return ({a} = first); } return ({a} = second); }',
			output: 'function foo() { return {a} = test ? first : second; }',
			errors,
		},
		{
			code: 'if (test) { result = ({a} = first); } else { result = ({a} = second); }',
			output: 'result = {a} = test ? first : second;',
			errors,
		},
		{
			code: 'if (test) { [a] = object[key] = first; } else { [a] = object[key] = second; }',
			output: '[a] = test ? (object[key] = first) : (object[key] = second);',
			errors,
		},
		{
			code: 'if (test) { ({a} = object[key] = first); } else { ({a} = object[key] = second); }',
			output: '({a} = test ? (object[key] = first) : (object[key] = second));',
			errors,
		},
		{
			code: 'if (test) { [a] = first; /* eslint-disable no-alert */ } else { [a] = second; }',
			output: null,
			errors,
		},
		...[
			'if (test) { [a /* comment */] = first; } else { [a] = second; }',
			'if (test) { ({a} = first); } else { ({a /* comment */} = second); }',
		].map(code => ({
			code,
			output: null,
			errors: [{messageId: 'prefer-ternary', suggestions: []}],
		})),
		...[
			['[value!]', '[value!] = test ? (first as number[]) : second;'],
			['[(object as Value).value]', '[(object as Value).value] = test ? (first as number[]) : second;'],
			['{value: object.value!}', '({value: object.value!} = test ? (first as number[]) : second);'],
		].map(([pattern, output]) => ({
			code: `if (test) { (${pattern} = (first as number[])); } else { (${pattern} = second); }`,
			output,
			languageOptions: {parser: parsers.typescript},
			errors,
		})),
		...[parsers.vue, parsers.svelte].map(parser => ({
			code: '<script>if (test) { ({a} = first); } else { ({a} = second); }</script>',
			output: '<script>({a} = test ? first : second);</script>',
			languageOptions: {parser},
			errors,
		})),
	],
});

nodeTest('closes the iterator when a destructuring default throws', t => {
	const code = 'let value; if (condition()) { [value = getDefault()] = getValue("first"); } else { [value = getDefault()] = getValue("second"); }';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn},
		rules: {'unicorn/prefer-ternary': 'error'},
	});
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);

	for (const condition of [true, false]) {
		for (const source of [code, result.output]) {
			const calls = [];
			const error = new Error('default failed');
			t.assert.throws(() => vm.runInNewContext(source, {
				condition() {
					calls.push('condition');
					return condition;
				},
				getValue(branch) {
					calls.push(branch);
					return {
						* [Symbol.iterator]() {
							try {
								calls.push('next');
								yield;
							} finally {
								calls.push('close');
							}
						},
					};
				},
				getDefault() {
					calls.push('default');
					throw error;
				},
			}), thrown => thrown === error);
			t.assert.deepStrictEqual(calls, ['condition', condition ? 'first' : 'second', 'next', 'default', 'close']);
		}
	}
});

nodeTest('preserves destructuring evaluation order', t => {
	const code = 'let value; if (condition()) { ({[getKey()]: value = getDefault()} = getValue("first")); } else { ({[getKey()]: value = getDefault()} = getValue("second")); } value;';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn},
		rules: {'unicorn/prefer-ternary': 'error'},
	});
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);

	for (const condition of [true, false]) {
		for (const value of [undefined, 1]) {
			for (const source of [code, result.output]) {
				const calls = [];
				const output = vm.runInNewContext(source, {
					condition() {
						calls.push('condition');
						return condition;
					},
					getValue(branch) {
						calls.push(branch);
						return {value};
					},
					getKey() {
						calls.push('key');
						return 'value';
					},
					getDefault() {
						calls.push('default');
						return 2;
					},
				});
				t.assert.strictEqual(output, value ?? 2);
				t.assert.deepStrictEqual(calls, ['condition', condition ? 'first' : 'second', 'key', ...(value === undefined ? ['default'] : [])]);
			}
		}
	}
});

nodeTest('preserves array destructuring evaluation order and iterator closing', t => {
	const code = 'if (condition()) { [getTarget()[getKey()] = getDefault()] = getValue("first"); } else { [getTarget()[getKey()] = getDefault()] = getValue("second"); } target.value;';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn},
		rules: {'unicorn/prefer-ternary': 'error'},
	});
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);

	for (const condition of [true, false]) {
		for (const value of [undefined, 1]) {
			for (const source of [code, result.output]) {
				const calls = [];
				const target = {};
				const output = vm.runInNewContext(source, {
					target,
					condition() {
						calls.push('condition');
						return condition;
					},
					getValue(branch) {
						calls.push(branch);
						return {
							* [Symbol.iterator]() {
								try {
									calls.push('next');
									yield value;
									calls.push('exhausted');
								} finally {
									calls.push('close');
								}
							},
						};
					},
					getTarget() {
						calls.push('target');
						return target;
					},
					getKey() {
						calls.push('key');
						return 'value';
					},
					getDefault() {
						calls.push('default');
						return 2;
					},
				});
				t.assert.strictEqual(output, value ?? 2);
				t.assert.deepStrictEqual(calls, ['condition', condition ? 'first' : 'second', 'target', 'key', 'next', ...(value === undefined ? ['default'] : []), 'close']);
			}
		}
	}
});

nodeTest('preserves nested assignment targets after evaluating the condition', t => {
	for (const pattern of ['[value]', '{value}']) {
		const code = outdent`
			let key = "before", value;
			const target = {};
			function condition() {
				key = "after";
				return test;
			}
			if (condition()) {
				(${pattern} = target[key] = first);
			} else {
				(${pattern} = target[key] = second);
			}
			JSON.stringify([value, target]);
		`;
		const linter = new Linter();
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn},
			rules: {'unicorn/prefer-ternary': 'error'},
		});
		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);

		for (const condition of [true, false]) {
			const first = pattern.startsWith('[') ? [1] : {value: 1};
			const second = pattern.startsWith('[') ? [2] : {value: 2};
			for (const source of [code, result.output]) {
				const output = vm.runInNewContext(source, {test: condition, first, second});
				t.assert.strictEqual(output, JSON.stringify([condition ? 1 : 2, {after: condition ? first : second}]));
			}
		}
	}
});
