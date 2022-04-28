import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'class Foo {}',
		'class Foo extends OtherClass {}',
		'class Foo extends EventTarget {}',
		'const Foo = class extends EventTarget {}',
		'const Foo = class extends foo.EventTarget {}',
		'const Foo = class extends foo.bar.EventTarget {}',
		'class Foo extends foo.EventEmitter {}',
		'class Foo extends foo.bar.EventEmitter {}',
		'class EventEmitter extends Foo {}',
		'const Foo = class EventEmitter extends Foo {}',
		'new Foo(EventEmitter)',
		'new foo.EventEmitter()',
	],
	invalid: [
		'class Foo extends EventEmitter {}',
		'class Foo extends EventEmitter { someMethod() {} }',
		'const Foo = class extends EventEmitter {}',
		outdent`
			class Foo extends EventEmitter {
				addListener() {}
				removeListener() {}
			}
		`,
	],
});

test.snapshot({
	valid: [
		'EventTarget()',
		'new EventTarget',
		'const target = new EventTarget;',
		'const target = new Foo(EventEmitter);',
		'const target = EventTarget()',
	],
	invalid: [
		'EventEmitter()',
		'new EventEmitter',
		'const emitter = new EventEmitter;',
		'const emitter = EventEmitter()',
	],
});
