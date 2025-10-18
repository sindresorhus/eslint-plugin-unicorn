import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// Useless value
test.snapshot({
	valid: [
		'new Set()',
		'new Set',
		'new Set(foo)',
		'new Set(foo || [])',
		'new Set(foo && [])',
		'new Not_Set([])',
		'Set([])',
		'new Set([], extraArgument)',
		'new Set(...([]))',
		'new Set([""])',
		'new Set("not-empty")',
		'new Set(0)',
		'new ([])(Set)',
		// Not checking
		'new globalThis.Set([])',
	],
	invalid: [
		'new Set([])',
		'new Set("")',
		'new Set(undefined)',
		'new Set(null)',
		'new WeakSet([])',
		'new Map([])',
		'new WeakMap([])',
		'new Set( (([])) )',
		'new Set([],)',
		'new Set( (([])), )',
	],
});

// Fallbacks
test.snapshot({
	valid: [
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
		'new Set(foo ?? undefined)',
		'new Set(foo ?? null)',
		'new WeakSet(foo ?? [])',
		'new Map(foo ?? [])',
		'new WeakMap(foo ?? [])',
		'new Set( ((foo ?? [])) )',
		'new Set( (( foo )) ?? [] )',
		'new Set( foo ?? (( [] )) )',
		'new Set( (await foo) ?? [] )',
		'new Set( (0, foo) ?? [] )',
		'new Set( (( (0, foo) ?? [] )) )',
		// Who cares?
		'new Set(document.all ?? [])',
		// Both sides are useless
		'new Set([] ?? "")',
		'new Set( (( (( "" )) ?? (( [] )) )) )',
		'new Set(foo ?? bar ?? [])',
	],
});
