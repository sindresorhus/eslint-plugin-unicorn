import outdent from 'outdent';
import {getTester} from './utils/test.js';

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
			'import EventEmitter from "@angular/core";',
			'const {EventEmitter} = require("@angular/core");',
			'const EventEmitter = require("@angular/core").EventEmitter;',
			'import {EventEmitter} from "eventemitter3";',
			'import EventEmitter from "eventemitter3";',
			'const {EventEmitter} = await import("eventemitter3");',
			'const EventEmitter = (await import("eventemitter3")).EventEmitter;',
			'const {EventEmitter} = require(`@angular/core`);',
			'const EventEmitter = require(`eventemitter3`).EventEmitter;',
			'const {EventEmitter} = await import(`eventemitter3`);',
			'const EventEmitter = (await import(`@angular/core`)).EventEmitter;',
			'const {EventEmitter} = require(`eventemitter\\u{33}`);',
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
		'new EventEmitter()',
		'new EventEmitter(options)',
		'const emitter = new EventEmitter;',
		// For coverage
		'for (const {EventEmitter} of []) {new EventEmitter}',
		'for (const EventEmitter of []) {new EventEmitter}',
		'const {EventEmitter} = require(``); new EventEmitter();',
		'const {EventEmitter} = require(`eventemitter${version}`); new EventEmitter();', // eslint-disable-line no-template-curly-in-string
		'const {EventEmitter} = require(tag`eventemitter3`); new EventEmitter();',
		'const {EventEmitter} = await import(`eventemitter${version}`); new EventEmitter();', // eslint-disable-line no-template-curly-in-string
	],
});
