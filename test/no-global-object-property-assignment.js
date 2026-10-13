import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'delete globalThis?.foo;',
		'delete window?.["foo"];',
		{code: 'delete ((globalThis?.foo as number)!);', languageOptions: {parser: parsers.typescript}},
		{code: 'delete (globalThis.foo satisfies number);', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		...[
			'(globalThis.foo as number) = 1;',
			'(<number>window.foo) += 1;',
			'(self.foo satisfies number)++;',
			'((global.foo as number)!) ||= 1;',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: 1})),
	],
});

test.snapshot({
	valid: [
		'globalThis.foo',
		'window.foo()',
		'globalThis = value',
		'globalThis[property] = value',
		'delete globalThis.foo',
		'Object.assign(globalThis, {foo: value})',
		'Reflect.set(globalThis, "foo", value)',
		outdent`
			function test(window) {
				window.foo = 1;
			}
		`,
		outdent`
			const global = {};
			global.foo = 1;
		`,
		outdent`
			const globalThis = {};
			globalThis.foo = 1;
		`,
		outdent`
			const self = {};
			self.foo++;
		`,
		outdent`
			const root = globalThis;
			root.foo = 1;
		`,
	],
	invalid: [
		'globalThis.foo = 1',
		'window.foo += 1',
		'self.foo ||= value',
		'global.foo++',
		'globalThis["foo"] = 1',
		outdent`
			({
				foo: globalThis.foo,
			} = object);
		`,
		'[globalThis.foo] = array',
		'({...globalThis.foo} = object)',
		'[...globalThis.foo] = array',
		'for (globalThis.foo of iterable) {}',
		'for (globalThis.foo in object) {}',
		{code: 'globalThis!.foo = 1', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis as any).foo = 1', languageOptions: {parser: parsers.typescript}},
		{code: '(<any>globalThis).foo = 1', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis satisfies any).foo = 1', languageOptions: {parser: parsers.typescript}},
		{code: 'globalThis.foo! = 1', languageOptions: {parser: parsers.typescript}},
	],
});
