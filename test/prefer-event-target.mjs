import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'class Foo {}',
		'class Foo extends OtherClass {}',
		'class Foo extends EventTarget {}',
	],
	invalid: [
		'class Foo extends EventEmitter {}',
		'class Foo extends EventEmitter { someMethod() {} }',
		outdent`
			class Foo extends EventEmitter {
				addListener() {}
				removeListener() {}
			}`,
	],
});

test.snapshot({
	valid: [
		'new EventTarget',
		'const target = new EventTarget;',
	],
	invalid: [
		'new EventEmitter',
		'const emitter = new EventEmitter;',
	],
});
