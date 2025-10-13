import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'new Set([])',
		'new Set("")',
		'new Set()',
		'new Set(foo || [])',
		'new Set(foo && [])',
		'new Not_Set(foo ?? [])',
		'Set(foo ?? [])',
		'new Set(foo ?? [], extraArgument)',
		'new Set(...(foo ?? []))',
		'new Set(foo ?? [""])',
		'new Set(foo ?? "not-empty")',
		'new Set(foo ?? 0)',
		'new (foo ?? [])(Set)',
		// Not checking
		'new globalThis.Set(foo ?? [])',
	],
	invalid: [
		'new Set(foo ?? [])',
		'new Set(foo ?? "")',
		'new Set([] ?? "")',
		'new Set("" ?? [])',
		'new Set(undefined ?? [])',
		'new Set( ((foo ?? [])) )',
		'new Set( (( foo )) ?? [] )',
		'new Set( foo ?? (( [] )) )',
		'new Set( (await foo) ?? [] )',
		'new Set( (0, foo) ?? [] )',
		'new Set( (( (0, foo) ?? [] )) )',
		// Who care?
		'new Set(document.all ?? [])',
	],
});
