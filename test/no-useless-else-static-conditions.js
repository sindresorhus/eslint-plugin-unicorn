import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta, 'no-useless-else');

test.snapshot({
	valid: [
		outdent`
			const regex = /foo/g;
			regex.exec('foo');

			if (condition) {
				if (!regex.lastIndex) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const regex = /foo/g;
			const property = 'lastIndex';
			regex.exec('foo');

			if (condition) {
				if (!regex[property]) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const regex = /foo/;
			Object.defineProperty(regex, 'global', {get() { return false; }});

			if (condition) {
				if (regex.global) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const regex = /foo/;
			Object.defineProperty(RegExp.prototype, 'global', {get() { return false; }});

			if (condition) {
				if (regex.global) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const regex = /foo/;
			patchRegExpPrototype();

			if (condition) {
				if (regex.global) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			Object.defineProperty(RegExp.prototype, 'global', {get() { return false; }});

			if (condition) {
				if (/foo/g.global) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			const regex = /foo/;

			if (condition) {
				if (regex.global) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			Object.defineProperty(String.prototype, 'toString', {value: undefined});

			if (condition) {
				if ('foo'.toString) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
		outdent`
			Object.prototype.toString = undefined;

			if (condition) {
				if (({}).toString) {
					process.exit();
				}
			} else {
				doSomethingElse();
			}
		`,
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
			function qux() {
				Object.prototype.toString = () => '';
				const initialValue = String({});
				const value = initialValue;

				if (condition) {
					if (value) {
						return;
					}
				} else {
					doSomethingElse();
				}
			}
		`,
		outdent`
			function qux() {
				Object.prototype.toString = () => '';
				const initialValue = String({});
				const value = true ? initialValue : '';

				if (condition) {
					if (value) {
						return;
					}
				} else {
					doSomethingElse();
				}
			}
		`,
		outdent`
			function qux() {
				Object.prototype.toString = () => '';
				const initialValue = String({});

				if (condition) {
					if (true ? initialValue : false) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				Object.prototype.toString = () => '';
				const initialValue = String({});

				if (condition) {
					if (initialValue || false) {
						return;
					}
				} else {
					bar();
				}
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
			const set = new Set();

			if (globalThis.condition) {
				set.add('a');
				if (!set.size) {
					throw new Error('empty');
				}
			} else {
				globalThis.fallback();
			}
		`,
		outdent`
			const map = new Map();

			if (globalThis.condition) {
				map.set('a', true);
				if (!map.size) {
					throw new Error('empty');
				}
			} else {
				globalThis.fallback();
			}
		`,
		outdent`
			const first = Object.freeze(second);
			const second = Object.freeze(first);

			if (condition) {
				if (first) {
					throw new Error('cyclic initializer');
				}
			} else {
				globalThis.fallback();
			}
		`,
		outdent`
			function qux(Object) {
				if (condition) {
					if (Object.freeze({})) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (condition) {
					if (Object.freeze(null)) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (condition) {
					if (Object.freeze?.({})) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (condition) {
					if (Object.freeze(...[{}])) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				const object = {value: true};
				Object.defineProperty(object, 'value', {get() { return false; }});

				if (condition) {
					if (Object.freeze(object.value)) {
						return;
					}
				} else {
					bar();
				}
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
			const property = 'value';

			if (condition) {
				if (object[property]) {
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
		outdent`
			function qux() {
				const text = 'foo';

				if (condition) {
					if (text.length) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				const property = 'value';

				if (condition) {
					if ({value: true}[property]) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				const key = object.value;

				if (condition) {
					if (({value: {key}}).value) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				const values = ['value'];

				if (condition) {
					if (values[0]) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
	],
	invalid: [
		outdent`
			function qux() {
				if (condition) {
					if (true) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (condition) {
					if (false) {
						bar();
					} else {
						return;
					}
				} else {
					bar();
				}
			}
		`,
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
		outdent`
			function qux() {
				if (condition) {
					if (Object.freeze({})) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (condition) {
					if (Object.seal({})) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (condition) {
					if (Object.preventExtensions({})) {
						return;
					}
				} else {
					bar();
				}
			}
		`,
		{
			code: outdent`
				function qux() {
					if (condition) {
						if ((Object.freeze({}) as object)) {
							return;
						}
					} else {
						bar();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function qux() {
					if (condition) {
						if ((Object.freeze as typeof Object.freeze)({})) {
							return;
						}
					} else {
						bar();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function qux() {
					if (condition) {
						if (Object.freeze!({})) {
							return;
						}
					} else {
						bar();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function qux() {
					if (condition) {
						if ((Object.freeze satisfies typeof Object.freeze)({})) {
							return;
						}
					} else {
						bar();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function qux() {
					if (condition) {
						if ((<typeof Object.freeze>Object.freeze)({})) {
							return;
						}
					} else {
						bar();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function qux() {
					if (condition) {
						if ((Object as typeof Object).freeze({})) {
							return;
						}
					} else {
						bar();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
});
