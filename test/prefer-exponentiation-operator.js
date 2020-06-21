import test from 'ava';
import rule from '../rules/prefer-exponentiation-operator';

test('deprecated', t => {
	t.true(rule.meta.deprecated);
	t.deepEqual(rule.meta.replacedBy, ['prefer-exponentiation-operator']);
});
