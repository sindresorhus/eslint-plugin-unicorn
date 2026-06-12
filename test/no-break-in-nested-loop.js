import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			for (const item of items) {
				if (item.done) {
					break;
				}
			}
		`,
		outdent`
			for (const item of items) {
				if (!item.visible) {
					continue;
				}
			}
		`,
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
		outdent`
			outer: for (const item of items) {
				for (const child of item.children) {
					continue outer;
				}
			}
		`,
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
	],
	invalid: [
		outdent`
			for (const item of items) {
				for (const child of item.children) {
					break;
				}
			}
		`,
		outdent`
			for (const item of items) {
				while (item.children.pop()) {
					continue;
				}
			}
		`,
		outdent`
			for (const item of items) {
				switch (item.type) {
					case 'child':
						break;
				}
			}
		`,
		outdent`
			for (const item of items) {
				switch (item.type) {
					case 'child':
						continue;
				}
			}
		`,
		outdent`
			for (let index = 0; index < items.length; index++) {
				for (const child of items[index].children) {
					break;
				}
			}
		`,
		outdent`
			for (const key in items) {
				do {
					continue;
				} while (items[key].pending);
			}
		`,
	],
});
