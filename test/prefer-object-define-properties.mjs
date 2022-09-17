import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Object.defineProperty(foo, "load", {value: () => {}, writable: true});',
		outdent`
			Object.defineProperty(foo, "load", {value: () => {}, writable: true});
			Object.defineProperty();
		`,
		'Object.defineProperty(foo, "build", {value: null, writable: true});',
		outdent`
			Object.defineProperties(foo, {
				load: {value: () => {}, writable: true},
				build: {value: null, writable: true},
			});
		`,
		outdent`
			Object.defineProperty(bar, "build", {value: null, writable: true});
			{
				Object.defineProperty(bar, "load", {value: null, writable: true});
			}
		`,
		outdent`
			Object.defineProperty(foo, "build", {value: null, writable: true});
			; // <-- Other node between
			Object.defineProperty(foo, "build", {value: null, writable: true});
		`,
		outdent`
			Object.defineProperty(foo, "build", {value: null, writable: true});
			Object.defineProperty(bar, "build", {value: null, writable: true});
		`,
		outdent`
			foo(
				Object.defineProperty(foo, "a", {}),
				Object.defineProperty(foo, "b", {}),
			);
		`,
		outdent`
			Object.defineProperty(foo, "a", {});
			Object.defineProperties(bar, {a: {}});
			Object.foo();
			Object.defineProperty(foo, "b", {});
		`,
	],
	invalid: [
		outdent`
			Object.defineProperty(foo, "load", {value: () => {}, writable: true});
			Object.defineProperty(foo, bar, {value: null, writable: true});
		`,
		outdent`
			Object.defineProperty(foo, "build", {value: null, writable: true});
			Object.defineProperty(foo, "load", bar);
		`,
		outdent`
			Object.defineProperty(foo, "load", {value: () => {}, writable: true});
			; // <- Other node between
			Object.defineProperty(foo, "test", {value: null, writable: true});
			Object.defineProperty(foo, "test-b", {value: null, writable: true});
		`,
		outdent`
			Object.defineProperty(foo, "test", {value: () => {}, writable: true});
			Object.defineProperties(foo, {bar});
			Object.defineProperties(foo, {baz});
		`,
		outdent`
			Object.defineProperty(foo, "test", {value: () => {}, writable: true});
			Object.defineProperties(foo, {a});
			Object.defineProperties(foo, {b, c, d});
			Object.defineProperties(foo, identifier);
			Object.defineProperties(foo, x.y);
			Object.defineProperty(foo, x.y2, bar);
		`,
	],
});
