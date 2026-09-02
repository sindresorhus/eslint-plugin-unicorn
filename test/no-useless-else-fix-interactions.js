import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';

const config = {
	languageOptions: {ecmaVersion: 'latest'},
	plugins: {unicorn: plugin},
	rules: {
		'unicorn/no-useless-continue': 'error',
		'unicorn/no-useless-else': 'error',
	},
};

const fixCode = code => {
	const linter = new Linter();
	return linter.verifyAndFix(code, config).output;
};

test('preserves a `continue` made meaningful by removing `else`', t => {
	const code = outdent`
		function deleteThings() {
			for (const thing of things) {
				if (dryRun) {
					console.log(thing);
					continue;
				} else {
					deleteThing(thing);
				}
			}
		}
	`;

	const linter = new Linter();
	const messages = linter.verify(code, config);
	t.deepEqual(messages.map(({ruleId}) => ruleId), [
		'unicorn/no-useless-continue',
		'unicorn/no-useless-else',
	]);

	t.is(fixCode(code), outdent`
		function deleteThings() {
			for (const thing of things) {
				if (dryRun) {
					console.log(thing);
					continue;
				}
				deleteThing(thing);
			}
		}
	`);
});

test('preserves a nested `continue` while fixing nested `else` branches', t => {
	const code = outdent`
		for (const item of items) {
			if (skipItem) {
				if (retryItem) {
					continue;
				} else {
					throw new Error();
				}
			} else {
				processItem(item);
			}
		}
	`;

	t.is(fixCode(code), outdent`
		for (const item of items) {
			if (skipItem) {
				if (retryItem) {
					continue;
				}
				throw new Error();
			}
			processItem(item);
		}
	`);
});

test('preserves a `continue` when flattening an `else if` chain', t => {
	const code = outdent`
		for (const item of items) {
			if (skipItem) {
				continue;
			} else if (shouldProcessItem) {
				process(item);
			}
		}
	`;

	t.is(fixCode(code), outdent`
		for (const item of items) {
			if (skipItem) {
				continue;
			}
			if (shouldProcessItem) {
				process(item);
			}
		}
	`);
});
