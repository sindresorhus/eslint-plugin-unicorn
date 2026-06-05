import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'new Set([1, 2, "1"])',
		'new Set([{}, {}])',
		'new Set([[], []])',
		'new Set([/foo/, /foo/])',
		'new Set([Symbol(), Symbol()])',
		'new Set(foo)',
		'Set([1, 1])',
		'new NotSet([1, 1])',
		'new globalThis.Set([1, 1])',
		'new Set([foo(), foo()])',
		'new Set([foo.bar, foo.baz])',
		'new Set([foo, ...bar, baz])',
		outdent`
			const foo = {};
			new Set([foo, {}]);
		`,
		outdent`
			const foo = 1;
			const bar = 2;
			new Set([foo, bar]);
		`,
	],
	invalid: [
		'new Set([1, 2, 1])',
		'new Set(["foo", "bar", "foo"])',
		'new Set([null, null])',
		'new Set([undefined, undefined])',
		'new Set([, undefined])',
		'new Set([undefined, ,])',
		'new Set([,,])',
		'new Set([-1, -1])',
		'new Set([NaN, NaN])',
		'new Set([0, -0])',
		'new Set([1, 1, 2, 2])',
		'new Set([1 + 1, 2])',
		'new Set([`foo`, "foo"])',
		'new Set([foo, foo])',
		'new Set([foo.bar, foo.bar])',
		'new Set([foo["bar"], foo.bar])',
		'new Set([this.foo, this.foo])',
		'new Set([foo, ...bar, foo])',
		outdent`
			const foo = 2;
			new Set([foo, 2]);
		`,
		outdent`
			const foo = 'bar';
			new Set([foo, 'bar']);
		`,
		outdent`
			const foo = undefined;
			new Set([foo, undefined]);
		`,
		outdent`
			const foo = {};
			new Set([foo, foo]);
		`,
	],
});
