import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`class Foo {}`,
		outdent`class Foo extends OtherClass {}`,
		outdent`class Foo extends EventTarget {}`,
	],
	invalid: [
		outdent`class Foo extends EventEmitter {}`,
		outdent`class Foo extends EventEmitter { someMethod() {} }`,
		outdent`
			class Foo extends EventEmitter {
				addListener() {}
				removeListener() {}
			}`,
	],
});

test.snapshot({
	valid: [
		outdent`new EventTarget`,
		outdent`const target = new EventTarget;`,
	],
	invalid: [
		outdent`new EventEmitter`,
		outdent`const emitter = new EventEmitter;`,
	],
});
