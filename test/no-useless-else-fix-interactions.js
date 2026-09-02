import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';

const fixCode = (code, rules) => {
	const linter = new Linter();
	return linter.verifyAndFix(code, {
		languageOptions: {ecmaVersion: 'latest'},
		plugins: {unicorn: plugin},
		rules,
	}).output;
};

const continueRules = {
	'unicorn/no-useless-continue': 'error',
	'unicorn/no-useless-else': 'error',
};

test('does not combine `continue` and `else` fixes', t => {
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

	t.is(fixCode(code, continueRules), outdent`
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

test('does not combine nested control-flow fixes', t => {
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

	t.is(fixCode(code, continueRules), outdent`
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

test('does not combine fixes for an `else if` chain', t => {
	const code = outdent`
		for (const item of items) {
			if (skipItem) {
				continue;
			} else if (processItem) {
				process(item);
			}
		}
	`;

	t.is(fixCode(code, continueRules), outdent`
		for (const item of items) {
			if (skipItem) {
				continue;
			}
			if (processItem) {
				process(item);
			}
		}
	`);
});
