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
		...[
			'import {EventEmitter} from "@angular/core";',
			'const {EventEmitter} = require("@angular/core");',
			'const EventEmitter = require("@angular/core").EventEmitter;',
			'import {EventEmitter} from "eventemitter3";',
			'const {EventEmitter} = await import("eventemitter3");',
			'const EventEmitter = (await import("eventemitter3")).EventEmitter;',
		].map(code => outdent`
			${code}
			class Foo extends EventEmitter {}
		`),
		'EventTarget()',
		'new EventTarget',
		'const target = new EventTarget;',
		'const target = EventTarget()',
		'const target = new Foo(EventEmitter);',
		'EventEmitter()',
		'const emitter = EventEmitter()',
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
		'new EventEmitter',
		'const emitter = new EventEmitter;',
		// For coverage
		'for (const {EventEmitter} of []) {new EventEmitter}',
		'for (const EventEmitter of []) {new EventEmitter}',
	],
});
