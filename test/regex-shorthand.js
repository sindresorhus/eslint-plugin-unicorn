import test from 'ava';
import rule from '../rules/regex-shorthand';

test('deprecated', t => {
	t.true(rule.deprecated);
	t.deepEqual(rule.replacedBy, ['unicorn/better-regex']);
});
