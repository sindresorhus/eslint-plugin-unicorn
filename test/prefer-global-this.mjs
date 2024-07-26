import {getTester} from './utils/test.mjs';
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
		'const { foo } = window',
		'const { foo } = global',
		'function foo() { window.foo() }',
	],
});
