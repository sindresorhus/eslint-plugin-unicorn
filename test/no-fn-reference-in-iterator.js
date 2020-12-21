import test from 'ava';
import rule from '../rules/no-fn-reference-in-iterator';

test('deprecated', t => {
	t.true(rule.meta.deprecated);
	t.deepEqual(rule.meta.replacedBy, ['unicorn/no-array-callback-reference']);
});
