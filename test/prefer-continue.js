import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			for (const item of items) {
				if (item.isActive) {
					process(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					process(item);
					save(item);
				}

				finish(item);
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					process(item);
					save(item);
				} else {
					skip(item);
				}
			}
		`,
		outdent`
			for (const item of items)
				if (item.isActive) {
					process(item);
					save(item);
				}
		`,
		outdent`
			for (const item of items) {
				if (!item.isActive) {
					continue;
				}

				process(item);
				save(item);
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					if (item.isReady) {
						process(item);
					}
				}
			}
		`,
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive);
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive) {
						;(event.target as HTMLInputElement).blur();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive) {
						process(item);
						save(item);
					}
				}
			`,
			options: [{maximumStatements: 2}],
		},
		outdent`
			function hide(childNodes) {
				for (const child of childNodes) {
					if (condition(child)) {
						child.remove();
						return;
					}
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					process(item);
					break;
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isInvalid) {
					process(item);
					throw new Error('Invalid item');
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					process(item);
					continue;
				}
			}
		`,
		{
			code: outdent`
				function run(items) {
					for (const item of items) {
						if (item.isActive) return;
					}
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive) break;
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				for (const item of items) {
					if (item.isInvalid) throw new Error('Invalid item');
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive) continue;
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive) {
						continue;
						;
					}
				}
			`,
			options: [{maximumStatements: 0}],
		},
	],
	invalid: [
		outdent`
			function run(items) {
				for (const item of items) {
					if (item.isActive) {
						if (item.isReady) {
							return;
						}

						process(item);
						save(item);
					}
				}
			}
		`,
		outdent`
			function run(items) {
				for (const item of items) {
					if (item.isActive) {
						process(item);
						if (item.isDone) {
							return;
						}
					}
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					process(item);
					save(item);
				}
			}
		`,
		outdent`
			for (let index = 0; index < items.length; index++) {
				if (items[index].isActive) {
					process(items[index]);
					save(items[index]);
				}
			}
		`,
		outdent`
			for (const key in items) {
				if (items[key].isActive) {
					process(items[key]);
					save(items[key]);
				}
			}
		`,
		outdent`
			while (item = items.shift()) {
				if (item.isActive) {
					process(item);
					save(item);
				}
			}
		`,
		outdent`
			do {
				if (item.isActive) {
					process(item);
					save(item);
				}
			} while (next());
		`,
		outdent`
			async function run() {
				for await (const item of items) {
					if (item.isActive) {
						process(item);
						save(item);
					}
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (!item.isActive) {
					process(item);
					save(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive || item.isPending) {
					process(item);
					save(item);
				}
			}
		`,
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive)
						process(item);
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive) {
						if (item.isReady) {
							process(item);
						}
					}
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				for (const item of items) {
					if (item as ActiveItem) {
						process(item);
						save(item);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				for (const item of items) {
					if (item!) {
						process(item);
						save(item);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				for (const item of items) {
					if (<ActiveItem>item) {
						process(item);
						save(item);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				for (const item of items) {
					if (item satisfies ActiveItem) {
						process(item);
						save(item);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			for (const item of items) {
				if (! /* Keep this comment with the condition. */ item.isActive) {
					process(item);
					save(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (
					/* Keep this comment with the condition. */
					item.isActive
				) {
					process(item);
					save(item);
				}
			}
		`,
		outdent`
			for (const {isActive, value} of items) {
				if (isActive) {
					process(value);
					save(value);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					// Keep this comment with the moved body.
					process(item);
					save(item);
				}
			}
		`,
		outdent`
			let isActive = true;

			for (const item of items) {
				if (isActive) {
					const isActive = item.active;
					process(isActive);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					const result = getResult(item);
					process(result);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (eval('item.active')) {
					const result = getResult(item);
					process(result);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					const item = getItem();
					process(item);
				}
			}
		`,
		outdent`
			for (const {value: item} of items) {
				if (item.isActive) {
					const item = getItem();
					process(item);
				}
			}
		`,
		outdent`
			for (const [item] of items) {
				if (item.isActive) {
					const item = getItem();
					process(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (shouldProcess) {
					const item = getItem();
					process(item);
				}
			}
		`,
		outdent`
			for (const {value} of items) {
				if (shouldProcess) {
					const value = getValue();
					process(value);
				}
			}
		`,
		outdent`
			for (let index = 0; index < items.length; index++) {
				if (shouldProcess) {
					const index = getIndex();
					process(index);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) /* Keep this comment with the wrapper. */ {
					process(item);
					save(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					const message = \`Hello
			${'	'}			world\`;
					process(message);
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					class ItemProcessor {}
					process(new ItemProcessor());
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					function processItem() {}
					processItem();
				}
			}
		`,
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive) {
						type ActiveItem = typeof item;
						process(item as ActiveItem);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			for (const item of items) {
				if (item.isActive) {
					using resource = getResource(item);
					process(resource);
				}
			}
		`,
		outdent`
			async function run() {
				for (const item of items) {
					if (item.isActive) {
						await using resource = getResource(item);
						process(resource);
					}
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					process(item);
					save(item);
				}
			} // Keep this comment with the loop.
		`,
		outdent`
			for (const item of items) {
				if (item.isActive) {
					process(item);
					save(item);
				} // Keep this comment with the wrapper.
			}
		`,
		{
			code: outdent`
				for (const item of items) {
					if (item.isActive) {
						;(event.target as HTMLInputElement).blur();
					}
				}
			`,
			options: [{maximumStatements: 0}],
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: outdent`
				for (const item of items) {
					doSomethingBefore();
					if (item.isActive) {
						process(item);
						save(item);
					}
				}
			`,
			output: outdent`
				for (const item of items) {
					doSomethingBefore();
					if (!item.isActive) {
						continue;
					}

					process(item);
					save(item);
				}
			`,
			errors: [{messageId: 'prefer-continue'}],
		},
		{
			code: outdent`
				for (const item of items) {
					before();
					if (condition) {
						var value = getValue();
						use(value);
					}
				}
			`,
			output: outdent`
				for (const item of items) {
					before();
					if (!condition) {
						continue;
					}

					var value = getValue();
					use(value);
				}
			`,
			errors: [{messageId: 'prefer-continue'}],
		},
	],
});

test.snapshot({
	valid: [
		'for (const item of items) {}',
		'for (const item of items) { before(); }',
		'for (const item of items) { before(); if (condition) { first(); } }',
		'for (const item of items) { before(); if (condition) { first(); second(); } after(); }',
		'for (const item of items) { before(); if (condition) { first(); second(); }; }',
		'for (const item of items) { before(); if (condition) { first(); second(); } else { other(); } }',
		'for (const item of items) { before(); { if (condition) { first(); second(); } } }',
		'for (const item of items) { before(); if (condition) { first(); break; } }',
		'for (const item of items) { before(); if (condition) { first(); continue; } }',
		'for (const item of items) { before(); if (condition) { first(); throw error; } }',
		{code: 'for (const item of items) { before(); if (condition) {} }', options: [{maximumStatements: 0}]},
		{code: 'for (const item of items) { before(); if (condition); }', options: [{maximumStatements: 0}]},
		{code: 'for (const item of items) { before(); if (condition) { first(); second(); } }', options: [{maximumStatements: 2}]},
		'function foo() { for (const item of items) { before(); if (condition) { first(); return; } } }',
	],
	invalid: [
		'for (const key in items) { before(); if (condition) { first(); second(); } }',
		'for (let index = 0; index < 10; index++) { before(); if (condition) { first(); second(); } }',
		'while (condition) { before(); if (condition) { first(); second(); } }',
		'do { before(); if (condition) { first(); second(); } } while (condition);',
		'async function foo() { for await (const item of items) { before(); if (condition) { first(); second(); } } }',
		{code: 'for (const item of items) { before(); if (condition) { first(); } }', options: [{maximumStatements: 0}]},
		{code: 'for (const item of items) { before(); if (condition) first(); }', options: [{maximumStatements: 0}]},
		{code: 'for (const item of items) { before(); if (condition) { first(); second(); third(); } }', options: [{maximumStatements: 2}]},
		{code: 'for (const item of items) { before(); if (condition as boolean) { first(); second(); } }', languageOptions: {parser: parsers.typescript}},
		outdent`
			for (const item of items) {
				const ready = prepare();
				// Keep this comment before the guard.
				if (ready) {
					// Keep this comment with the moved body.
					first();
					second();
				}
			}
		`,
	],
});

for (const kind of ['let', 'const']) {
	test({
		valid: [],
		invalid: [
			{
				code: `for (const item of items) { before(); if (condition) { ${kind} value = getValue(); use(value); } }`,
				errors: [{messageId: 'prefer-continue'}],
			},
		],
	});
}

// Short bodies can opt in to conditional wrapping.
test.snapshot({
	valid: [
		'for (const item of items) { if (!condition) { continue; } work(); }',
		{
			code: 'for (const item of items) { if (!condition) { continue; } work(); }',
			options: [{checkShortBodies: false}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } work(); }',
			options: [{checkShortBodies: true, maximumStatements: 0}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } work(); finish(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else { work(); finish(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { prepare(); if (!condition) { continue; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { prepare(); continue; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else if (other) { work(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else { work(); } finish(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else {} }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } ; }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'outer: for (const item of items) { if (!condition) { continue outer; } work(); }',
			options: [{checkShortBodies: true}],
		},
	],
	invalid: [
		{
			code: 'for (const item of items) { if (!condition) { continue; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (condition) { continue; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) continue; work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else { work(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) continue; else work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } work(); finish(); }',
			options: [{checkShortBodies: true, maximumStatements: 2}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else { work(); finish(); } }',
			options: [{checkShortBodies: true, maximumStatements: 2}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } ;work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } if (other) { work(); finish(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!(condition && other)) { continue; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if ((condition)) { continue; } (work)(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (value?.active) { continue; } work?.(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } const value = work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } function work() {} }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else { const value = work(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { /* keep */ continue; } work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } /* keep */ work(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } work(/* keep */); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (condition as boolean) { continue; } work(); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'for (const item of items) { if (condition!) { continue; } work(); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'for (const item of items) { if (condition satisfies boolean) { continue; } work(); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'for (const item of items) { if (<boolean>condition) { continue; } work(); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'for (const item of items) {\n	if (!condition) {\n		continue;\n	}\n\n	performWork();\n}',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) {\n	if (condition) { continue; }\n	performWork(\n		value,\n	);\n}',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) {\n	if (condition) { continue; }\n	performWork(); // keep here\n}',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (/* condition */ condition) { continue; } performWork(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else { /* keep */ performWork(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } const {value} = source; }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } class Example {} }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } var value = performWork(); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } { const value = performWork(); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } performWork(`first\nsecond`); }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } else { performWork(`first\nsecond`); } }',
			options: [{checkShortBodies: true}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } performWork(<Component value={value} />); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } performWork(<div>first\nsecond</div>); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'function run(items, log) { for (const item of items) { if (record(log, g)) { continue; } label: function g() {} } }',
			options: [{checkShortBodies: true}],
			languageOptions: {sourceType: 'script'},
			output: null,
			errors: [{messageId: 'prefer-continue/short-body'}],
		},
		{
			code: 'for (const item of items) { if (!condition) { continue; } import work = require(\'work\'); }',
			options: [{checkShortBodies: true}],
			languageOptions: {parser: parsers.typescript},
			output: null,
			errors: [{messageId: 'prefer-continue/short-body'}],
		},
		{
			code: 'for (const item of items) { if (condition) { import work = require(\'work\'); performWork(); } }',
			languageOptions: {parser: parsers.typescript},
			output: null,
			errors: [{messageId: 'prefer-continue'}],
		},
	],
});

// The inserted `continue;` follows the file's indentation
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				for (const item of items) {
				  if (item.isActive) {
				    process(item);
				    save(item);
				  }
				}
			`,
			output: outdent`
				for (const item of items) {
				  if (!item.isActive) {
				    continue;
				  }

				  process(item);
				  save(item);
				}
			`,
			errors: [{messageId: 'prefer-continue'}],
		},
		{
			code: outdent`
				for (const item of items) {
				    if (item.isActive) {
				        process(item);
				        save(item);
				    }
				}
			`,
			output: outdent`
				for (const item of items) {
				    if (!item.isActive) {
				        continue;
				    }

				    process(item);
				    save(item);
				}
			`,
			errors: [{messageId: 'prefer-continue'}],
		},
		{
			code: outdent`
				function run() {
				  for (const item of items) {
				    if (item.isActive) {
				      if (item.isReady) {
				        process(item);
				      }
				      save(item);
				    }
				  }
				}
			`,
			output: outdent`
				function run() {
				  for (const item of items) {
				    if (!item.isActive) {
				      continue;
				    }

				    if (item.isReady) {
				      process(item);
				    }
				    save(item);
				  }
				}
			`,
			errors: [{messageId: 'prefer-continue'}],
		},
		{
			code: outdent`
				for (const item of items) {
				  if (!item.isActive) {
				    continue;
				  }

				  process(item);
				}
			`,
			options: [{checkShortBodies: true}],
			output: outdent`
				for (const item of items) {
				  if (item.isActive) {
				    process(item);
				  }
				}
			`,
			errors: [{messageId: 'prefer-continue/short-body'}],
		},
		{
			code: outdent`
				function run() {
				  for (const item of items) {
				    if (!item.isActive) {
				      continue;
				    }

				    process(
				      item,
				    );
				  }
				}
			`,
			options: [{checkShortBodies: true}],
			output: outdent`
				function run() {
				  for (const item of items) {
				    if (item.isActive) {
				      process(
				        item,
				      );
				    }
				  }
				}
			`,
			errors: [{messageId: 'prefer-continue/short-body'}],
		},
	],
});

// The inserted lines use the file's line ending
test({
	valid: [],
	invalid: [
		{
			code: 'for (const item of items) {\r\n\tif (item.isActive) {\r\n\t\tprocess(item);\r\n\t\tsave(item);\r\n\t}\r\n}\r\n',
			output: 'for (const item of items) {\r\n\tif (!item.isActive) {\r\n\t\tcontinue;\r\n\t}\r\n\r\n\tprocess(item);\r\n\tsave(item);\r\n}\r\n',
			errors: [{messageId: 'prefer-continue'}],
		},
		{
			code: 'for (const item of items) {\r\n\tif (!item.isActive) {\r\n\t\tcontinue;\r\n\t}\r\n\r\n\tprocess(item);\r\n}\r\n',
			options: [{checkShortBodies: true}],
			output: 'for (const item of items) {\r\n\tif (item.isActive) {\r\n\t\tprocess(item);\r\n\t}\r\n}\r\n',
			errors: [{messageId: 'prefer-continue/short-body'}],
		},
	],
});

// Moved bodies keep nested indentation and blank lines, and drop whitespace-only lines
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				for (const item of items) {
				  if (item.isActive) {
				    if (item.isReady) {
				      process(item);
				    }

				    save(item);
				  }
				}
			`,
			output: outdent`
				for (const item of items) {
				  if (!item.isActive) {
				    continue;
				  }

				  if (item.isReady) {
				    process(item);
				  }

				  save(item);
				}
			`,
			errors: [{messageId: 'prefer-continue'}],
		},
		{
			code: 'for (const item of items) {\n  if (item.isActive) {\n    handle(item);\n    \n    store(item);\n  }\n}\n',
			output: 'for (const item of items) {\n  if (!item.isActive) {\n    continue;\n  }\n\n  handle(item);\n\n  store(item);\n}\n',
			errors: [{messageId: 'prefer-continue'}],
		},
	],
});
