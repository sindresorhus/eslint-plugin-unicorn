import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'globalThis.jQuery',
		'globalThis.myApp',
		'globalThis.alert?.()',
		'globalThis?.fetch()',
		'globalThis.Array?.from(items)',
		'globalThis.Array?.from?.(items)',
		'globalThis.foo = value',
		'globalThis.Array = value',
		'globalThis.Array++',
		'delete globalThis.foo',
		'delete globalThis.Array',
		'for (globalThis.Array of iterable) {}',
		'for (globalThis.Array in object) {}',
		'({...globalThis.Array} = object)',
		'[...globalThis.Array] = array',
		'const globalThis = {}; globalThis.Array.from(items)',
		'const Array = {}; globalThis.Array.from(items)',
		'const Array = globalThis.Array;',
		'function foo(Array) { globalThis.Array.from(items); }',
		'const fetch = () => {}; globalThis.fetch(url)',
		'const fetch = globalThis.fetch;',
		'globalThis.eval(code)',
		'/* global Array:off */ globalThis.Array.from(items)',
		'/* global foo-bar:readonly */ globalThis["foo-bar"]',
		'/* global import:readonly */ globalThis.import',
		'globalThis[(foo(), "Array")].from(items)',
		'globalThis[String.raw`Array`].from(items)',
		'globalThis[`A${foo}rray`].from(items)', // eslint-disable-line no-template-curly-in-string
		{
			code: 'globalThis.fetch(url)',
			languageOptions: {globals: {fetch: 'off'}},
		},
		{code: '(globalThis.Array as any) = value', languageOptions: {parser: parsers.typescript}},
		{code: 'for ((globalThis.Array as any) of iterable) {}', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis.eval as any)(code)', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis.eval<string>)(code)', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis.Array as any)?.from(items)', languageOptions: {parser: parsers.typescript}},
		// Existence checks / feature detection: keep `globalThis` so an absent global is `undefined` instead of a `ReferenceError`
		'if (globalThis.navigation) {}',
		'globalThis.navigation ? a : b',
		'while (globalThis.navigation) {}',
		'do {} while (globalThis.navigation)',
		'for (; globalThis.navigation; ) {}',
		'globalThis.navigation && doThing()',
		'globalThis.navigation || fallback',
		'globalThis.navigation ?? fallback',
		'const nav = globalThis.navigation ?? polyfill;',
		'!globalThis.navigation',
		'Boolean(globalThis.navigation)',
		'if (foo && globalThis.navigation) {}',
		{code: 'if ((globalThis.navigation as any)) {}', languageOptions: {parser: parsers.typescript}},
		// Comparisons against `null`/`undefined` are existence checks too
		'globalThis.navigation === undefined',
		'globalThis.navigation !== undefined',
		'globalThis.navigation == null',
		'globalThis.navigation != null',
		'undefined === globalThis.navigation',
		'null != globalThis.navigation',
		'if (globalThis.navigation === undefined) {}',
		{code: '(globalThis.navigation as any) === undefined', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		'globalThis.Array.from(items)',
		'globalThis.JSON.stringify(value)',
		'new globalThis.RegExp(pattern)',
		'globalThis.globalThis',
		'globalThis.fetch(url)',
		'globalThis.alert(message)',
		'new globalThis.Image()',
		'globalThis["Array"].from(items)',
		'globalThis[`JSON`].stringify(value)',
		'const array = globalThis /* comment */ .Array;',
		'/* global myGlobal:readonly */ globalThis.myGlobal',
		'/* global myGlobal:readonly */ globalThis["myGlobal"]',
		{code: 'globalThis!.Array.from(items)', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis as any).Array.from(items)', languageOptions: {parser: parsers.typescript}},
		{code: '(<any>globalThis).Array.from(items)', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis satisfies any).Array.from(items)', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis.alert as any)(message)', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis.alert<string>)(message)', languageOptions: {parser: parsers.typescript}},
		'globalThis.alert`message`',
		// `typeof` never throws, so dropping `globalThis` is safe
		'typeof globalThis.navigation',
		// Keep the existence-check carve-out focused on common `undefined`/`null` comparisons.
		'globalThis.navigation === void 0',
		'void 0 !== globalThis.navigation',
		// `globalThis.Array` is the object of `.isArray`, not the tested value, so it is still reported
		outdent`
			if (globalThis.Array.isArray(value)) {
				console.log(value);
			}
		`,
	],
});
