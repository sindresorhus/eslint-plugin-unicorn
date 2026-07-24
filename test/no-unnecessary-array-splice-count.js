import {getTester, parsers} from './utils/test.js';
import {createFixtures} from './shared/no-unnecessary-length-or-infinity-rule-tests.js';

const {test} = getTester(import.meta);

test.snapshot(createFixtures('splice'));
test.snapshot(createFixtures('toSpliced'));

// Known non-array receiver (type information)
test.snapshot({
	valid: [
		{
			code: 'function f(foo: {splice(start: number, deleteCount: number): void; length: number}) { foo.splice(1, foo.length); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(foo: Set<number>) { foo.splice(1, Infinity); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		// A receiver that is known to be an array must still be reported
		{
			code: 'function f(foo: number[]) { foo.splice(1, foo.length); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(foo: readonly number[]) { foo.toSpliced(1, foo.length); }',
			languageOptions: {parser: parsers.typescript},
		},
		// A typed array is treated as an array, even though it has neither method to call in the first place
		{
			code: 'function f(foo: Uint8Array) { foo.splice(1, foo.length); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(foo: Uint8Array) { foo.toSpliced(1, Infinity); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
