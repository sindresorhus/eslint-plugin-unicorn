import vm from 'node:vm';
import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';

const config = {
	plugins: {unicorn: plugin},
	rules: {
		'unicorn/no-useless-else': 'error',
		'unicorn/no-negated-condition': 'error',
		'unicorn/no-useless-continue': 'error',
		'no-useless-return': 'error',
		'unicorn/prefer-early-return': ['error', {checkShortBodies: true}],
		'unicorn/prefer-continue': ['error', {checkShortBodies: true}],
	},
};

for (const [rule, exit, opening] of [
	['prefer-early-return', 'return;', 'function foo() {'],
	['prefer-continue', 'continue;', 'for (const item of items) {'],
]) {
	for (const hasElse of [false, true]) {
		test(`${rule}: short body fixes converge with related rules (${hasElse ? 'else' : 'following body'})`, t => {
			const body = hasElse ? '} else {\n\t\twork();\n\t}' : '}\n\twork();';
			const code = `${opening}\n\tif (!condition) {\n\t\t${exit}\n\t${body}\n}`;
			const expected = `${opening}\n\tif (condition) {\n\t\twork();\n\t}\n}`;
			const linter = new Linter();
			const result = linter.verifyAndFix(code, config);
			t.true(result.fixed);
			t.is(result.output, expected);
			t.deepEqual(result.messages, []);
			t.false(linter.verifyAndFix(result.output, config).fixed);
		});
	}

	test(`${rule}: preserves larger-body behavior when checking short bodies`, t => {
		const code = `${opening}\n\tif (condition) {\n\t\twork();\n\t\tfinish();\n\t}\n}`;
		const linter = new Linter();
		const result = linter.verifyAndFix(code, config);
		t.true(result.fixed);
		t.true(result.output.includes(exit));
		t.deepEqual(result.messages, []);
		t.false(linter.verifyAndFix(result.output, config).fixed);
	});
}

test('short-body wrapping preserves function and loop behavior', t => {
	for (const code of [
		outdent`
			function run(enabled, log) {
				if (!enabled) {
					return;
				}
				log.push('work');
			}
		`,
		outdent`
			function run(enabled, log) {
				if (!enabled) {
					return;
				} else {
					log.push('work');
				}
			}
		`,
		outdent`
			function run(enabled, log) {
				for (const item of [false, enabled, true]) {
					if (!item) {
						continue;
					}
					log.push(item);
				}
			}
		`,
		outdent`
			function run(enabled, log) {
				for (const item of [false, enabled, true]) {
					if (!item) {
						continue;
					} else {
						log.push(item);
					}
				}
			}
		`,
	]) {
		const linter = new Linter();
		const result = linter.verifyAndFix(code, config);
		t.true(result.fixed);
		t.deepEqual(result.messages, []);
		for (const enabled of [false, true]) {
			const execution = `const log = []; const result = run(${enabled}, log); JSON.stringify({log, result});`;
			t.is(vm.runInNewContext(`${result.output}\n${execution}`), vm.runInNewContext(`${code}\n${execution}`));
		}
	}
});
