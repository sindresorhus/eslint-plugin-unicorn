import test from 'ava';
import rule from '../rules/regex-shorthand';

test('deprecated', t => {
	t.true(rule.meta.deprecated);
	t.deepEqual(rule.meta.replacedBy, ['unicorn/better-regex']);
});
