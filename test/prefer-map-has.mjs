import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'map.get("key")',
		'map.get(foo)',
		'var name = map.get("key1") || map.get("key2")',
	],
	invalid: [
		'if (map.get("key")) {}',
		'if (map.get(foo)) {}',
		'if (map.get("key") || other) {}',
		'if (map.get(foo) || other) {}',

		'if (condition) {} else if (map.get(foo)) {}',

		'map.get(foo) ? 1 : 2',

		'Boolean(map.get(foo))',
		'new Boolean(map.get(foo))',

		'!map.get(foo)',
		'!!map.get(foo)',

		'while (map.get(foo)) {}',
		'while (map.get(foo) || otherCondition) {}',
		'do {} while (map.get(foo))',
		'do {} while (map.get(foo) || otherCondition)',

		outdent`
			for (;map.get(foo);) {

			}
		`,
		'function foo(isBoolean = !!map.get("key")) { }',
	],
});
