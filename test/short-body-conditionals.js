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

	test(`${rule}: preserves local CRLF line endings`, t => {
		const code = `const prefix = true;\n${opening}\r\n\tif (!condition) {\r\n\t\t${exit}\r\n\t}\r\n\twork();\r\n}`;
		const expected = `const prefix = true;\n${opening}\r\n\tif (condition) {\r\n\t\twork();\r\n\t}\r\n}`;
		const linter = new Linter();
		const result = linter.verifyAndFix(code, config);
		t.is(result.output, expected);
	});

	test(`${rule}: uses the enclosing body line ending when the guard and tail share a line`, t => {
		const code = `${opening}\r\n\tif (!condition) ${exit} work();\r\n}`;
		const expected = `${opening}\r\n\tif (condition) {\r\n\t\twork();\r\n\t}\r\n}`;
		const linter = new Linter();
		const result = linter.verifyAndFix(code, config);
		t.is(result.output, expected);
	});

	for (const linebreak of ['\r\n', '\r']) {
		test(`${rule}: preserves surrounding ${JSON.stringify(linebreak)} line endings for a one-line match`, t => {
			const code = `const prefix = true;${linebreak}${opening} if (!condition) ${exit} work(); }${linebreak}`;
			const expected = `const prefix = true;${linebreak}${opening} if (condition) {${linebreak}\twork();${linebreak}} }${linebreak}`;
			const linter = new Linter();
			const result = linter.verifyAndFix(code, config);
			t.is(result.output, expected);
		});
	}
}

test('short-body wrapping ignores line breaks inside condition tokens when choosing the structural line ending', t => {
	const code = 'function foo() {\r\n\tif (!tag`first\nsecond`) {\r\n\t\treturn;\r\n\t}\r\n\twork();\r\n}\r\n';
	const expected = 'function foo() {\r\n\tif (tag`first\nsecond`) {\r\n\t\twork();\r\n\t}\r\n}\r\n';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, config);
	t.is(result.output, expected);
});

test('short-body wrapping uses the line ending between an unbraced guard and else', t => {
	const code = 'function foo() { if (!condition) return;\r\nelse work(); }';
	const expected = 'function foo() { if (condition) {\r\n\twork();\r\n} }';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, config);
	t.is(result.output, expected);
});

test('short-body wrapping ignores line breaks inside unrelated tokens', t => {
	const code = 'prefix;\r\nfunction foo() { if (!condition) return; work(); } const later = `first\nsecond`;';
	const expected = 'prefix;\r\nfunction foo() { if (condition) {\r\n\twork();\r\n} } const later = `first\nsecond`;';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, config);
	t.is(result.output, expected);
});

test('short-body wrapping uses the line ending before an Allman-style body', t => {
	const code = 'function foo()\r\n{ if (!condition) return; work(); }';
	const expected = 'function foo()\r\n{ if (condition) {\r\n\twork();\r\n} }';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, config);
	t.is(result.output, expected);
});

test('short-body wrapping uses a structural line ending inside an enclosing expression', t => {
	const code = 'const result = consume(function foo() { if (!condition) return; work(); },\r\n\targument);';
	const expected = 'const result = consume(function foo() { if (condition) {\r\n\twork();\r\n} },\r\n\targument);';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, config);
	t.is(result.output, expected);
});

test('short-body wrapping preserves a trailing file line ending', t => {
	const code = 'function foo() { if (!condition) return; work(); }\r\n';
	const expected = 'function foo() { if (condition) {\r\n\twork();\r\n} }\r\n';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, config);
	t.is(result.output, expected);
});

test('short-body wrapping preserves mixed line endings inside the moved body', t => {
	const code = 'function foo() {\r\n\tif (!condition) {\r\n\t\treturn;\r\n\t}\r\n\twork(\n\t\tvalue,\r\n\t);\r\n}';
	const expected = 'function foo() {\r\n\tif (condition) {\r\n\t\twork(\n\t\t\tvalue,\r\n\t\t);\r\n\t}\r\n}';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, config);
	t.is(result.output, expected);
});

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
