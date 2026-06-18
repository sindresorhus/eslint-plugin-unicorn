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
						process(item);
						save(item);
					}
				}
			`,
			options: [{maximumStatements: 2}],
		},
	],
	invalid: [
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
	],
});
