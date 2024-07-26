import {getTester, parsers} from './utils/test.mjs';
import outdent from 'outdent';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'globalThis',
		'globalThis.foo',
		'globalThis[foo]',
		'globalThis.foo()',
		'const { foo } = globalThis',
		'function foo (window) {}',
		'function foo (global) {}',
		'var foo = function foo (window) {}',
		'var foo = function foo (global) {}',
		'var window = {}',
		'let global = {}',
		'const global = {}',
		outdent`
			function foo (window) {
				window.foo();
			}
		`,
		outdent`
			var window = {};
			function foo () {
				window.foo();
			}
		`,
		'foo.window',
		'foo.global',
		'import window from "xxx"',
		'import * as window from "xxx"',
		'import window, {foo} from "xxx"',
		'export { window }  from "xxx"',
		'export * as window from "xxx";',
	],
	invalid: [
		'window',
		'window.foo',
		'window[foo]',
		'window.foo()',
		'global',
		'global.foo',
		'global[foo]',
		'global.foo()',
		'self',
		'self.foo',
		'self[foo]',
		'self.foo()',
		'const { foo } = window',
		'const { foo } = global',
		'function foo() { window.foo() }',
		'foo(window)',
		'window.window',
		'window.global',
		'global.global',
		'global.window',
		'self.window',
		'window.self',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [
		'declare function window(): void;',
		'declare var window: any;',
	],
	invalid: [

	],
});
