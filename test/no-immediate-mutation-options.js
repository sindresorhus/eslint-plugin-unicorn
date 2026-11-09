import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';

test('respects `checkCollections` across autofix passes and configurations', t => {
	const code = outdent`
		var map;
		map = new Map();
		map.set(1, 2);
		const array = [];
		array.push(3);
	`;
	const checkedOutput = 'var map = new Map([[1, 2]]);\nconst array = [ 3];';
	const uncheckedOutput = 'var map = new Map();\nmap.set(1, 2);\nconst array = [ 3];';
	const linter = new Linter();

	for (const [options, output] of [
		[[{checkCollections: false}], uncheckedOutput],
		[[{checkCollections: true}], checkedOutput],
		[[{checkCollections: false}], uncheckedOutput],
		[[], checkedOutput],
		[[{}], checkedOutput],
	]) {
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {
				'unicorn/no-immediate-mutation': ['error', ...options],
			},
		});

		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
	}
});
