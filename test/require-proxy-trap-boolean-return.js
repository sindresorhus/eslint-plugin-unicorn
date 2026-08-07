import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const errors = [
	{
		messageId: 'require-proxy-trap-boolean-return',
	},
];

test({
	valid: [
		'new Proxy(target, {set() { process.exit(1); }});',
		'new Proxy(target, {set() { label: { process.exit(1); } }});',
		'new Proxy(target, {set() { label: { process.exit(1); break label; } }});',
		'const report = () => {}; new Proxy(target, {set() { report(process.exit(1)); }});',
		'class Report {} const report = () => {}; new Proxy(target, {set() { report(new Report(process.exit(1))); }});',
		'new Proxy(target, {set() { process.exit(1)?.toString(); }});',
		'const report = () => {}; const foo = null; new Proxy(target, {set() { report((foo?.bar)[process.exit(1)]); }});',
		'new Proxy(target, {set() { process.exit(1) + 1; }});',
		'new Proxy(target, {set() { process.exit(1); cleanup(); }});',
		'new Proxy(target, {set() { class Example { static { process.exit(1); } } }});',
		'new Proxy(target, {set() { class Example { static {} static { process.exit(1); } } }});',
		'new Proxy(target, {set() { (cleanup(), process.exit(1)); }});',
		'new Proxy(target, {set() { ((cleanup(), process.exit(1))); }});',
		'new Proxy(target, {set() { try { process.exit(1); } finally { cleanup(); } }});',
		'new Proxy(target, {set() { try { cleanup(); } finally { process.exit(1); } }});',
		'new Proxy(target, {set() { try { process.exit(1); } catch { cleanup(); } }});',
		'new Proxy(target, {set() { if (condition ? process.exit(1) : process.exit(2)) {} }});',
		'new Proxy(target, {set() { switch (value) { case 1: process.exit(1); default: process.exit(2); } }});',
		'new Proxy(target, {set() { switch (value) { case process.exit(1): } }});',
		'new Proxy(target, {set() { switch (value) { case 1: process.exit(1); cleanup(); default: process.exit(2); } }});',
		'new Proxy(target, {set() { switch (value) { case 1: process.exit(1); break; default: process.exit(2); } }});',
		'new Proxy(target, {set() { switch (value) { case 1: return true; break; default: return false; } }});',
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
		'new Proxy(target, {set() { Object.prototype.toString = () => ""; const value = String({}); return value; }});',
		'new Proxy(target, {set() { return value > 0; }});',
		'new Proxy(target, {set() { return value === otherValue; }});',
		'new Proxy(target, {set() { return value instanceof Constructor; }});',
		'new Proxy(target, {set() { const object = {value: 1}; Object.defineProperty(object, "value", {get() { return false; }}); return object.value; }});',
		// CPA: infinite loop always exits.
		'new Proxy(target, {set() { while (true) { doSomething(); } }});',
		'new Proxy(target, {set() { while (process.exit(1)) {} }});',
		'new Proxy(target, {set() { for (; process.exit(1);) {} }});',
		'new Proxy(target, {set() { do {} while (process.exit(1)); }});',
		'new Proxy(target, {set() { do { label: while (condition) {} } while (process.exit(1)); }});',
		'new Proxy(target, {set() { do { for (const value of values) {} } while (process.exit(1)); }});',
		'new Proxy(target, {set() { do { for (const key in object) {} } while (process.exit(1)); }});',
		'new Proxy(target, {set() { do { while (true) { break; } } while (process.exit(1)); }});',
		'new Proxy(target, {set() { const condition = getCondition(); do { while (true) { if (condition) break; } } while (process.exit(1)); }});',
		'new Proxy(target, {set() { const condition = getCondition(); do { while (true) { if (condition) continue; } } while (process.exit(1)); }});',
		'new Proxy(target, {set() { do { continue; } while (process.exit(1)); }});',
		'new Proxy(target, {set() { do; while (process.exit(1)); }});',
		'new Proxy(target, {set() { do { ; continue; } while (process.exit(1)); }});',
		'new Proxy(target, {set() { label: do { continue label; } while (process.exit(1)); }});',
		'new Proxy(target, {set() { const condition = true; do { if (condition) continue; } while (process.exit(1)); }});',
		'new Proxy(target, {set() { const condition = true; do { ; if (condition) continue; } while (process.exit(1)); }});',
		'new Proxy(target, {set() { const condition = true; do { if (condition) continue; process.exit(1); } while (process.exit(2)); }});',
		'new Proxy(target, {set() { for (;;) { process.exit(1); } }});',
		'new Proxy(target, {set() { while (1) { process.exit(1); } }});',
		'new Proxy(target, {set() { for (; 1;) { process.exit(1); } }});',
		'new Proxy(target, {set() { for (; true; process.exit(1)) {} }});',
		'new Proxy(target, {set() { do { process.exit(1); break; } while (condition); }});',
		'new Proxy(target, {set() { do { process.exit(1); continue; } while (condition); }});',
		'new Proxy(target, {set() { outer: do { while (condition) { continue outer; } } while (process.exit(1)); }});',
		'new Proxy(target, {set() { outer: do { switch (value) { case 1: continue outer; } } while (process.exit(1)); }});',
		'new Proxy(target, {set() { do { if (false) maybeThrow(); } while (process.exit(1)); }});',
		// CPA: `for (;;)` always exits.
		'new Proxy(target, {set() { for (;;) { doSomething(); } }});',
		// CPA: try/catch where both branches exit.
		'new Proxy(target, {set() { try { return doSomething(); } catch { throw new Error(); } }});',
		'new Proxy(target, {set() { try { throw error; } catch { if (condition) { process.exit(1); } else { throw error; } } }});',
		// CPA: nested if/else chain where every branch returns.
		'new Proxy(target, {set() { if (a) { if (b) { return true; } else { return false; } } else { return true; } }});',
		// CPA: exhaustive switch inside try/finally.
		'new Proxy(target, {set() { try { switch (v) { case 1: return true; default: return false; } } finally { cleanup(); } }});',
		// CPA: labeled break inside inner loop does not exit the function.
		'new Proxy(target, {set() { outer: for (const x of items) { for (const y of x) { break outer; } } return true; }});',
		// CPA: try/catch where `return true` can't throw, so catch is dead code.
		'new Proxy(target, {set() { try { return true; } catch { handle(); } }});',
		// CPA: a nested function that falls through does not affect the trap's own exit analysis.
		'new Proxy(target, {set() { const noop = () => { doSomething(); }; while (true) { poll(); } }});',
	],
	invalid: [
		{
			code: 'new Proxy(target, {set(target, property, value) { target[property] = value; }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set(process) { process.exit(1); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { label: { break label; process.exit(1); } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { label: switch (value) { case 1: break label; default: process.exit(1); } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { do { break; } while (process.exit(1)); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { do { break; process.exit(1); } while (condition); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { do { if (condition) continue; process.exit(1); } while (otherCondition); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { outer: while (condition) { do { continue outer; } while (process.exit(1)); } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { outer: do { switch (value) { case 1: continue outer; default: process.exit(1); } } while (condition); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { report(() => process.exit(1)); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { report(foo?.(process.exit(1))); }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { report(foo?.bar[process.exit(1)]); }});',
			errors,
		},
		{
			code: 'import process from \'node:process\'; new Proxy(target, {set() { process.exit(1); }});',
			languageOptions: {sourceType: 'module'},
			errors,
		},
		{
			code: 'new Proxy(target, {set() { try { throw error; process.exit(1); } catch { cleanup(); } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { try { (maybeThrow(), process.exit(1)); } catch { cleanup(); } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { try { ((maybeThrow(), process.exit(1))); } catch { cleanup(); } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { try { process.exit(maybeThrow()); } catch { cleanup(); } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { switch (value) { case 1: return true; default: break; case process.exit(1): {} } }});',
			errors,
		},
		{
			code: 'new Proxy(target, {set() { try { class Example { static { maybeThrow(); process.exit(1); } } } catch {} }});',
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
			code: 'new Proxy(target, {preventExtensions() { switch (value) { case 1: return true; default: } }});',
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
		// CPA: non-exhaustive switch (no default) can fall through.
		{
			code: 'new Proxy(target, {preventExtensions() { switch (value) { case 1: return true; } }});',
			errors,
		},
		// CPA: try where return argument can throw, catch falls through.
		{
			code: 'new Proxy(target, {preventExtensions() { try { return getValue(); } catch { handle(); } }});',
			errors,
		},
		// CPA: only one branch of `if` exits, no else.
		{
			code: 'new Proxy(target, {preventExtensions() { if (condition) { throw new Error(); } doSomething(); }});',
			errors,
		},
		// CPA: labeled break exits only the labeled statement, function can still fall through.
		{
			code: 'new Proxy(target, {preventExtensions() { label: { break label; } }});',
			errors,
		},
		// CPA: a `return` inside a nested function does not satisfy the trap; the trap itself falls through.
		{
			code: 'new Proxy(target, {preventExtensions() { const compute = () => true; if (compute()) { return true; } }});',
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
