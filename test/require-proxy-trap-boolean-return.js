import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const errors = [
	{
		messageId: 'require-proxy-trap-boolean-return',
	},
];

test({
	valid: [
		'new Proxy(target, handler);',
		'new Proxy(target, {get() {}});',
		'new Proxy(target, {apply() {}});',
		'new Proxy(target, {set(target, property, value) { target[property] = value; return true; }});',
		'new Proxy(target, {set(target, property, value) { return false; }});',
		'new Proxy(target, {set(target, property, value) { return Reflect.set(target, property, value); }});',
		'new Proxy(target, {deleteProperty(target, property) { return Reflect.deleteProperty(target, property); }});',
		'new Proxy(target, {deleteProperty(target, property) { return delete target[property]; }});',
		'new Proxy(target, {defineProperty(target, property, descriptor) { return Reflect.defineProperty(target, property, descriptor); }});',
		'new Proxy(target, {has(target, property) { return property in target; }});',
		'new Proxy(target, {isExtensible(target) { return Object.isExtensible(target); }});',
		'new Proxy(target, {preventExtensions(target) { return Reflect.preventExtensions(target); }});',
		'new Proxy(target, {setPrototypeOf(target, prototype) { return Reflect.setPrototypeOf(target, prototype); }});',
		'new Proxy(target, {set: (target, property, value) => true});',
		'new Proxy(target, {set: (target, property, value) => Reflect.set(target, property, value)});',
		'new Proxy(target, {["set"](target, property, value) { return true; }});',
		'Proxy.revocable(target, {set(target, property, value) { return true; }});',
		'new Proxy(target, {[trap](target, property, value) {}});',
		'new Proxy(target, {get set() {}});',
		'new Proxy(target, {set has(value) {}});',
		'new Proxy(target, {set() { throw new Error(); }});',
		'new Proxy(target, {set() { function inner() {} throw new Error(); }});',
		'new Proxy(target, {set() { const error = new Error(); throw error; }});',
		'new Proxy(target, {set() { if (condition) { return true; } else { return false; } }});',
		'new Proxy(target, {set() { if (condition) { return true; } else { throw new Error(); } }});',
		'new Proxy(target, {set() { if (condition) { throw new Error(); } else { throw new Error(); } }});',
		'new Proxy(target, {set() { switch (value) { case 1: return true; default: return false; } }});',
		'new Proxy(target, {set() { switch (value) { case 1: case 2: return true; default: return false; } }});',
		'new Proxy(target, {set() { switch (value) { case 1: switch (otherValue) { default: break; } return true; default: return false; } }});',
		'new Proxy(target, {set() { switch (value) { case 1: while (condition) { break; } return true; default: return false; } }});',
		'new Proxy(target, {set() { try { return true; } catch { return false; } }});',
		'new Proxy(target, {set() { try { return true; } finally { cleanup(); } }});',
		'new Proxy(target, {set() { return didSet = true; }});',
		'new Proxy(target, {set(target, property, value) { return didSet = Reflect.set(target, property, value); }});',
		'new Proxy(target, {set(target, property) { return (sideEffect(), property in target); }});',
		'new Proxy(target, {set() { return value > 0; }});',
		'new Proxy(target, {set() { return value === otherValue; }});',
		'new Proxy(target, {set() { return value instanceof Constructor; }});',
	],
	invalid: [
		{
			code: 'new Proxy(target, {set(target, property, value) { target[property] = value; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set(target, property, value) { return; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set(target, property, value) { return 1; }});',
			output: 'new Proxy(target, {set(target, property, value) { return true; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {deleteProperty: () => 0});',
			output: 'new Proxy(target, {deleteProperty: () => false});',
			errors,
		},
		{
			code: 'new Proxy(target, {defineProperty() { return ""; }});',
			output: 'new Proxy(target, {defineProperty() { return false; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {has() { return "yes"; }});',
			output: 'new Proxy(target, {has() { return true; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return undefined; }});',
			output: 'new Proxy(target, {isExtensible() { return false; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return void sideEffect(); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return (sideEffect(), 1); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return (sideEffect(), typeof value); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return (sideEffect(), `${value}`); }});', // eslint-disable-line no-template-curly-in-string
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return (sideEffect(), condition ? true : 1); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return result = 1; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return value += true; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return value &&= true; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return `${value}`; }});', // eslint-disable-line no-template-curly-in-string
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return typeof value; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return value + 1; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return value * 2; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return value | 0; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return condition ? true : 1; }});',
			output: 'new Proxy(target, {isExtensible() { return condition ? true : true; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible: () => condition ? false : 1});',
			output: 'new Proxy(target, {isExtensible: () => condition ? false : true});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return condition && 1; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return condition || 1; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return value ?? 1; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return 0 && condition; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return 1 || condition; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return 1 ?? condition; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return [/* keep */]; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return {a}; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return function () {}; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return () => true; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return class {}; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {isExtensible() { return new Boolean(true); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {preventExtensions() {}});',
			errors,
		},
		{
			code: 'new Proxy(target, {preventExtensions() { if (condition) { return true; } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {preventExtensions() { if (condition) { throw new Error(); } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {preventExtensions() { switch (value) { case 1: break; default: return true; } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {preventExtensions() { switch (value) { case 1: break; return true; default: return true; } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {preventExtensions() { switch (value) { case 1: if (condition) { break; } return true; default: return true; } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {preventExtensions() { function inner() { return true; } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {setPrototypeOf: async () => true});',
			errors,
		},
		{
			code: 'new Proxy(target, {* setPrototypeOf() { return true; }});',
			errors,
		},
		{
			code: 'Proxy.revocable(target, {set() { return 1; }});',
			output: 'Proxy.revocable(target, {set() { return true; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() {}, deleteProperty() {}});',
			errors: [
				{messageId: 'require-proxy-trap-boolean-return'},
				{messageId: 'require-proxy-trap-boolean-return'},
			],
		},
	],
});
