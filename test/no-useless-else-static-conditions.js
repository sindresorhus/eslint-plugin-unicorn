import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'no-useless-else');

test.snapshot({
	valid: [
		outdent`
			const values = ['value'];
			values.pop();

			if (condition) {
				if (values.length) {
					throw new Error();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const object = {value: true};
			object.value = false;

			if (condition) {
				if (object.value) {
					throw new Error();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const modes = new Set(['foo']);
			modes.clear();

			if (condition) {
				if (modes.size || otherCondition) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const modes = new Set(['foo']);

			if (condition) {
				try {
					if ((modes = new Set()).size) {
						process.exit();
					}
				} catch {}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			let value = true;

			if (condition) {
				try {
					if ((value = false, value)) {
						process.exit();
					}
				} catch {}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const modes = new Set(['foo']);
			modes.clear();

			if (condition) {
				if (!!modes.size) {
					throw new Error();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const object = {value: true};
			Object.defineProperty(object, 'value', {get() { return false; }});

			if (condition) {
				if (object.value) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const object = {value: true};
			Object.defineProperty(object, 'value', {get() { return false; }});

			if (condition) {
				try {
					if (object.value && true) {
						process.exit();
					}
				} catch {}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const object = {value: true};
			Object.defineProperty(object, 'value', {get() { return false; }});

			if (condition) {
				try {
					if (object.value) {
						process.exit();
					}
				} catch {}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const object = {value: true};
			Object.defineProperty(object, 'value', {get() { return false; }});
			const value = object.value;

			if (condition) {
				if (value) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const object = {value: true};
			Object.defineProperty(object, 'value', {get() { throw new Error(); }});

			if (condition) {
				try {
					object?.value;
					process.exit();
				} catch {}
			} else {
				doSomethingElse();
			}
		`,
	],
	invalid: [
		outdent`
			function qux() {
				if (true) {
					process.exit();
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (!false) {
					process.exit();
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (true && true) {
					process.exit();
				} else {
					bar();
				}
			}
		`,
	],
});
