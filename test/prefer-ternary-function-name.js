import test from 'node:test';
import vm from 'node:vm';
import outdent from 'outdent';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta, 'prefer-ternary');
const config = {
	plugins: {unicorn},
	rules: {'unicorn/prefer-ternary': 'error'},
};

for (const [first, second] of [
	['() => 1', 'async () => 2'],
	['() => 1', 'other'],
	['other', 'async () => 2'],
]) {
	for (const prefix of ['', 'return ', 'result = ']) {
		test(`preserves inferred names for ${first} and ${second} in ${prefix || 'standalone assignments'}`, t => {
			const code = outdent`
				const other = () => 3;
				let handler, result;
				function run() {
					if (selected) {
						${prefix}(handler = (${first}));
					} else {
						${prefix}(handler = (${second}));
					}
				}
				run();
				handler.name;
			`;
			const linter = new Linter();
			const fixed = linter.verifyAndFix(code, config);
			t.assert.deepStrictEqual(fixed.messages, []);

			for (const selected of [true, false]) {
				const expected = (selected ? first : second) === 'other' ? 'other' : 'handler';
				for (const source of [code, fixed.output]) {
					t.assert.strictEqual(vm.runInNewContext(source, {selected}), expected);
				}
			}

			t.assert.strictEqual(fixed.fixed, Boolean(prefix));
			if (!prefix) {
				t.assert.strictEqual(fixed.output, code);
			}
		});
	}

	test(`preserves inferred names in declarations initialized with ${first} and reassigned to ${second}`, t => {
		const code = `const other = () => 3; let handler = (${first}); if (selected) { handler = (${second}); } handler.name;`;
		const linter = new Linter();
		const messages = linter.verify(code, config);
		const fix = messages[0]?.suggestions?.[0]?.fix;
		const output = fix ? code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]) : code;

		for (const selected of [true, false]) {
			const expected = (selected ? second : first) === 'other' ? 'other' : 'handler';
			for (const source of [code, output]) {
				t.assert.strictEqual(vm.runInNewContext(source, {selected}), expected);
			}
		}

		t.assert.deepStrictEqual(messages, []);
	});
}

for (const [name, code, expected] of [
	['returned arrows', 'function run() { if (selected) { return () => 1; } else { return async () => 2; } } run().name;', ''],
	['object callbacks', 'let object; if (selected) { object = {handler: () => 1}; } else { object = {handler: async () => 2}; } object.handler.name;', 'handler'],
	['array destructuring defaults', 'let handler; if (selected) { [handler = () => 1] = []; } else { [handler = () => 1] = [undefined]; } handler.name;', 'handler'],
	['object destructuring defaults', 'let handler; if (selected) { ({handler = () => 1} = {}); } else { ({handler = () => 1} = {handler: undefined}); } handler.name;', 'handler'],
]) {
	test(`still combines ${name} while preserving function names`, t => {
		const linter = new Linter();
		const fixed = linter.verifyAndFix(code, config);
		t.assert.deepStrictEqual(fixed.messages, []);
		t.assert.strictEqual(fixed.fixed, true);
		for (const selected of [true, false]) {
			for (const source of [code, fixed.output]) {
				t.assert.strictEqual(vm.runInNewContext(source, {selected}), expected);
			}
		}
	});
}

testRule({
	valid: [
		...[
			'(() => 1) as Handler',
			'<Handler>(() => 1)',
			'(() => 1) satisfies Handler',
			'(() => 1)!',
		].flatMap(expression => [
			`if (selected) { handler! = ${expression}; } else { handler! = other; }`,
			`let handler = ${expression}; if (selected) { handler = other; }`,
			`let handler = other; if (selected) { handler = ${expression}; }`,
		]).map(code => ({code, languageOptions: {parser: parsers.typescript}})),
		{
			code: 'if (selected) { handler = () => 1; } else { handler = other; }',
			options: ['only-single-line'],
		},
		{
			code: 'let handler = other; if (selected) { handler = async () => 1; }',
			options: ['only-single-line'],
		},
	],
	invalid: [],
});
