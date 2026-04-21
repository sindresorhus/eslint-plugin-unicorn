import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const details = new Map();',
		'const response = fetch();',
		'const memoizedFetch = mem(fetch);',
		outdent`
			export function init() {
				document.title = 'gone';
			}
		`,
		outdent`
			function init() {
				document.title = 'gone';
			}
		`,
		outdent`
			class Foo {
				bar() {
					doSomething();
				}
			}
		`,
	],
	invalid: [
		'document.title = \'gone\';',
		'init();',
		'new Foo();',
		'if (condition) { doSomething(); }',
		'for (const value of values) { consume(value); }',
		'while (condition) doSomething();',
		'switch (kind) { case 1: doSomething(); }',
		'throw new Error(\'fail\');',
	],
});
