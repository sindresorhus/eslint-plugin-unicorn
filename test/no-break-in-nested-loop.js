import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest.snapshot({
	valid: [
		outdent`
			for (const item of items) {
				if (item.done) {
					break;
				}
			}
		`,
		{
			code: outdent`
				for (const item of items) {
					if (!item.visible) {
						continue;
					}
				}
			`,
			options: [{checkContinue: true}],
		},
		'for (const group of groups) { for (const item of group) { if (!item.isValid) { continue; } validate(item); save(item); } }',
		{
			code: 'for (const item of items) { switch (item.type) { case 1: continue; } process(item); }',
			options: [{checkContinue: false}],
		},
		outdent`
			for (const item of items) {
				for (const child of item.children) {
					check(child);
				}
			}
		`,
		outdent`
			outer: for (const item of items) {
				for (const child of item.children) {
					break outer;
				}
			}
		`,
		{
			code: outdent`
				outer: for (const item of items) {
					for (const child of item.children) {
						continue outer;
					}
				}
			`,
			options: [{checkContinue: true}],
		},
		outdent`
			for (const item of items) {
				inner: for (const child of item.children) {
					break inner;
				}
			}
		`,
		outdent`
			label: {
				for (const item of items) {
					switch (item.type) {
						case 'child':
							break label;
					}
				}
			}
		`,
		{
			code: outdent`
				outer: for (const item of items) {
					switch (item.type) {
						case 'child':
							continue outer;
					}
				}
			`,
			options: [{checkContinue: true}],
		},
		outdent`
			switch (value) {
				case 1:
					break;
			}
		`,
		outdent`
			switch (value) {
				case 1:
					for (const item of items) {
						break;
					}
			}
		`,
		outdent`
			switch (value) {
				case 1:
					switch (otherValue) {
						case 2:
							break;
					}
			}
		`,
		outdent`
			function processItem(item) {
				for (const child of item.children) {
					break;
				}
			}

			for (const item of items) {
				processItem(item);
			}
		`,
		{
			code: outdent`
				for (const item of items) {
					function processItem() {
						for (const child of item.children) {
							if (child.done) {
								break;
							}

							continue;
						}
					}

					processItem();
				}
			`,
			options: [{checkContinue: true}],
		},
	],
	invalid: [
		{
			code: outdent`
				for (const item of items) {
					for (const child of item.children) {
						break;
					}
				}
			`,
			options: [{checkContinue: false}],
		},
		{
			code: outdent`
				for (const item of items) {
					while (item.children.pop()) {
						continue;
					}
				}
			`,
			options: [{checkContinue: true}],
		},
		outdent`
			for (const item of items) {
				switch (item.type) {
					case 'child':
						break;
				}
			}
		`,
		{
			code: outdent`
				for (const item of items) {
					switch (item.type) {
						case 'child':
							continue;
					}
				}
			`,
			options: [{checkContinue: true}],
		},
		{
			code: outdent`
				for (const item of items) {
					for (const child of item.children) {
						switch (child.type) {
							case 'child':
								continue;
						}
					}
				}
			`,
			options: [{checkContinue: true}],
		},
		{
			code: outdent`
				for (const item of items) {
					switch (item.type) {
						case 'child':
							while (item.pending) {
								continue;
							}
					}
				}
			`,
			options: [{checkContinue: true}],
		},
		{
			code: outdent`
				for (let index = 0; index < items.length; index++) {
					for (const child of items[index].children) {
						break;
					}
				}
			`,
			options: [{checkContinue: true}],
		},
		{
			code: outdent`
				for (const key in items) {
					do {
						continue;
					} while (items[key].pending);
				}
			`,
			options: [{checkContinue: true}],
		},
	],
});

test('rules coexist in the recommended config', t => {
	const linter = new Linter();
	const {recommended} = unicorn.configs;
	t.is(recommended.rules['unicorn/no-break-in-nested-loop'], 'error');
	t.is(recommended.rules['unicorn/prefer-continue'], 'error');

	const code = outdent`
		for (const group of groups) {
			for (const item of group) {
				if (item.isValid) {
					validate(item);
					save(item);
				}
			}
		}
	`;
	const result = linter.verifyAndFix(code, recommended);
	const expectedOutput = outdent`
		for (const group of groups) {
			for (const item of group) {
				if (!item.isValid) {
					continue;
				}

				validate(item);
				save(item);
			}
		}
	`;

	t.true(result.fixed);
	t.is(result.output, expectedOutput);
	t.deepEqual(result.messages, []);
});
